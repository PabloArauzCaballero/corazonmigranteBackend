import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { AccountingTransaction } from './accounting-transaction.model';
import { Account } from './account.model';
import { CostCenter } from './cost-center.model';

@Table({ tableName: 'accounting_entries', underscored: true, timestamps: false })
export class AccountingEntry extends Model<AccountingEntry> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => AccountingTransaction)
  @Column({ type: DataType.UUID, allowNull: false, field: 'transaction_id' })
  transactionId: string;
  @ForeignKey(() => Account)
  @Column({ type: DataType.UUID, allowNull: false, field: 'account_id' })
  accountId: string;
  @ForeignKey(() => CostCenter)
  @Column({ type: DataType.UUID, field: 'cost_center_id' })
  costCenterId?: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }) debit: number;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }) credit: number;
  @BelongsTo(() => AccountingTransaction) transaction?: AccountingTransaction;
}
