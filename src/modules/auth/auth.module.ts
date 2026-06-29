import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthPin, PatientProfile, RefreshToken, TherapistProfile, User } from '@/database/models';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';
import { AuditModule } from '../audit/audit.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({}),
    SequelizeModule.forFeature([User, PatientProfile, TherapistProfile, RefreshToken, AuthPin]),
    RolesPermissionsModule,
    AuditModule,
    MessagingModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
