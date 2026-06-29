import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'ui_events', underscored: true, timestamps: false })
export class UiEvent extends Model<UiEvent> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(120), field: 'session_id' }) sessionId?: string;
  @Column({ type: DataType.STRING(120), allowNull: false, field: 'event_name' }) eventName: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} }) payload: Record<
    string,
    unknown
  >;
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
}
