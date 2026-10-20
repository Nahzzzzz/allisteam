import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { CommonModule } from './common/common.module';
import { RedisModule } from './common/redis/redis.module';
import { EnvModule } from './config/env.module';
import { EnvService } from './config/env.service';
import { PrismaModule } from './prisma/prisma.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { GamesModule } from './modules/games/games.module';
import { HealthModule } from './modules/health/health.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EnvModule,
    JwtModule.registerAsync({
      global: true,
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        secret: env.values.JWT_ACCESS_SECRET,
        signOptions: {
          expiresIn: env.values.JWT_ACCESS_TTL as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    CommonModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GamesModule,
    PostsModule,
    ApplicationsModule,
    MessagesModule,
    ReviewsModule,
    ReportsModule,
  ],
})
export class AppModule {}
