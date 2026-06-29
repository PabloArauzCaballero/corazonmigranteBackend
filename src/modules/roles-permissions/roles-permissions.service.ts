import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Permission, Role, RolePermission, UserRole } from '@/database/models';

@Injectable()
export class RolesPermissionsService {
  constructor(
    @InjectModel(Role) private readonly roleModel: typeof Role,
    @InjectModel(Permission) private readonly permissionModel: typeof Permission,
    @InjectModel(UserRole) private readonly userRoleModel: typeof UserRole,
    @InjectModel(RolePermission) private readonly rolePermissionModel: typeof RolePermission,
  ) {}

  async assignRoleByCode(userId: string, roleCode: string, transaction?: Transaction) {
    const role = await this.roleModel.findOne({ where: { code: roleCode }, transaction });
    if (!role)
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: `Rol ${roleCode} no existe.`,
      });
    await this.userRoleModel.findOrCreate({
      where: { userId, roleId: role.id },
      defaults: { userId, roleId: role.id } as any,
      transaction,
    });
  }

  async getUserRolesAndPermissions(userId: string) {
    const userRoles = await this.userRoleModel.findAll({ where: { userId } });
    const roleIds = userRoles.map((ur) => ur.roleId);
    const roles = await this.roleModel.findAll({ where: { id: roleIds } });
    const rolePermissions = await this.rolePermissionModel.findAll({ where: { roleId: roleIds } });
    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.permissionId))];
    const permissions = permissionIds.length
      ? await this.permissionModel.findAll({ where: { id: permissionIds } })
      : [];
    return {
      roles: roles.map((role) => role.code),
      permissions: permissions.map((permission) => permission.code),
    };
  }
}
