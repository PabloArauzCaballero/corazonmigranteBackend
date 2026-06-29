import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { TherapyApproach } from './therapy-approach.model';

@Table({ tableName: 'therapy_products', underscored: true, timestamps: true, paranoid: true })
export class TherapyProduct extends Model<TherapyProduct> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => TherapyApproach)
  @Column({ type: DataType.UUID, allowNull: false, field: 'approach_id' })
  approachId: string;
  @Column({ type: DataType.STRING(180), allowNull: false }) name: string;
  @Column({ type: DataType.STRING(200), allowNull: false, unique: true }) slug: string;
  @Column({ type: DataType.TEXT }) description?: string;
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'duration_minutes' })
  durationMinutes: number;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) price: number;
  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'BOB' }) currency: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @Column({ type: DataType.UUID, field: 'image_file_id' }) imageFileId?: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;
  @BelongsTo(() => TherapyApproach) approach?: TherapyApproach;
}
