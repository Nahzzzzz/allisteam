import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import { WS_EVENTS, joinPostSchema, sendMessagePayloadSchema } from '@allisteam/shared';
import type { JoinPostAck, SendMessageAck, WsAck } from '@allisteam/shared';
import type { Server, Socket } from 'socket.io';
import { AppException } from '../../common/app-exception';
import { verifyAccessToken } from '../../common/guards/token.util';
import { RedisService } from '../../common/redis/redis.service';
import { ChatEventsService } from './chat-events.service';
import { chatRoom } from './messages.mapper';
import { MessagesService } from './messages.service';

/** 单用户 10 秒内最多 10 条，防止刷屏 */
const MESSAGE_RATE_LIMIT = 10;
const MESSAGE_RATE_WINDOW_SECONDS = 10;
const ONLINE_TTL_SECONDS = 300;

interface ChatSocketData {
  userId?: string;
}

@WebSocketGateway({ namespace: '/ws' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly messages: MessagesService,
    private readonly events: ChatEventsService,
    private readonly redis: RedisService,
  ) {}

  afterInit(server: Server): void {
    this.events.bind(server);
  }

  /** 握手阶段校验 access token，失败直接断开，未认证的连接不能发任何事件 */
  async handleConnection(socket: Socket): Promise<void> {
    const token = (socket.handshake.auth as { token?: unknown }).token;
    if (typeof token !== 'string' || token.length === 0) {
      this.reject(socket, 'UNAUTHORIZED', '请先登录');
      return;
    }

    try {
      const payload = await verifyAccessToken(this.jwt, token);
      (socket.data as ChatSocketData).userId = payload.sub;
    } catch (error) {
      const appError =
        error instanceof AppException
          ? error
          : new AppException('UNAUTHORIZED', 401, '登录凭证无效');
      this.reject(socket, appError.code, appError.message);
    }
  }

  @SubscribeMessage(WS_EVENTS.join)
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): Promise<JoinPostAck> {
    const userId = this.userIdOf(socket);
    if (!userId) {
      socket.disconnect(true);
      return { ok: false, code: 'UNAUTHORIZED', message: '请先登录' };
    }

    const parsed = joinPostSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION_FAILED', message: '参数校验失败' };
    }

    try {
      await this.messages.assertMember(parsed.data.postId, userId);
    } catch (error) {
      const ack = this.toAckError(error);
      // 先让 ack 发出去再断开，直接 disconnect 会让客户端收不到失败原因
      setTimeout(() => socket.disconnect(true), 0);
      return ack;
    }

    const room = chatRoom(parsed.data.postId);
    await socket.join(room);
    await this.markOnline(parsed.data.postId, userId);
    return { ok: true, room };
  }

  @SubscribeMessage(WS_EVENTS.leave)
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): Promise<WsAck> {
    const parsed = joinPostSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION_FAILED', message: '参数校验失败' };
    }
    await socket.leave(chatRoom(parsed.data.postId));
    return { ok: true };
  }

  @SubscribeMessage(WS_EVENTS.send)
  async send(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<SendMessageAck> {
    const userId = this.userIdOf(socket);
    if (!userId) {
      socket.disconnect(true);
      return { ok: false, code: 'UNAUTHORIZED', message: '请先登录' };
    }

    const parsed = sendMessagePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION_FAILED', message: '消息内容需为 1-500 字' };
    }

    const { postId, content } = parsed.data;
    if (!socket.rooms.has(chatRoom(postId))) {
      return { ok: false, code: 'FORBIDDEN', message: '请先加入该局的聊天室' };
    }

    if (!(await this.allowSend(userId))) {
      return { ok: false, code: 'RATE_LIMITED', message: '发送太频繁，请稍后再试' };
    }

    try {
      const message = await this.messages.send(postId, userId, content);
      // 先落库再广播，保证所有客户端看到的顺序一致
      this.events.messageCreated(message);
      return { ok: true, message };
    } catch (error) {
      return this.toAckError(error);
    }
  }

  private userIdOf(socket: Socket): string | null {
    return (socket.data as ChatSocketData).userId ?? null;
  }

  private reject(socket: Socket, code: string, message: string): void {
    socket.emit(WS_EVENTS.authError, { code, message });
    socket.disconnect(true);
  }

  private toAckError(error: unknown): { ok: false; code: string; message: string } {
    if (error instanceof AppException) {
      return { ok: false, code: error.code, message: error.message };
    }
    this.logger.error(`聊天处理失败：${(error as Error).message}`);
    return { ok: false, code: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后再试' };
  }

  private async allowSend(userId: string): Promise<boolean> {
    try {
      const count = await this.redis.incrWithTtl(
        `ws:msg:${userId}`,
        MESSAGE_RATE_WINDOW_SECONDS,
      );
      return count <= MESSAGE_RATE_LIMIT;
    } catch (error) {
      // Redis 故障不能挡住聊天主流程
      this.logger.warn(`消息限流计数失败，放行：${(error as Error).message}`);
      return true;
    }
  }

  private async markOnline(postId: string, userId: string): Promise<void> {
    try {
      await this.redis.setEx(`online:${postId}:${userId}`, '1', ONLINE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`在线状态写入失败：${(error as Error).message}`);
    }
  }
}
