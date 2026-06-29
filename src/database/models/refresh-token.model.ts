import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'refresh_tokens', underscored: true, timestamps: true, paranoid: false })
export class RefreshToken extends Model<RefreshToken> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'user_id' })
  userId: string;
  @Column({ type: DataType.STRING(128), allowNull: false, field: 'token_hash', unique: true })
  tokenHash: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'expires_at' }) expiresAt: Date;
  @Column({ type: DataType.DATE, field: 'revoked_at' }) revokedAt?: Date | null;
  @Column({ type: DataType.UUID, field: 'replaced_by_token_id' }) replacedByTokenId?: string;
  @Column({ type: DataType.STRING(255), field: 'user_agent' }) userAgent?: string;
  @Column({ type: DataType.STRING(80), field: 'ip_address' }) ipAddress?: string;
  @BelongsTo(() => User) user?: User;
}
