import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { MePostsController } from './me-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [MessagesModule],
  controllers: [PostsController, MePostsController],
  providers: [PostsService],
})
export class PostsModule {}
