import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { FileAccessLog, FileAsset } from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [ConfigModule, SequelizeModule.forFeature([FileAsset, FileAccessLog]), AuditModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
