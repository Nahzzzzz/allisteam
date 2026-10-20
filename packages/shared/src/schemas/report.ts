import { z } from 'zod';
import {
  reportActionSchema,
  reportReasonSchema,
  reportStatusSchema,
  reportTargetTypeSchema,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from '../enums';
import { paginationQuerySchema } from './pagination';

/** 举报（PRD US-10）：可举报局、用户、消息 */
export const createReportSchema = z
  .object({
    targetType: reportTargetTypeSchema,
    targetId: z.string().min(1),
    reason: reportReasonSchema,
    detail: z.string().trim().max(300).optional(),
  })
  .strict();

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const listReportsQuerySchema = paginationQuerySchema
  .extend({
    status: reportStatusSchema.optional(),
  })
  .strict();

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

/** 管理员的处理动作；动作与举报对象类型是否匹配由 service 校验 */
export const handleReportSchema = z
  .object({
    action: reportActionSchema,
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export type HandleReportInput = z.infer<typeof handleReportSchema>;

export interface ReportView {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
  handledAt: string | null;
  reporter: { id: string; nickname: string };
  /** 后台列表展示用：被举报对象的可读摘要，对象已删除时为 null */
  target: { label: string } | null;
}
