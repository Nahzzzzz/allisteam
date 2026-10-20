'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  REPORT_ACTION_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type ReportAction,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
  type ReportView,
} from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { AlertIcon, ArrowLeftIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, handleReport, listReports } from '@/lib/api';
import { formatStartTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const TABS: { status: ReportStatus | null; label: string }[] = [
  { status: 'PENDING', label: '待处理' },
  { status: 'RESOLVED', label: '已成立' },
  { status: 'REJECTED', label: '已驳回' },
  { status: null, label: '全部' },
];

function actionsFor(targetType: ReportTargetType): ReportAction[] {
  if (targetType === 'POST') {
    return ['REMOVE_POST', 'BAN_USER', 'REJECT'];
  }
  if (targetType === 'USER') {
    return ['BAN_USER', 'REJECT'];
  }
  return ['REJECT'];
}

export default function AdminReportsPage() {
  return (
    <AuthGate>
      <AdminReportsContent />
    </AuthGate>
  );
}

function AdminReportsContent() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | null>('PENDING');

  const query = useQuery({
    queryKey: queryKeys.adminReports(status ?? 'ALL'),
    queryFn: () => listReports({ ...(status ? { status } : {}), limit: 20 }),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; action: ReportAction }) =>
      handleReport(input.id, { action: input.action }),
    onSuccess: (_report, variables) => {
      toast.success(`已处理：${REPORT_ACTION_LABELS[variables.action]}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : '处理失败，请稍后再试');
    },
  });

  const forbidden = query.isError && query.error instanceof ApiError && query.error.status === 403;

  return (
    <main className="px-4 pb-24 pt-7 md:px-8 md:pb-12 md:pt-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">举报处理</h1>
        <Link
          href="/me"
          className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="size-3.5" />
          返回我的
        </Link>
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">
        管理员白名单由 ADMIN_EMAILS 控制；处理结果会通知举报人，被举报人看不到举报人身份。
      </p>

      {forbidden ? (
        <EmptyState title="没有管理员权限。" description="这个页面只对管理员白名单开放。" />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatus(tab.status)}
                aria-pressed={status === tab.status}
                className={cn(
                  'min-h-11 rounded-full px-3.5 text-xs font-medium transition-colors',
                  status === tab.status
                    ? 'metal-fill text-accent-ink shadow-metal'
                    : 'border border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {query.isPending ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : null}

          {query.isError && !forbidden ? (
            <EmptyState title="加载失败" description="稍后重试一次。" />
          ) : null}

          {!query.isPending && !query.isError && query.data.items.length === 0 ? (
            <EmptyState icon={<AlertIcon />} title="这一栏没有举报。" />
          ) : null}

          <div className="mt-3 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {query.data?.items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                busy={mutation.isPending}
                onHandle={(action) => {
                  if (
                    action !== 'REJECT' &&
                    !window.confirm(`确认${REPORT_ACTION_LABELS[action]}？该操作不可撤销。`)
                  ) {
                    return;
                  }
                  mutation.mutate({ id: report.id, action });
                }}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function ReportCard({
  report,
  busy,
  onHandle,
}: {
  report: ReportView;
  busy: boolean;
  onHandle: (action: ReportAction) => void;
}) {
  const targetHref =
    report.targetType === 'POST'
      ? `/posts/${report.targetId}`
      : report.targetType === 'USER'
        ? `/users/${report.targetId}`
        : null;

  const handled = report.status === 'RESOLVED' || report.status === 'REJECTED';

  return (
    <div className="metal-sheen rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{REPORT_TARGET_LABELS[report.targetType]}</Badge>
        <Badge variant="warning">
          {REPORT_REASON_LABELS[report.reason as ReportReason] ?? report.reason}
        </Badge>
        <Badge
          variant={
            report.status === 'REJECTED'
              ? 'outline'
              : report.status === 'RESOLVED'
                ? 'accent'
                : 'neutral'
          }
        >
          {REPORT_STATUS_LABELS[report.status as ReportStatus] ?? report.status}
        </Badge>
      </div>

      <p className="mt-2.5 text-sm font-semibold">
        {targetHref ? (
          <Link href={targetHref} className="underline underline-offset-4 hover:text-accent">
            {report.target?.label ?? '对象已删除'}
          </Link>
        ) : (
          (report.target?.label ?? '对象已删除')
        )}
      </p>

      {report.detail ? (
        <p className="mt-2 rounded-xl bg-surface-2 p-2.5 text-xs leading-relaxed text-ink-muted">
          {report.detail}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-ink-faint">
        举报人 {report.reporter.nickname} · {formatStartTime(report.createdAt)}
        {report.handledAt ? ` · 处理于 ${formatStartTime(report.handledAt)}` : ''}
      </p>

      {handled ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {actionsFor(report.targetType).map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === 'REJECT' ? 'secondary' : 'danger'}
              disabled={busy}
              onClick={() => onHandle(action)}
            >
              {REPORT_ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
