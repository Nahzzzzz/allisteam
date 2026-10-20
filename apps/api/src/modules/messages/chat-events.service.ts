import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  WS_EVENTS,
  type MemberJoinedPayload,
  type MessageView,
  type PostEventPayload,
} from '@allisteam/shared';
import { chatRoom } from './messages.mapper';

/**
 * 业务侧只依赖这个服务广播房间事件，不直接持有 Socket.IO 服务器。
 * 所有调用都必须放在数据库事务提交之后（事务内禁止副作用）。
 */
@Injectable()
export class ChatEventsService {
  private readonly logger = new Logger(ChatEventsService.name);
  private server: Pick<Server, 'to'> | null = null;

  bind(server: Pick<Server, 'to'>): void {
    this.server = server;
  }

  messageCreated(message: MessageView): void {
    this.emit(chatRoom(message.postId), WS_EVENTS.messageNew, message);
  }

  memberJoined(payload: MemberJoinedPayload): void {
    this.emit(chatRoom(payload.postId), WS_EVENTS.memberJoined, payload);
  }

  postFull(postId: string): void {
    this.emit(chatRoom(postId), WS_EVENTS.postFull, { postId } satisfies PostEventPayload);
  }

  postCancelled(postId: string): void {
    this.emit(chatRoom(postId), WS_EVENTS.postCancelled, { postId } satisfies PostEventPayload);
  }

  private emit(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`WebSocket 网关未就绪，跳过事件 ${event}`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }
}
