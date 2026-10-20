'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  REPORT_REASON_LABELS,
  reportReasonSchema,
  type ReportReason,
  type ReportTargetType,
} from '@allisteam/shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, createReport } from '@/lib/api';
import { cn } from '@/lib/utils';

const REASONS = reportReasonSchema.options;

/**
 * 举报入口：同一目标 24 小时只能举报一次，去重与限流都在服务端，
 * 这里只负责收集原因和补充说明。
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
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 px-2 text-neutral-500 underline"
      >
        {open ? '收起举报' : '举报'}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
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
            className="min-h-20 bg-white"
            maxLength={300}
            placeholder="可选：补充说明发生了什么"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              className="flex-1"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? '提交中…' : '提交举报'}
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
