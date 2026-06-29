import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'files', underscored: true, timestamps: true, paranoid: true })
export class FileAsset extends Model<FileAsset> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'owner_user_id' })
  ownerUserId: string;
  @Column({ type: DataType.STRING(60), allowNull: false }) module: string;
  @Column({ type: DataType.STRING(80), field: 'entity_type' }) entityType?: string;
  @Column({ type: DataType.UUID, field: 'entity_id' }) entityId?: string;
  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'LOCAL',
    field: 'storage_provider',
  })
  storageProvider: string;
  @Column({ type: DataType.STRING(120) }) bucket?: string;
  @Column({ type: DataType.STRING(500), allowNull: false, field: 'object_key' }) objectKey: string;
  @Column({ type: DataType.STRING(255), allowNull: false, field: 'original_name' })
  originalName: string;
  @Column({ type: DataType.STRING(120), allowNull: false, field: 'mime_type' }) mimeType: string;
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'size_bytes' }) sizeBytes: number;
  @Column({ type: DataType.STRING(128) }) checksum?: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'PRIVATE' })
  visibility: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} }) metadata: Record<
    string,
    unknown
  >;
}
