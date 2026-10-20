import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

/** PRD §8：单条消息 ≤ 500 字 */
export const MESSAGE_MAX_LENGTH = 500;

export interface MessageSender {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

/** 局内消息；sender 为 null 表示系统消息 */
export interface MessageView {
  id: string;
  postId: string;
  type: 'TEXT' | 'SYSTEM';
  content: string;
  sender: MessageSender | null;
  createdAt: string;
}

/** 历史消息：默认倒序（最近 N 条），向上翻页用 cursor */
export const listMessagesQuerySchema = paginationQuerySchema
  .extend({
    /** 断线补偿：传入本地最后一条消息 id，返回它之后的消息（升序） */
    after: z.string().min(1).optional(),
  })
  .strict();

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

/** WebSocket 上行事件：进房 / 退房 / 发消息 */
export const joinPostSchema = z.object({ postId: z.string().min(1) }).strict();
export type JoinPostInput = z.infer<typeof joinPostSchema>;

export const sendMessagePayloadSchema = z
  .object({
    postId: z.string().min(1),
    content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
    /** 客户端生成的消息 id，仅用于本地乐观更新去重，不落库 */
    clientMsgId: z.string().max(64).optional(),
  })
  .strict();

export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>;

export const WS_EVENTS = {
  join: 'post:join',
  leave: 'post:leave',
  send: 'message:send',
  messageNew: 'message:new',
  postFull: 'post:full',
  postCancelled: 'post:cancelled',
  memberJoined: 'member:joined',
  authError: 'auth:error',
} as const;

/** WebSocket 统一 ack 结构，失败时 code 与 REST 错误码一致 */
export interface WsFailure {
  ok: false;
  code: string;
  message: string;
}

export type WsAck<T extends object = object> = ({ ok: true } & T) | WsFailure;

export type JoinPostAck = WsAck<{ room: string }>;
export type SendMessageAck = WsAck<{ message: MessageView }>;

export interface MemberJoinedPayload {
  postId: string;
  userId: string;
  nickname: string;
}

export interface PostEventPayload {
  postId: string;
}
