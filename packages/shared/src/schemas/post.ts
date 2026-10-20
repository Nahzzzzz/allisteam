import { z } from 'zod';
import { domainSchema, platformSchema } from '../enums';
import { paginationQuerySchema } from './pagination';
import type { PublicUser } from './user';

export const isoDateTimeSchema = z.iso.datetime();

export const gamePostPayloadSchema = z
  .object({
    gameId: z.string().min(1),
    platform: platformSchema,
    mode: z.string().trim().max(30).optional(),
    rankMin: z.string().trim().max(30).optional(),
    rankMax: z.string().trim().max(30).optional(),
    needVoice: z.boolean().optional(),
  })
  .strict();

const postBaseShape = {
  title: z.string().trim().min(8).max(40),
  description: z.string().trim().min(1).max(1000),
  city: z.string().trim().max(40).optional(),
  startTime: isoDateTimeSchema,
  capacity: z.number().int().min(2).max(20),
};

/** 发局：按 domain 区分载荷，V1 只开放 GAME 分支 */
export const createPostSchema = z.discriminatedUnion('domain', [
  z
    .object({
      domain: z.literal('GAME'),
      ...postBaseShape,
      game: gamePostPayloadSchema,
    })
    .strict(),
]);

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z
  .object({
    title: postBaseShape.title.optional(),
    description: postBaseShape.description.optional(),
    city: postBaseShape.city,
    startTime: postBaseShape.startTime.optional(),
    capacity: postBaseShape.capacity.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, '至少需要提交一个字段');

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const listPostsQuerySchema = paginationQuerySchema
  .extend({
    domain: domainSchema.optional(),
    gameId: z.string().min(1).optional(),
    platform: platformSchema.optional(),
    city: z.string().trim().max(40).optional(),
    startFrom: isoDateTimeSchema.optional(),
    startTo: isoDateTimeSchema.optional(),
    q: z.string().trim().min(1).max(50).optional(),
  })
  .strict();

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

/** 我发起的局：按创建时间倒序，包含所有状态（含已取消/已结束） */
export const myPostsQuerySchema = paginationQuerySchema.strict();

export type MyPostsQuery = z.infer<typeof myPostsQuerySchema>;

export interface PostSummary {
  id: string;
  title: string;
  domain: string;
  game: { id: string; name: string } | null;
  platform: string | null;
  mode: string | null;
  rankMin: string | null;
  rankMax: string | null;
  needVoice: boolean;
  startTime: string;
  capacity: number;
  memberCount: number;
  status: string;
  author: PublicUser;
}

export interface PostMemberView {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface PostDetail extends PostSummary {
  description: string;
  city: string | null;
  members: PostMemberView[];
  isAuthor: boolean;
  myApplicationStatus: string | null;
  /** 我的报名记录 id，用于撤回；没报过名时为 null */
  myApplicationId: string | null;
}
