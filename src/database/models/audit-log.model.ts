import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'audit_logs', underscored: true, timestamps: false })
export class AuditLog extends Model<AuditLog> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'actor_user_id' })
  actorUserId?: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) action: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'entity_type' })
  entityType: string;
  @Column({ type: DataType.STRING(100), field: 'entity_id' }) entityId?: string;
  @Column({ type: DataType.JSONB }) before?: Record<string, unknown>;
  @Column({ type: DataType.JSONB }) after?: Record<string, unknown>;
  @Column({ type: DataType.STRING(80), field: 'ip_address' }) ipAddress?: string;
  @Column({ type: DataType.STRING(255), field: 'user_agent' }) userAgent?: string;
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
}
