import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { Role } from './role.model';

@Table({ tableName: 'user_roles', underscored: true, timestamps: false })
export class UserRole extends Model<UserRole> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id', primaryKey: true })
  userId: string;
  @ForeignKey(() => Role)
  @Column({ type: DataType.UUID, allowNull: false, field: 'role_id', primaryKey: true })
  roleId: string;
}
