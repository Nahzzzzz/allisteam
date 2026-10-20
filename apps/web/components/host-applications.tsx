'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PLATFORM_LABELS, type Platform } from '@allisteam/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, decideApplication, listApplications } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function HostApplications({ postId, postStatus }: { postId: string; postStatus: string }) {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.applications(postId, 'PENDING'),
    queryFn: () => listApplications(postId, 'PENDING'),
  });

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['applications', postId] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
    ]);
  };

  const decide = useMutation({
    mutationFn: (input: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      decideApplication(input.id, {
        action: input.action,
        ...(input.reason ? { rejectReason: input.reason } : {}),
      }),
    onSuccess: async () => {
      setError(null);
      setRejectingId(null);
      setRejectReason('');
      await invalidate();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : '操作失败，请稍后再试');
    },
  });

  if (query.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return <p className="text-sm text-danger">报名列表加载失败，请刷新重试。</p>;
  }

  const items = query.data.items;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">待处理报名</h2>
        <span className="text-xs text-ink-faint">{items.length} 条</span>
      </div>

      {postStatus === 'FULL' ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          名额已满，新的申请暂时无法通过。
        </p>
      ) : null}

      {items.length === 0 ? <p className="text-sm text-ink-muted">还没有人报名。</p> : null}

      {items.map((application) => (
        <Card key={application.id} className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{application.applicant.nickname}</p>
              <p className="mt-1 text-xs text-ink-muted">
                信誉 {application.applicant.trustScore} · 评价 {application.applicant.reviewCount}
                {application.applicant.city ? ` · ${application.applicant.city}` : ''}
              </p>
            </div>
            {application.applicant.profile ? (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline">
                  {PLATFORM_LABELS[application.applicant.profile.platform as Platform] ??
                    application.applicant.profile.platform}
                </Badge>
                {application.applicant.profile.rankText ? (
                  <Badge variant="outline">{application.applicant.profile.rankText}</Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          {application.message ? (
            <p className="rounded-xl bg-surface-2 p-2.5 text-xs leading-relaxed text-ink-muted">
              {application.message}
            </p>
          ) : null}

          {rejectingId === application.id ? (
            <div className="space-y-2">
              <Textarea
                className="min-h-20"
                maxLength={100}
                placeholder="可选：说明拒绝原因"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="md"
                  variant="danger"
                  className="flex-1"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      id: application.id,
                      action: 'REJECT',
                      ...(rejectReason.trim() ? { reason: rejectReason.trim() } : {}),
                    })
                  }
                >
                  确认拒绝
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="md"
                className="flex-1"
                disabled={decide.isPending || postStatus !== 'OPEN'}
                onClick={() => decide.mutate({ id: application.id, action: 'APPROVE' })}
              >
                通过
              </Button>
              <Button
                size="md"
                variant="secondary"
                className="flex-1"
                disabled={decide.isPending}
                onClick={() => {
                  setRejectingId(application.id);
                  setRejectReason('');
                }}
              >
                拒绝
              </Button>
            </div>
          )}
        </Card>
      ))}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
