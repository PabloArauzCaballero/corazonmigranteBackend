import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Sale } from './sale.model';

@Table({ tableName: 'payments', underscored: true, timestamps: true, paranoid: true })
export class Payment extends Model<Payment> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => Sale)
  @Column({ type: DataType.UUID, allowNull: false, field: 'sale_id' })
  saleId: string;
  @Column({ type: DataType.STRING(40), allowNull: false }) provider: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) amount: number;
  @Column({ type: DataType.STRING(3), allowNull: false }) currency: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'PENDING' }) status: string;
  @Column({ type: DataType.STRING(160), field: 'provider_reference' }) providerReference?: string;
  @Column({ type: DataType.DATE, field: 'paid_at' }) paidAt?: Date;
}
