import { Module } from '@nestjs/common';
import { LegacyCompatibilityController } from './legacy-compatibility.controller';
@Module({ controllers: [LegacyCompatibilityController] })
export class LegacyCompatibilityModule {}
