import { z } from 'zod';

/** 领域：V1 只开放 GAME，枚举值已为演唱会、旅游预留 */
export const domainSchema = z.enum(['GAME', 'CONCERT', 'TRAVEL']);
export type Domain = z.infer<typeof domainSchema>;

export const DOMAIN_LABELS: Record<Domain, string> = {
  GAME: '游戏',
  CONCERT: '演唱会',
  TRAVEL: '旅游',
};

export const platformSchema = z.enum(['PC', 'PLAYSTATION', 'XBOX', 'SWITCH', 'MOBILE']);
export type Platform = z.infer<typeof platformSchema>;

export const PLATFORM_LABELS: Record<Platform, string> = {
  PC: 'PC',
  PLAYSTATION: 'PlayStation',
  XBOX: 'Xbox',
  SWITCH: 'Switch',
  MOBILE: '手游',
};

export const postStatusSchema = z.enum(['OPEN', 'FULL', 'CLOSED', 'CANCELLED']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  OPEN: '招募中',
  FULL: '已满员',
  CLOSED: '已结束',
  CANCELLED: '已取消',
};

export const applyStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'LEFT']);
export type ApplyStatus = z.infer<typeof applyStatusSchema>;

export const memberRoleSchema = z.enum(['HOST', 'MEMBER']);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const reportReasonSchema = z.enum([
  'FAKE_INFO',
  'HARASSMENT',
  'AD',
  'SPAM',
  'FRAUD',
  'OTHER',
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  FAKE_INFO: '虚假信息',
  HARASSMENT: '骚扰',
  AD: '广告',
  SPAM: '垃圾信息',
  FRAUD: '诈骗',
  OTHER: '其他',
};

export const reportTargetTypeSchema = z.enum(['POST', 'USER', 'MESSAGE']);
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  POST: '局',
  USER: '用户',
  MESSAGE: '消息',
};

export const reportStatusSchema = z.enum(['PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '待处理',
  REVIEWING: '处理中',
  RESOLVED: '已成立',
  REJECTED: '已驳回',
};

/** 管理员对举报的处理动作：下架局、封禁用户、驳回 */
export const reportActionSchema = z.enum(['REMOVE_POST', 'BAN_USER', 'REJECT']);
export type ReportAction = z.infer<typeof reportActionSchema>;

export const REPORT_ACTION_LABELS: Record<ReportAction, string> = {
  REMOVE_POST: '下架该局',
  BAN_USER: '封禁该用户',
  REJECT: '驳回举报',
};

/** 互评可选标签，最多选 3 个 */
export const REVIEW_TAGS = ['守时', '友好', '技术好', '沟通顺畅', '愿意再约'] as const;

export const reviewTagSchema = z.enum(REVIEW_TAGS);
export type ReviewTag = z.infer<typeof reviewTagSchema>;
