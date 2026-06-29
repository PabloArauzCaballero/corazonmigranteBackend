import { Column, DataType, Model, Table, BelongsToMany } from 'sequelize-typescript';
import { Role } from './role.model';
import { RolePermission } from './role-permission.model';

@Table({ tableName: 'permissions', underscored: true, timestamps: true, paranoid: true })
export class Permission extends Model<Permission> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(80), allowNull: false, unique: true }) code: string;
  @Column({ type: DataType.TEXT }) description?: string;
  @BelongsToMany(() => Role, () => RolePermission) roles?: Role[];
}
