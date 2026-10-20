import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createReportSchema,
  handleReportSchema,
  listReportsQuerySchema,
  type CreateReportInput,
  type HandleReportInput,
  type ListReportsQuery,
} from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ name: 'reports:create', limit: 10, windowSeconds: 86_400, scope: 'user' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createReportSchema)) input: CreateReportInput,
  ) {
    return this.reports.create(user.id, input);
  }
}

/** 极简后台：管理员用 ADMIN_EMAILS 白名单识别，不建角色表 */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listReportsQuerySchema)) query: ListReportsQuery) {
    return this.reports.list(query);
  }

  @Patch(':id')
  handle(
    @CurrentUser() user: AuthUser,
    @Param('id') reportId: string,
    @Body(new ZodValidationPipe(handleReportSchema)) input: HandleReportInput,
  ) {
    return this.reports.handle(reportId, user.id, input);
  }
}
