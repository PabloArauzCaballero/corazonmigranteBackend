import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Appointment } from './appointment.model';
import { User } from './user.model';

@Table({ tableName: 'appointment_status_history', underscored: true, timestamps: false })
export class AppointmentStatusHistory extends Model<AppointmentStatusHistory> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => Appointment)
  @Column({ type: DataType.UUID, allowNull: false, field: 'appointment_id' })
  appointmentId: string;
  @Column({ type: DataType.STRING(50), field: 'from_status' }) fromStatus?: string;
  @Column({ type: DataType.STRING(50), allowNull: false, field: 'to_status' }) toStatus: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'changed_by_user_id' })
  changedByUserId: string;
  @Column({ type: DataType.TEXT }) reason?: string;
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
  @BelongsTo(() => Appointment) appointment?: Appointment;
}
