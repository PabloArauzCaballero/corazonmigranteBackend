import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { HomepageSection } from './homepage-section.model';

@Table({
  tableName: 'homepage_featured_items',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class HomepageFeaturedItem extends Model<HomepageFeaturedItem> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => HomepageSection)
  @Column({ type: DataType.UUID, allowNull: false, field: 'section_id' })
  sectionId: string;

  @Column({ type: DataType.STRING(40), allowNull: false, field: 'item_type' })
  itemType: string;

  @Column({ type: DataType.UUID, allowNull: false, field: 'item_id' })
  itemId: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' })
  status: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata: Record<string, unknown>;

  @BelongsTo(() => HomepageSection)
  section?: HomepageSection;
}
