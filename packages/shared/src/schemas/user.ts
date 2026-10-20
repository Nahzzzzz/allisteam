import { z } from 'zod';
import { nicknameSchema } from './auth';

export const updateProfileSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    bio: z.string().trim().max(200).optional(),
    city: z.string().trim().max(40).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, '至少需要提交一个字段');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** 当前用户资料：比公开主页多邮箱等字段 */
export interface MeView {
  id: string;
  email: string;
  nickname: string;
  bio: string | null;
  city: string | null;
  avatarUrl: string | null;
  trustScore: number;
  reviewCount: number;
  createdAt: string;
}

/** 公开主页信息：不包含邮箱等隐私字段 */
export interface PublicUser {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  city: string | null;
  trustScore: number;
  reviewCount: number;
}
