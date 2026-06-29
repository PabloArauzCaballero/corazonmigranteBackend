import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Account } from './account.model';

@Table({ tableName: 'account_groups', underscored: true, timestamps: true, paranoid: true })
export class AccountGroup extends Model<AccountGroup> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(40), allowNull: false, unique: true }) code: string;
  @Column({ type: DataType.STRING(160), allowNull: false }) name: string;
  @Column({ type: DataType.STRING(40), allowNull: false }) type: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @HasMany(() => Account) accounts?: Account[];
}
