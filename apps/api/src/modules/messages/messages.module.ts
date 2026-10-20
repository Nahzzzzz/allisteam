import { Module } from '@nestjs/common';
import { ChatEventsService } from './chat-events.service';
import { ChatGateway } from './chat.gateway';
import { PostMessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  controllers: [PostMessagesController],
  providers: [MessagesService, ChatEventsService, ChatGateway],
  exports: [MessagesService, ChatEventsService],
})
export class MessagesModule {}
