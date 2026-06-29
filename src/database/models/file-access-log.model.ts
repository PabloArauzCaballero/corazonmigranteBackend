import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { FileAsset } from './file-asset.model';
import { User } from './user.model';

@Table({ tableName: 'file_access_logs', underscored: true, timestamps: false })
export class FileAccessLog extends Model<FileAccessLog> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => FileAsset)
  @Column({ type: DataType.UUID, allowNull: false, field: 'file_id' })
  fileId: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'actor_user_id' })
  actorUserId?: string;
  @Column({ type: DataType.STRING(40), allowNull: false }) action: string;
  @Column({ type: DataType.STRING(80), field: 'ip_address' }) ipAddress?: string;
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
}
