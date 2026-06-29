import { Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { AccountingEntry } from './accounting-entry.model';

@Table({
  tableName: 'accounting_transactions',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class AccountingTransaction extends Model<AccountingTransaction> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.DATEONLY, allowNull: false }) date: string;
  @Column({ type: DataType.TEXT, allowNull: false }) description: string;
  @Column({ type: DataType.STRING(100) }) reference?: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'POSTED' }) status: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'created_by_user_id' })
  createdByUserId: string;
  @HasMany(() => AccountingEntry) entries?: AccountingEntry[];
}
