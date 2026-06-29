import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'therapist_blocked_times',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class TherapistBlockedTime extends Model<TherapistBlockedTime> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'therapist_user_id' })
  therapistUserId: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'start_at' }) startAt: Date;
  @Column({ type: DataType.DATE, allowNull: false, field: 'end_at' }) endAt: Date;
  @Column({ type: DataType.STRING(255) }) reason?: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
}
