import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'admin_profiles', underscored: true, timestamps: true, paranoid: true })
export class AdminProfile extends Model<AdminProfile> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'user_id' })
  userId: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' }) firstName: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' }) lastName: string;
  @Column({ type: DataType.STRING(40) }) phone?: string;
  @Column({ type: DataType.STRING(40), defaultValue: 'STANDARD' }) level: string;
  @Column({ type: DataType.UUID, field: 'linked_therapist_user_id' })
  linkedTherapistUserId?: string;
  @BelongsTo(() => User) user?: User;
}
