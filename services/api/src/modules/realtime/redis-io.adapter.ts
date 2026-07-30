import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO Redis adapter so API and websocket processes share rooms/emits.
 * Required when REST (api:4000) and Socket.IO (websocket:4100) run in separate containers.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    this.pubClient = createClient({ url: redisUrl }) as RedisClientType;
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (error: Error) => {
      this.logger.error(`Redis pub client error: ${error.message}`);
    });
    this.subClient.on('error', (error: Error) => {
      this.logger.error(`Redis sub client error: ${error.message}`);
    });

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Socket.IO Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
    this.pubClient = null;
    this.subClient = null;
    this.adapterConstructor = null;
  }
}
