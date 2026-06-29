import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'auth_pins', underscored: true, timestamps: true, paranoid: false })
export class AuthPin extends Model<AuthPin> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(180), allowNull: false }) email: string;
  @Column({ type: DataType.STRING(128), allowNull: false, field: 'pin_hash' }) pinHash: string;
  @Column({ type: DataType.STRING(40), allowNull: false }) purpose: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'expires_at' }) expiresAt: Date;
  @Column({ type: DataType.DATE, field: 'consumed_at' }) consumedAt?: Date | null;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 }) attempts: number;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} }) metadata: Record<
    string,
    unknown
  >;
}
