import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Appointment } from './appointment.model';

@Table({ tableName: 'appointment_details', underscored: true, timestamps: true, paranoid: true })
export class AppointmentDetail extends Model<AppointmentDetail> {
  @ForeignKey(() => Appointment)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'appointment_id' })
  appointmentId: string;
  @Column({ type: DataType.STRING(500), field: 'meeting_url' }) meetingUrl?: string;
  @Column({ type: DataType.STRING(255) }) location?: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {}, field: 'private_metadata' })
  privateMetadata: Record<string, unknown>;
}
