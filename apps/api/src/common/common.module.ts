import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { PinoLoggerService } from './logger/pino-logger.service';

/** 守卫与日志器全局可用，业务模块直接 @UseGuards 即可 */
@Global()
@Module({
  providers: [AdminGuard, JwtAuthGuard, OptionalJwtGuard, RateLimitGuard, PinoLoggerService],
  exports: [AdminGuard, JwtAuthGuard, OptionalJwtGuard, RateLimitGuard, PinoLoggerService],
})
export class CommonModule {}
