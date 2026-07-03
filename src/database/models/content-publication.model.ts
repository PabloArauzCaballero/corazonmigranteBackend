import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { FileAsset } from './file-asset.model';
import { ContentAuthor } from './content-author.model';
import { ContentCategory } from './content-category.model';
import { ContentPublicationTag } from './content-publication-tag.model';
import { ContentTag } from './content-tag.model';

@Table({ tableName: 'content_publications', underscored: true, timestamps: true, paranoid: true })
export class ContentPublication extends Model<ContentPublication> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => ContentAuthor)
  @Column({ type: DataType.UUID, allowNull: false, field: 'author_id' })
  authorId: string;

  @ForeignKey(() => ContentCategory)
  @Column({ type: DataType.UUID, allowNull: false, field: 'category_id' })
  categoryId: string;

  @ForeignKey(() => FileAsset)
  @Column({ type: DataType.UUID, field: 'cover_file_id' })
  coverFileId?: string;

  @Column({ type: DataType.STRING(240), allowNull: false, unique: true })
  slug: string;

  @Column({ type: DataType.STRING(220), allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  summary: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  body: string;

  @Column({ type: DataType.TEXT, field: 'audio_transcript' })
  audioTranscript?: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'NEWS',
    field: 'publication_type',
  })
  publicationType: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'PUBLIC',
    field: 'access_type',
  })
  accessType: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'DRAFT' })
  status: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'comments_enabled',
  })
  commentsEnabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'reactions_enabled',
  })
  reactionsEnabled: boolean;

  @Column({ type: DataType.DATE, field: 'published_at' })
  publishedAt?: Date;

  @Column({ type: DataType.DATE, field: 'scheduled_at' })
  scheduledAt?: Date;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {}, field: 'seo_metadata' })
  seoMetadata: Record<string, unknown>;

  @BelongsTo(() => ContentAuthor)
  author?: ContentAuthor;

  @BelongsTo(() => ContentCategory)
  category?: ContentCategory;

  @BelongsTo(() => FileAsset)
  coverFile?: FileAsset;

  @BelongsToMany(() => ContentTag, () => ContentPublicationTag)
  tags?: ContentTag[];
}
