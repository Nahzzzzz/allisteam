'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PostDetail } from '@allisteam/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, applyToPost, withdrawApplication } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const MESSAGE_LIMIT = 200;

export function ApplicationActions({ post }: { post: PostDetail }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.post(post.id) });
  };

  const apply = useMutation({
    mutationFn: () => applyToPost(post.id, message),
    onSuccess: async () => {
      setError(null);
      setMessage('');
      await invalidate();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : '报名失败，请稍后再试');
    },
  });

  const withdraw = useMutation({
    mutationFn: (applicationId: string) => withdrawApplication(applicationId),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : '撤回失败，请稍后再试');
    },
  });

  if (post.isAuthor) {
    return null;
  }

  if (post.myApplicationStatus === 'APPROVED') {
    return (
      <div className="rounded-2xl border border-lime/30 bg-lime/10 p-4">
        <p className="text-sm font-semibold text-lime">你已经在成员列表里了</p>
        <p className="mt-1 text-xs text-ink-muted">活动开始前请留意局内通知。</p>
      </div>
    );
  }

  if (post.myApplicationStatus === 'PENDING') {
    return (
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">报名已提交，等待发起人审批</p>
            <p className="mt-1 text-xs text-ink-muted">通过后会收到通知。</p>
          </div>
          <Badge variant="warning">待审批</Badge>
        </div>
        <Button
          className="mt-3"
          size="block"
          variant="secondary"
          disabled={withdraw.isPending || !post.myApplicationId}
          onClick={() => {
            if (post.myApplicationId) {
              withdraw.mutate(post.myApplicationId);
            }
          }}
        >
          {withdraw.isPending ? '撤回中…' : '撤回报名'}
        </Button>
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      </Card>
    );
  }

  if (post.status !== 'OPEN') {
    return (
      <Button size="block" disabled>
        {post.status === 'FULL' ? '该局已满员' : '该局已停止招募'}
      </Button>
    );
  }

  return (
    <Card>
      <p className="text-sm font-semibold">申请加入</p>
      <p className="mt-1 text-xs text-ink-muted">
        写一句自我介绍，让发起人更容易通过（选填，最多 {MESSAGE_LIMIT} 字）。
      </p>
      {post.myApplicationStatus === 'REJECTED' ? (
        <p className="mt-2 text-xs text-warning">上次申请被拒绝，7 天内不能重复申请。</p>
      ) : null}
      <Textarea
        className="mt-3 min-h-24"
        maxLength={MESSAGE_LIMIT}
        placeholder="比如：晚上八点能到，可以开麦。"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <p className="mt-1 text-right text-xs text-ink-faint">
        {message.length}/{MESSAGE_LIMIT}
      </p>
      <Button
        className="mt-2"
        size="block"
        disabled={apply.isPending}
        onClick={() => apply.mutate()}
      >
        {apply.isPending ? '提交中…' : '提交报名'}
      </Button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </Card>
  );
}
