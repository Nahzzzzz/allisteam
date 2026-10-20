import { Module } from '@nestjs/common';
import { MePostsController } from './me-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController, MePostsController],
  providers: [PostsService],
})
export class PostsModule {}
