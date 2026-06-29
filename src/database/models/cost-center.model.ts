import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'cost_centers', underscored: true, timestamps: true, paranoid: true })
export class CostCenter extends Model<CostCenter> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(40), allowNull: false, unique: true }) code: string;
  @Column({ type: DataType.STRING(160), allowNull: false }) name: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
}
