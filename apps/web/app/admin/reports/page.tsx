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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError, handleReport, listReports } from '@/lib/api';
import { formatStartTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

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
    <main className="px-4 py-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">举报处理</h1>
        <Link href="/me" className="text-xs text-neutral-500 underline">
          返回我的
        </Link>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        管理员白名单由 ADMIN_EMAILS 控制；处理结果会通知举报人，被举报人看不到举报人身份。
      </p>

      {forbidden ? (
        <p className="mt-8 text-center text-sm text-neutral-500">没有管理员权限。</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatus(tab.status)}
                className={
                  status === tab.status
                    ? 'min-h-11 rounded-lg bg-neutral-900 px-3 font-medium text-white'
                    : 'min-h-11 rounded-lg bg-neutral-100 px-3 font-medium text-neutral-700'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {query.isPending ? (
            <p className="py-10 text-center text-sm text-neutral-500">加载中…</p>
          ) : null}

          {query.isError && !forbidden ? (
            <p className="py-10 text-center text-sm text-neutral-500">加载失败，请稍后重试。</p>
          ) : null}

          {!query.isPending && !query.isError && query.data.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">这一栏没有举报。</p>
          ) : null}

          <div className="mt-3 space-y-3">
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{REPORT_TARGET_LABELS[report.targetType]}</Badge>
        <Badge className="bg-amber-50 text-amber-700">
          {REPORT_REASON_LABELS[report.reason as ReportReason] ?? report.reason}
        </Badge>
        <Badge
          className={
            report.status === 'REJECTED'
              ? 'bg-neutral-100 text-neutral-500'
              : report.status === 'RESOLVED'
                ? 'bg-emerald-50 text-emerald-700'
                : ''
          }
        >
          {REPORT_STATUS_LABELS[report.status as ReportStatus] ?? report.status}
        </Badge>
      </div>

      <p className="mt-2 text-sm font-medium">
        {targetHref ? (
          <Link href={targetHref} className="underline">
            {report.target?.label ?? '对象已删除'}
          </Link>
        ) : (
          (report.target?.label ?? '对象已删除')
        )}
      </p>

      {report.detail ? (
        <p className="mt-2 rounded-lg bg-neutral-50 p-2 text-xs leading-relaxed text-neutral-700">
          {report.detail}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-neutral-400">
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
