'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  REPORT_REASON_LABELS,
  reportReasonSchema,
  type ReportReason,
  type ReportTargetType,
} from '@allisteam/shared';
import { CloseIcon, FlagIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, createReport } from '@/lib/api';
import { cn } from '@/lib/utils';

const REASONS = reportReasonSchema.options;

/**
 * 举报入口：同一目标 24 小时只能举报一次，去重与限流都在服务端，
 * 这里只负责收集原因和补充说明。
 * 用浮层而不是原地展开，避免把详情页头部的标签挤成一列。
 */
export function ReportDialog({
  targetType,
  targetId,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('FAKE_INFO');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        targetType,
        targetId,
        reason,
        ...(detail.trim() ? { detail: detail.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success('举报已提交，管理员会尽快处理');
      setOpen(false);
      setDetail('');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : '提交失败，请稍后再试');
    },
  });

  return (
    <div className={cn('text-xs', className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-ink-faint transition-colors hover:text-ink-muted"
      >
        <FlagIcon className="size-4" />
        举报
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-title-${targetId}`}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl border border-line bg-surface p-4 sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id={`report-title-${targetId}`} className="text-sm font-semibold text-ink">
                  举报
                </p>
                <p className="mt-1 text-xs text-ink-muted">同一内容 24 小时内只能举报一次。</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭举报"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:text-ink"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <Select
                aria-label="举报原因"
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
              >
                {REASONS.map((value) => (
                  <option key={value} value={value}>
                    {REPORT_REASON_LABELS[value]}
                  </option>
                ))}
              </Select>

              <Textarea
                className="min-h-24"
                maxLength={300}
                placeholder="可选：补充说明发生了什么"
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? '提交中…' : '提交举报'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
