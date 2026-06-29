import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { CmsElement } from './cms-element.model';

@Table({ tableName: 'cms_pages', underscored: true, timestamps: true, paranoid: true })
export class CmsPage extends Model<CmsPage> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(200), allowNull: false, unique: true }) slug: string;
  @Column({ type: DataType.STRING(200), allowNull: false }) title: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'DRAFT' }) status: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {}, field: 'seo_metadata' })
  seoMetadata: Record<string, unknown>;
  @Column({ type: DataType.DATE, field: 'published_at' }) publishedAt?: Date;
  @HasMany(() => CmsElement) elements?: CmsElement[];
}
