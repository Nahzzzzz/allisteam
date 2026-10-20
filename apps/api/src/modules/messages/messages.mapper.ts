import type { Prisma } from '@prisma/client';
import type { MessageView } from '@allisteam/shared';

export const messageInclude = {
  sender: { select: { id: true, nickname: true } },
} satisfies Prisma.MessageInclude;

export type MessageWithSender = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export function toMessageView(message: MessageWithSender): MessageView {
  return {
    id: message.id,
    postId: message.postId,
    type: message.type,
    content: message.content,
    sender: message.sender
      ? { id: message.sender.id, nickname: message.sender.nickname, avatarUrl: null }
      : null,
    createdAt: message.createdAt.toISOString(),
  };
}

/** 房间名唯一在这里生成，REST 与网关共用同一套规则 */
export function chatRoom(postId: string): string {
  return `post:${postId}`;
}
