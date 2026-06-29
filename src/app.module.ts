import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { TherapyCatalogModule } from './modules/therapy-catalog/therapy-catalog.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { FilesModule } from './modules/files/files.module';
import { CmsModule } from './modules/cms/cms.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { LegacyCompatibilityModule } from './modules/legacy-compatibility/legacy-compatibility.module';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    RedisModule,
    JwtModule.register({}),
    RolesPermissionsModule,
    AuditModule,
    MessagingModule,
    AuthModule,
    UsersModule,
    TherapyCatalogModule,
    SchedulingModule,
    AppointmentsModule,
    FilesModule,
    CmsModule,
    AccountingModule,
    AnalyticsModule,
    HealthModule,
    LegacyCompatibilityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
