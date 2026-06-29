import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'therapist_schedules', underscored: true, timestamps: true, paranoid: true })
export class TherapistSchedule extends Model<TherapistSchedule> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'therapist_user_id' })
  therapistUserId: string;
  @Column({ type: DataType.INTEGER, allowNull: false }) weekday: number;
  @Column({ type: DataType.TIME, allowNull: false, field: 'start_time' }) startTime: string;
  @Column({ type: DataType.TIME, allowNull: false, field: 'end_time' }) endTime: string;
  @Column({ type: DataType.STRING(80), allowNull: false }) timezone: string;
  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'effective_from' })
  effectiveFrom: string;
  @Column({ type: DataType.DATEONLY, field: 'effective_to' }) effectiveTo?: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 }) version: number;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
}
