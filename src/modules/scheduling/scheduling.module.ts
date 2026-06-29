import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  Appointment,
  TherapistBlockedTime,
  TherapistSchedule,
  TherapyProduct,
} from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { SchedulingController, BookingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TherapistSchedule,
      TherapistBlockedTime,
      Appointment,
      TherapyProduct,
    ]),
    AuditModule,
  ],
  controllers: [SchedulingController, BookingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
