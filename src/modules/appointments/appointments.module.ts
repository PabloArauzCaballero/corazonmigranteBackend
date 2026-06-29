import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appointment, AppointmentStatusHistory, TherapyProduct } from '@/database/models';
import { AuditModule } from '../audit/audit.module';
import { MessagingModule } from '../messaging/messaging.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Appointment, AppointmentStatusHistory, TherapyProduct]),
    SchedulingModule,
    AuditModule,
    MessagingModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
