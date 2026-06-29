import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminProfile, PatientProfile, TherapistProfile, User } from '@/database/models';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';
import { AuditModule } from '../audit/audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    SequelizeModule.forFeature([User, PatientProfile, TherapistProfile, AdminProfile]),
    RolesPermissionsModule,
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
