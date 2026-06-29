import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { TherapyProduct } from './therapy-product.model';

@Table({ tableName: 'therapy_approaches', underscored: true, timestamps: true, paranoid: true })
export class TherapyApproach extends Model<TherapyApproach> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(180), allowNull: false }) name: string;
  @Column({ type: DataType.STRING(200), allowNull: false, unique: true }) slug: string;
  @Column({ type: DataType.TEXT }) description?: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @Column({ type: DataType.UUID, field: 'image_file_id' }) imageFileId?: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;
  @HasMany(() => TherapyProduct) products?: TherapyProduct[];
}
