import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { ContentPublication } from './content-publication.model';
import { ContentTag } from './content-tag.model';

@Table({ tableName: 'content_publication_tags', underscored: true, timestamps: false })
export class ContentPublicationTag extends Model<ContentPublicationTag> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => ContentPublication)
  @Column({ type: DataType.UUID, allowNull: false, field: 'publication_id' })
  publicationId: string;

  @ForeignKey(() => ContentTag)
  @Column({ type: DataType.UUID, allowNull: false, field: 'tag_id' })
  tagId: string;
}
