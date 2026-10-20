import type { Prisma } from '@prisma/client';
import type { ReportView } from '@allisteam/shared';

export const reportInclude = {
  reporter: { select: { id: true, nickname: true } },
} satisfies Prisma.ReportInclude;

export type ReportWithReporter = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

/**
 * 举报对象可能已经被删除（消息随局级联删除），
 * 展示时给一个明确的占位而不是让整个后台列表报错。
 */
export const DELETED_TARGET_LABEL = '对象已删除';

export function toReportView(report: ReportWithReporter, targetLabel: string | null): ReportView {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    detail: report.detail,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    handledAt: report.handledAt ? report.handledAt.toISOString() : null,
    reporter: { id: report.reporter.id, nickname: report.reporter.nickname },
    target: targetLabel === null ? null : { label: targetLabel },
  };
}
