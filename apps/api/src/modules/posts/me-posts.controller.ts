import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  myApplicationsQuerySchema,
  myPostsQuerySchema,
  type MyApplicationsQuery,
  type MyPostsQuery,
} from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { PostsService } from './posts.service';

/** 与 /posts 分开：列表接口只暴露将来的公开局，管理视角需要看到全部状态 */
@Controller('me')
export class MePostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('posts')
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(myPostsQuerySchema)) query: MyPostsQuery,
  ) {
    return this.posts.listMine(user.id, query);
  }

  /** 「我参与的」：已通过的报名；待审批/被拒/已撤回都不算参与 */
  @Get('applications')
  @UseGuards(JwtAuthGuard)
  listJoined(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(myApplicationsQuerySchema)) query: MyApplicationsQuery,
  ) {
    return this.posts.listJoined(user.id, query);
  }
}
