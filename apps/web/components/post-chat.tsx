'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MESSAGE_MAX_LENGTH,
  POST_STATUS_LABELS,
  WS_EVENTS,
  type JoinPostAck,
  type MessageView,
  type PostStatus,
  type SendMessageAck,
} from '@allisteam/shared';
import type { Socket } from 'socket.io-client';
import { ArrowLeftIcon, SendIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, getPost, listMessages } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatClock } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { createChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

type ConnectionState = 'connecting' | 'online' | 'offline';

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  online: '已连接',
  connecting: '正在连接聊天…',
  offline: '连接已断开，正在重试',
};

export function PostChat({ postId }: { postId: string }) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const myId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: hydrated,
  });
  const post = postQuery.data;
  const isMember = Boolean(post && (post.isAuthor || post.members.some((m) => m.userId === myId)));

  const history = useInfiniteQuery({
    queryKey: queryKeys.messages(postId),
    queryFn: ({ pageParam }) => listMessages(postId, pageParam ? { cursor: pageParam } : {}),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isMember,
  });

  // WebSocket 推来的增量消息；与历史合并时按 id 去重，重连补拉不会出现重复
  const [live, setLive] = useState<MessageView[]>([]);
  const appendLive = useCallback((items: MessageView[]) => {
    setLive((previous) => {
      const seen = new Set(previous.map((item) => item.id));
      const next = [...previous];
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          next.push(item);
        }
      }
      return next.length === previous.length ? previous : next;
    });
  }, []);

  const messages = useMemo(() => {
    const map = new Map<string, MessageView>();
    for (const page of history.data?.pages ?? []) {
      for (const item of page.items) {
        map.set(item.id, item);
      }
    }
    for (const item of live) {
      map.set(item.id, item);
    }
    return [...map.values()].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  }, [history.data, live]);

  const socketRef = useRef<Socket | null>(null);
  const latestMessageId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    latestMessageId.current = messages.at(-1)?.id ?? null;
  }, [messages]);

  useEffect(() => {
    if (!isMember || !accessToken) {
      return;
    }

    const socket = createChatSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(WS_EVENTS.join, { postId }, (ack: JoinPostAck) => {
        if (!ack.ok) {
          setSocketError(ack.message);
          setConnection('offline');
          return;
        }
        setSocketError(null);
        setConnection('online');

        // 重连补偿：只拉本地最后一条之后的消息
        const last = latestMessageId.current;
        if (last) {
          void listMessages(postId, { after: last })
            .then((page) => {
              if (page.items.length > 0) {
                appendLive(page.items);
              }
            })
            .catch(() => undefined);
        }
      });
    });
    socket.on('disconnect', () => setConnection('offline'));
    socket.on('connect_error', () => setConnection('offline'));
    socket.on(WS_EVENTS.authError, (payload: { message?: string }) => {
      setSocketError(payload.message ?? '登录状态已过期，请刷新页面');
    });
    socket.on(WS_EVENTS.messageNew, (message: MessageView) => {
      if (message.postId === postId) {
        appendLive([message]);
      }
    });

    const refreshPost = (): void => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    };
    socket.on(WS_EVENTS.memberJoined, refreshPost);
    socket.on(WS_EVENTS.postFull, refreshPost);
    socket.on(WS_EVENTS.postCancelled, refreshPost);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnection('connecting');
    };
  }, [isMember, accessToken, postId, appendLive, queryClient]);

  useEffect(() => {
    const element = listRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages.length]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const chatClosed = post?.status === 'CANCELLED' || post?.status === 'CLOSED';
  const canSend = !chatClosed && connection === 'online';

  const handleSend = (): void => {
    const content = draft.trim();
    const socket = socketRef.current;
    if (content.length === 0 || !socket || !socket.connected) {
      return;
    }

    setSending(true);
    socket.emit(WS_EVENTS.send, { postId, content }, (ack: SendMessageAck) => {
      setSending(false);
      if (!ack.ok) {
        setSendError(ack.message);
        return;
      }
      setSendError(null);
      setDraft('');
      appendLive([ack.message]);
    });
  };

  if (!hydrated || postQuery.isPending) {
    return (
      <main className="space-y-3 px-4 py-6 md:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-14 w-2/3 rounded-2xl" />
      </main>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <EmptyState
        title="这个局不存在，或者已经被取消。"
        action={
          <Link href="/" className="text-xs font-medium text-accent underline underline-offset-4">
            回首页看看别的局
          </Link>
        }
      />
    );
  }

  if (!isMember) {
    return (
      <EmptyState
        title="只有发起人和已通过的成员可以进入局内聊天。"
        action={
          <Link
            href={`/posts/${postId}`}
            className="text-xs font-medium text-accent underline underline-offset-4"
          >
            返回局详情
          </Link>
        }
      />
    );
  }

  const historyError = history.error instanceof ApiError ? history.error : null;

  return (
    <main className="flex h-[calc(100dvh-4rem)] flex-col md:h-dvh">
      <header className="metal-sheen border-b border-line bg-surface/40 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/posts/${postId}`}
            className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon className="size-3.5" />
            返回局详情
          </Link>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 rounded-full',
                connection === 'online'
                  ? 'bg-lime'
                  : connection === 'connecting'
                    ? 'bg-amber'
                    : 'bg-danger',
              )}
            />
            <Badge variant="outline">
              {POST_STATUS_LABELS[post.status as PostStatus] ?? post.status}
            </Badge>
          </div>
        </div>
        <h1 className="mt-1 truncate text-base font-semibold">{post.title}</h1>
        <p className="mt-0.5 text-[11px] text-ink-faint">{CONNECTION_LABEL[connection]}</p>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {history.isPending ? (
          <p className="py-8 text-center text-xs text-ink-faint">正在加载历史消息…</p>
        ) : null}

        {historyError ? (
          <p className="py-8 text-center text-xs text-danger">{historyError.message}</p>
        ) : null}

        {history.hasNextPage ? (
          <div className="text-center">
            <Button
              size="sm"
              variant="secondary"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage ? '加载中…' : '加载更早的消息'}
            </Button>
          </div>
        ) : null}

        {!history.isPending && !historyError && messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-faint">
            还没有消息，先说句话打个招呼吧。
          </p>
        ) : null}

        {messages.map((message) => {
          if (message.type === 'SYSTEM') {
            return (
              <p key={message.id} className="text-center text-[11px] text-ink-faint">
                {message.content}
              </p>
            );
          }

          const mine = message.sender?.id === myId;
          return (
            <div key={message.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div className="max-w-[82%]">
                <p className={cn('text-[11px] text-ink-faint', mine ? 'text-right' : 'text-left')}>
                  {mine ? '我' : (message.sender?.nickname ?? '成员')} ·{' '}
                  {formatClock(message.createdAt)}
                </p>
                <div
                  className={cn(
                    'mt-1 whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
                    mine
                      ? 'metal-fill rounded-br-md text-accent-ink shadow-metal'
                      : 'rounded-bl-md border border-line bg-surface-2 text-ink shadow-card',
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line px-4 py-3">
        {chatClosed ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-center text-xs text-ink-muted">
            该局已结束，聊天记录只读。
          </p>
        ) : (
          <>
            <Textarea
              className="min-h-16"
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder={canSend ? '说点什么…' : '正在连接聊天…'}
              value={draft}
              disabled={!canSend || sending}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-faint">
                {draft.length}/{MESSAGE_MAX_LENGTH}
              </span>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!canSend || sending || draft.trim().length === 0}
                onClick={handleSend}
              >
                <SendIcon className="size-3.5" />
                {sending ? '发送中…' : '发送'}
              </Button>
            </div>
          </>
        )}
        {sendError ? <p className="mt-2 text-xs text-danger">{sendError}</p> : null}
        {socketError ? <p className="mt-2 text-xs text-danger">{socketError}</p> : null}
      </div>
    </main>
  );
}
