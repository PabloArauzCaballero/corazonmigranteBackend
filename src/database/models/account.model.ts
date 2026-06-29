import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { AccountGroup } from './account-group.model';

@Table({ tableName: 'accounts', underscored: true, timestamps: true, paranoid: true })
export class Account extends Model<Account> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => AccountGroup)
  @Column({ type: DataType.UUID, allowNull: false, field: 'group_id' })
  groupId: string;
  @Column({ type: DataType.STRING(40), allowNull: false, unique: true }) code: string;
  @Column({ type: DataType.STRING(160), allowNull: false }) name: string;
  @Column({ type: DataType.STRING(10), allowNull: false, field: 'normal_balance' })
  normalBalance: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @BelongsTo(() => AccountGroup) group?: AccountGroup;
}
