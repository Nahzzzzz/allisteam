import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  createReviewSchema,
  listReviewsQuerySchema,
  type CreateReviewInput,
  type ListReviewsQuery,
} from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { ReviewsService } from './reviews.service';

/** 局内评价：列表公开，提交需要是局内成员 */
@Controller('posts')
export class PostReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  list(
    @Param('id') postId: string,
    @Query(new ZodValidationPipe(listReviewsQuerySchema)) query: ListReviewsQuery,
  ) {
    return this.reviews.listForPost(postId, query);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ name: 'reviews:create', limit: 50, windowSeconds: 86_400, scope: 'user' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') postId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) input: CreateReviewInput,
  ) {
    return this.reviews.create(postId, user.id, input);
  }
}

/** 用户主页上的评价（收到的） */
@Controller('users')
export class UserReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  list(
    @Param('id') userId: string,
    @Query(new ZodValidationPipe(listReviewsQuerySchema)) query: ListReviewsQuery,
  ) {
    return this.reviews.listForUser(userId, query);
  }
}
