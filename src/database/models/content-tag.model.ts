import { BelongsToMany, Column, DataType, Model, Table } from 'sequelize-typescript';
import { ContentPublication } from './content-publication.model';
import { ContentPublicationTag } from './content-publication-tag.model';

@Table({ tableName: 'content_tags', underscored: true, timestamps: true, paranoid: true })
export class ContentTag extends Model<ContentTag> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  slug: string;

  @Column({ type: DataType.STRING(80), allowNull: false })
  name: string;

  @BelongsToMany(() => ContentPublication, () => ContentPublicationTag)
  publications?: ContentPublication[];
}
