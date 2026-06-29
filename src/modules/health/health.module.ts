import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisModule } from '@/infrastructure/redis/redis.module';
@Module({
  imports: [SequelizeModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
