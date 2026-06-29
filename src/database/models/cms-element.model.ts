import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CmsPage } from './cms-page.model';
import { FileAsset } from './file-asset.model';

@Table({ tableName: 'cms_elements', underscored: true, timestamps: true, paranoid: true })
export class CmsElement extends Model<CmsElement> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => CmsPage)
  @Column({ type: DataType.UUID, allowNull: false, field: 'page_id' })
  pageId: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) code: string;
  @Column({ type: DataType.STRING(40), allowNull: false }) type: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} }) content: Record<
    string,
    unknown
  >;
  @ForeignKey(() => FileAsset)
  @Column({ type: DataType.UUID, field: 'file_id' })
  fileId?: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' })
  sortOrder: number;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @BelongsTo(() => CmsPage) page?: CmsPage;
}
