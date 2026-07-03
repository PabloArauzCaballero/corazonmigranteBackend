import { Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { FileAsset } from './file-asset.model';
import { ContentPublication } from './content-publication.model';

@Table({ tableName: 'content_authors', underscored: true, timestamps: true, paranoid: true })
export class ContentAuthor extends Model<ContentAuthor> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'user_id' })
  userId?: string;

  @Column({ type: DataType.STRING(180), allowNull: false, field: 'display_name' })
  displayName: string;

  @Column({ type: DataType.STRING(220) })
  headline?: string;

  @Column({ type: DataType.TEXT })
  bio?: string;

  @ForeignKey(() => FileAsset)
  @Column({ type: DataType.UUID, field: 'avatar_file_id' })
  avatarFileId?: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' })
  status: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata: Record<string, unknown>;

  @HasMany(() => ContentPublication)
  publications?: ContentPublication[];
}
