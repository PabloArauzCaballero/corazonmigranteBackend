import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Permission, Role, RolePermission, UserRole } from '@/database/models';
import { RolesPermissionsService } from './roles-permissions.service';

@Module({
  imports: [SequelizeModule.forFeature([Role, Permission, UserRole, RolePermission])],
  providers: [RolesPermissionsService],
  exports: [RolesPermissionsService],
})
export class RolesPermissionsModule {}
