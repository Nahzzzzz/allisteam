import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
  type CreatePostInput,
  type ListPostsQuery,
  type UpdatePostInput,
} from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { RateLimit } from '../../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(@Query(new ZodValidationPipe(listPostsQuerySchema)) query: ListPostsQuery) {
    return this.posts.list(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.posts.detail(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ name: 'posts:create', limit: 10, windowSeconds: 86_400, scope: 'user' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPostSchema)) input: CreatePostInput,
  ) {
    return this.posts.create(user.id, input);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePostSchema)) input: UpdatePostInput,
  ) {
    return this.posts.update(id, user.id, input);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.cancel(id, user.id);
  }
}
