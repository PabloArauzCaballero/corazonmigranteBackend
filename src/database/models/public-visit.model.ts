import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'public_visits', underscored: true, timestamps: false })
export class PublicVisit extends Model<PublicVisit> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(500), allowNull: false }) path: string;
  @Column({ type: DataType.STRING(128), field: 'ip_hash' }) ipHash?: string;
  @Column({ type: DataType.STRING(128), field: 'user_agent_hash' }) userAgentHash?: string;
  @Column({ type: DataType.STRING(500) }) referrer?: string;
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
}
