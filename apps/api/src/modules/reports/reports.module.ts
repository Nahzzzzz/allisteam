import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { PostsModule } from '../posts/posts.module';
import { UsersModule } from '../users/users.module';
import { AdminReportsController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PostsModule, UsersModule, MessagesModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
