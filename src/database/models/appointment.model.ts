import { Column, DataType, ForeignKey, Model, Table, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { TherapyProduct } from './therapy-product.model';
import { AppointmentStatusHistory } from './appointment-status-history.model';

@Table({ tableName: 'appointments', underscored: true, timestamps: true, paranoid: true })
export class Appointment extends Model<Appointment> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'patient_user_id' })
  patientUserId: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'therapist_user_id' })
  therapistUserId: string;
  @ForeignKey(() => TherapyProduct)
  @Column({ type: DataType.UUID, allowNull: false, field: 'product_id' })
  productId: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'scheduled_start_at' })
  scheduledStartAt: Date;
  @Column({ type: DataType.DATE, allowNull: false, field: 'scheduled_end_at' })
  scheduledEndAt: Date;
  @Column({ type: DataType.STRING(80), allowNull: false }) timezone: string;
  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: 'REQUESTED' })
  status: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) price: number;
  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'BOB' }) currency: string;
  @Column({ type: DataType.TEXT, field: 'notes_for_therapist' }) notesForTherapist?: string;
  @Column({ type: DataType.TEXT, field: 'admin_notes' }) adminNotes?: string;
  @HasMany(() => AppointmentStatusHistory) statusHistory?: AppointmentStatusHistory[];
}
