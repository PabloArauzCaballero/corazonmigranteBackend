import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { RedisService } from '@/infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly redis: RedisService,
  ) {}

  async check() {
    await this.sequelize.query('SELECT 1');
    const redisResult = await this.redis.ping();
    return {
      status: 'ok',
      database: 'ok',
      redis: redisResult === 'PONG' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }
}
