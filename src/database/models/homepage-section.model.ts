import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { HomepageFeaturedItem } from './homepage-featured-item.model';

@Table({ tableName: 'homepage_sections', underscored: true, timestamps: true, paranoid: true })
export class HomepageSection extends Model<HomepageSection> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @Column({ type: DataType.STRING(80), allowNull: false, unique: true })
  code: string;

  @Column({ type: DataType.STRING(140), allowNull: false })
  title: string;

  @Column({ type: DataType.STRING(40), allowNull: false })
  type: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' })
  isActive: boolean;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata: Record<string, unknown>;

  @HasMany(() => HomepageFeaturedItem)
  items?: HomepageFeaturedItem[];
}
