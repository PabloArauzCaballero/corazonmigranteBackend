import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  AdminProfile,
  PatientProfile,
  RefreshToken,
  Role,
  TherapistProfile,
  User,
  UserRole,
} from '@/database/models';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';
import { AuditModule } from '../audit/audit.module';
import { AdminUsersController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      PatientProfile,
      TherapistProfile,
      AdminProfile,
      RefreshToken,
      Role,
      UserRole,
    ]),
    RolesPermissionsModule,
    AuditModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
