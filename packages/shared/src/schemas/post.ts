import { z } from 'zod';
import { concertSeatSchema, domainSchema, platformSchema, travelTransportSchema, travelIntensitySchema } from '../enums';
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

export type GamePostPayload = z.infer<typeof gamePostPayloadSchema>;

/**
 * 演唱会只做「找同行的人」，票务必须自己解决。
 * `hasTicket` 是合规开关：false 表示「还没票，只找同行」，前端会给出一条免责提示。
 */
export const concertPostPayloadSchema = z
  .object({
    artist: z.string().trim().min(1, '请填写艺人').max(40),
    tourName: z.string().trim().max(60).optional(),
    venue: z.string().trim().max(60).optional(),
    seatType: concertSeatSchema.optional(),
    hasTicket: z.boolean().optional(),
    ticketNote: z.string().trim().max(200).optional(),
  })
  .strict();

export type ConcertPostPayload = z.infer<typeof concertPostPayloadSchema>;

/** 旅游用 Post.endTime 表示返程日期，预算用整数元，不存小数 */
export const travelPostPayloadSchema = z
  .object({
    destination: z.string().trim().min(1, '请填写目的地').max(40),
    budgetMin: z.number().int().min(0).max(1_000_000).optional(),
    budgetMax: z.number().int().min(0).max(1_000_000).optional(),
    transport: travelTransportSchema.optional(),
    intensity: travelIntensitySchema.optional(),
    /** 是否接受拼房；未成年人禁止发布含住宿合住内容的局，前端会拦截 */
    shareRoom: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.budgetMin === undefined ||
      value.budgetMax === undefined ||
      value.budgetMin <= value.budgetMax,
    { path: ['budgetMax'], message: '预算上限不能低于下限' },
  );

export type TravelPostPayload = z.infer<typeof travelPostPayloadSchema>;

const postBaseShape = {
  title: z.string().trim().min(8).max(40),
  description: z.string().trim().min(1).max(1000),
  city: z.string().trim().max(40).optional(),
  startTime: isoDateTimeSchema,
  capacity: z.number().int().min(2).max(20),
};

/** 发局：按 domain 区分载荷，三个领域各一支 */
export const createPostSchema = z.discriminatedUnion('domain', [
  z
    .object({
      domain: z.literal('GAME'),
      ...postBaseShape,
      game: gamePostPayloadSchema,
    })
    .strict(),
  z
    .object({
      domain: z.literal('CONCERT'),
      ...postBaseShape,
      /** 看演出不用「结束时间」，散场时间因场次而异，不强制填 */
      endTime: isoDateTimeSchema.optional(),
      concert: concertPostPayloadSchema,
    })
    .strict(),
  z
    .object({
      domain: z.literal('TRAVEL'),
      ...postBaseShape,
      /** 旅游必须有返程日期，用来算行程天数和展示日期区间 */
      endTime: isoDateTimeSchema,
      travel: travelPostPayloadSchema,
    })
    .strict(),
]);

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ConcertCreateInput = Extract<CreatePostInput, { domain: 'CONCERT' }>;
export type TravelCreateInput = Extract<CreatePostInput, { domain: 'TRAVEL' }>;
export type GameCreateInput = Extract<CreatePostInput, { domain: 'GAME' }>;

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
    /** 演唱会：按艺人（含巡演名）模糊搜 */
    artist: z.string().trim().min(1).max(40).optional(),
    seatType: concertSeatSchema.optional(),
    /** 旅游：按目的地模糊搜 */
    destination: z.string().trim().min(1).max(40).optional(),
    budgetMax: z.coerce.number().int().min(0).max(1_000_000).optional(),
    transport: travelTransportSchema.optional(),
  })
  .strict();

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

/** 我发起的局：按创建时间倒序，包含所有状态（含已取消/已结束） */
export const myPostsQuerySchema = paginationQuerySchema.strict();

export type MyPostsQuery = z.infer<typeof myPostsQuerySchema>;

/** 我参与的局：只含已通过的报名，按报名时间倒序 */
export const myApplicationsQuerySchema = paginationQuerySchema.strict();

export type MyApplicationsQuery = z.infer<typeof myApplicationsQuerySchema>;

/** 演唱会局的独有属性，非演唱会局为 null */
export interface ConcertSummary {
  artist: string;
  tourName: string | null;
  venue: string | null;
  seatType: string | null;
  hasTicket: boolean;
  ticketNote: string | null;
}

/** 旅游局的独有属性，非旅游局为 null */
export interface TravelSummary {
  destination: string;
  budgetMin: number | null;
  budgetMax: number | null;
  transport: string | null;
  intensity: string | null;
  shareRoom: boolean;
}

export interface PostSummary {
  id: string;
  title: string;
  domain: string;
  /** 游戏局专有，其余领域为 null / false */
  game: { id: string; name: string } | null;
  platform: string | null;
  mode: string | null;
  rankMin: string | null;
  rankMax: string | null;
  needVoice: boolean;
  concert: ConcertSummary | null;
  travel: TravelSummary | null;
  startTime: string;
  /** 旅游局的返程日期；其余领域通常为 null */
  endTime: string | null;
  /** 城市：线下见面的局会填 */
  city: string | null;
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

/** 「我发起的」列表额外带待处理报名数（PRD US-08） */
export interface MyPostSummary extends PostSummary {
  pendingApplicationCount: number;
}

/** 「我参与的」列表项：局信息 + 我的报名状态（PRD US-08） */
export interface JoinedPostSummary extends PostSummary {
  applicationId: string;
  applicationStatus: string;
  appliedAt: string;
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
