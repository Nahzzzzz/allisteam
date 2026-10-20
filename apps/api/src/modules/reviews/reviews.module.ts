import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { UsersModule } from '../users/users.module';
import { PostReviewsController, UserReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [PostsModule, UsersModule],
  controllers: [PostReviewsController, UserReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
