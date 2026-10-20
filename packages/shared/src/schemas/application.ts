import { z } from 'zod';
import { applyStatusSchema } from '../enums';
import { paginationQuerySchema } from './pagination';

/** 申请人在这个局的游戏档案摘要（取不到时整段为 null） */
export interface ApplicationProfile {
  platform: string;
  rankText: string | null;
  voiceOk: boolean;
}

export interface ApplicationView {
  id: string;
  postId: string;
  status: string;
  message: string | null;
  rejectReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  applicant: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    city: string | null;
    trustScore: number;
    reviewCount: number;
    profile: ApplicationProfile | null;
  };
}

/** 报名：可附一句自我介绍（PRD US-05：≤ 200 字） */
export const createApplicationSchema = z
  .object({
    message: z.string().trim().max(200).optional(),
  })
  .strict();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const applicationDecisionSchema = z.enum(['APPROVE', 'REJECT']);
export type ApplicationDecision = z.infer<typeof applicationDecisionSchema>;

export const decideApplicationSchema = z
  .object({
    action: applicationDecisionSchema,
    rejectReason: z.string().trim().max(100).optional(),
  })
  .strict();

export type DecideApplicationInput = z.infer<typeof decideApplicationSchema>;

export const listApplicationsQuerySchema = paginationQuerySchema
  .extend({
    status: applyStatusSchema.optional(),
  })
  .strict();

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

/** 报名状态的中文文案，前后端共用，避免各处各写一套 */
export const APPLY_STATUS_LABELS: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  WITHDRAWN: '已撤回',
  LEFT: '已退出',
};
