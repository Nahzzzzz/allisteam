import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
];

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: REDACT_PATHS, remove: true },
  });

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, this.toText(message));
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.logger.error({ context, stack }, this.toText(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, this.toText(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, this.toText(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, this.toText(message));
  }

  private toText(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
