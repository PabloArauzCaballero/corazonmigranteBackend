import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Role } from './role.model';
import { Permission } from './permission.model';

@Table({ tableName: 'role_permissions', underscored: true, timestamps: false })
export class RolePermission extends Model<RolePermission> {
  @ForeignKey(() => Role)
  @Column({ type: DataType.UUID, allowNull: false, field: 'role_id', primaryKey: true })
  roleId: string;
  @ForeignKey(() => Permission)
  @Column({ type: DataType.UUID, allowNull: false, field: 'permission_id', primaryKey: true })
  permissionId: string;
}
