import { Column, DataType, Model, Table, BelongsToMany } from 'sequelize-typescript';
import { Permission } from './permission.model';
import { RolePermission } from './role-permission.model';
import { User } from './user.model';
import { UserRole } from './user-role.model';

@Table({ tableName: 'roles', underscored: true, timestamps: true, paranoid: true })
export class Role extends Model<Role> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(40), allowNull: false, unique: true }) code: string;
  @Column({ type: DataType.STRING(120), allowNull: false }) name: string;
  @Column({ type: DataType.TEXT }) description?: string;

  @BelongsToMany(() => Permission, () => RolePermission) permissions?: Permission[];
  @BelongsToMany(() => User, () => UserRole) users?: User[];
}
