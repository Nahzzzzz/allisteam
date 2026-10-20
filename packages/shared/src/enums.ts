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
