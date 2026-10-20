import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO 适配器：限制握手来源，并在 Redis 可用时挂上跨实例广播。
 * Redis 不可用时退化为单实例，不影响本地开发。
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connect(): Promise<boolean> {
    const pub = new Redis(this.redisUrl, { maxRetriesPerRequest: 2 });
    const sub = pub.duplicate();
    pub.on('error', () => undefined);
    sub.on('error', () => undefined);

    try {
      await Promise.all([pub.ping(), sub.ping()]);
    } catch {
      pub.disconnect();
      sub.disconnect();
      return false;
    }

    this.adapterConstructor = createAdapter(pub, sub);
    return true;
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
    }) as Server;

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
