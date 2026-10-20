import { z } from 'zod';
import { reviewTagSchema } from '../enums';
import { paginationQuerySchema } from './pagination';

/** 互评（PRD US-09）：局结束后，成员对同局其他成员各评价一次，1–5 星 */
export const createReviewSchema = z
  .object({
    toId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(200).optional(),
    tags: z
      .array(reviewTagSchema)
      .max(3)
      .refine((tags) => new Set(tags).size === tags.length, '标签不能重复')
      .optional(),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = paginationQuerySchema.strict();

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export interface ReviewParticipant {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface ReviewView {
  id: string;
  postId: string;
  postTitle: string;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
  from: ReviewParticipant;
  to: ReviewParticipant;
}
