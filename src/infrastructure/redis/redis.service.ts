import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('redis.host') ?? 'localhost',
      port: this.config.get<number>('redis.port') ?? 6379,
      password: this.config.get<string>('redis.password') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error) => {
      this.logger.warn(`Redis no disponible: ${error.message}`);
    });
  }

  get rawClient() {
    return this.client;
  }

  async ping(): Promise<'PONG'> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client.ping() as Promise<'PONG'>;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.client.status === 'wait') await this.client.connect();
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (this.client.status === 'wait') await this.client.connect();
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delByPattern(pattern: string): Promise<number> {
    if (this.client.status === 'wait') await this.client.connect();
    const keys = await this.client.keys(pattern);
    if (!keys.length) return 0;
    return this.client.del(...keys);
  }

  async onModuleDestroy() {
    if (this.client.status !== 'end') {
      this.client.disconnect();
    }
  }
}
