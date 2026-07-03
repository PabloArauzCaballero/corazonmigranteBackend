import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { ContentPublication } from './content-publication.model';

@Table({ tableName: 'content_categories', underscored: true, timestamps: true, paranoid: true })
export class ContentCategory extends Model<ContentCategory> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @Column({ type: DataType.STRING(140), allowNull: false, unique: true })
  slug: string;

  @Column({ type: DataType.STRING(120), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT })
  description?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' })
  isActive: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;

  @HasMany(() => ContentPublication)
  publications?: ContentPublication[];
}
