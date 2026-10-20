import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { MePostsController } from './me-posts.controller';
import { PostLifecycleService } from './post-lifecycle.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [MessagesModule],
  controllers: [PostsController, MePostsController],
  providers: [PostsService, PostLifecycleService],
  exports: [PostsService],
})
export class PostsModule {}
