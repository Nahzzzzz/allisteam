import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { listMessagesQuerySchema, type ListMessagesQuery } from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { MessagesService } from './messages.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get(':id/messages')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id') postId: string,
    @Query(new ZodValidationPipe(listMessagesQuerySchema)) query: ListMessagesQuery,
  ) {
    return this.messages.history(postId, user.id, query);
  }
}
