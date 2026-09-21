import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  Appointment,
  TherapistBlockedTime,
  TherapistProfile,
  TherapistSchedule,
  TherapyProduct,
} from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import {
  SchedulingController,
  AdminSchedulingController,
  BookingController,
} from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TherapistSchedule,
      TherapistBlockedTime,
      TherapistProfile,
      Appointment,
      TherapyProduct,
    ]),
    AuditModule,
  ],
  controllers: [SchedulingController, AdminSchedulingController, BookingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
