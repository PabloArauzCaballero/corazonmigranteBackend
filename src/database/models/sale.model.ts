import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Appointment } from './appointment.model';
import { TherapyProduct } from './therapy-product.model';
import { User } from './user.model';

@Table({ tableName: 'sales', underscored: true, timestamps: true, paranoid: true })
export class Sale extends Model<Sale> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => Appointment)
  @Column({ type: DataType.UUID, field: 'appointment_id' })
  appointmentId?: string;
  @ForeignKey(() => TherapyProduct)
  @Column({ type: DataType.UUID, field: 'product_id' })
  productId?: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'patient_user_id' })
  patientUserId: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) amount: number;
  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'BOB' }) currency: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'PENDING' }) status: string;
}
