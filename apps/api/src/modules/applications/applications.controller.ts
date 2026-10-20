import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createApplicationSchema,
  decideApplicationSchema,
  listApplicationsQuerySchema,
  type CreateApplicationInput,
  type DecideApplicationInput,
  type ListApplicationsQuery,
} from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { ApplicationsService } from './applications.service';

/** 挂在局下的报名接口：报名与查看报名列表 */
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get(':id/applications')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id') postId: string,
    @Query(new ZodValidationPipe(listApplicationsQuerySchema)) query: ListApplicationsQuery,
  ) {
    return this.applications.list(postId, user.id, query);
  }

  @Post(':id/applications')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'applications:create', limit: 30, windowSeconds: 86_400, scope: 'user' })
  apply(
    @CurrentUser() user: AuthUser,
    @Param('id') postId: string,
    @Body(new ZodValidationPipe(createApplicationSchema)) input: CreateApplicationInput,
  ) {
    return this.applications.apply(postId, user.id, input);
  }
}

/** 按报名 id 操作的接口：审批与撤回 */
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Patch(':id')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decideApplicationSchema)) input: DecideApplicationInput,
  ) {
    return this.applications.decide(id, user.id, input);
  }

  @Delete(':id')
  withdraw(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.applications.withdraw(id, user.id);
  }
}
