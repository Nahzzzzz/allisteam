import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { ApplicationsController, PostApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [MessagesModule],
  controllers: [PostApplicationsController, ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
