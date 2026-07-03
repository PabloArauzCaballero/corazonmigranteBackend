import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { MessageOutbox } from './message-outbox.model';

/**
 * Log real de envíos alineado con el backend legacy:
 * mensajeria.mensaje_envio_log.
 */
@Table({
  schema: 'mensajeria',
  tableName: 'mensaje_envio_log',
  underscored: true,
  timestamps: false,
  paranoid: false,
})
export class MessageSendLog extends Model<MessageSendLog> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true, field: 'id_log' })
  id: number;

  @ForeignKey(() => MessageOutbox)
  @Column({ type: DataType.BIGINT, allowNull: false, field: 'id_mensaje' })
  outboxId: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, field: 'ok' })
  ok: boolean;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'provider_id' })
  providerMessageId?: string;

  @Column({ type: DataType.JSONB, allowNull: true, field: 'respuesta' })
  responseMetadata?: Record<string, unknown>;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'error' })
  error?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'created_at',
  })
  createdAt: Date;
}
