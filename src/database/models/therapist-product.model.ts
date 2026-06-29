import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { TherapyProduct } from './therapy-product.model';

@Table({ tableName: 'therapist_products', underscored: true, timestamps: true, paranoid: true })
export class TherapistProduct extends Model<TherapistProduct> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'therapist_user_id' })
  therapistUserId: string;
  @ForeignKey(() => TherapyProduct)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'product_id' })
  productId: string;
  @Column({ type: DataType.DECIMAL(12, 2), field: 'custom_price' }) customPrice?: number;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' })
  isActive: boolean;
}
