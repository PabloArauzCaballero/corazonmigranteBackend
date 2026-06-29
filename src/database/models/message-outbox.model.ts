import { Column, DataType, Model, Table } from 'sequelize-typescript';

/**
 * Modelo de mensajería alineado con el backend legacy:
 * schema: mensajeria
 * tabla: mensajeria.mensaje_outbox
 *
 * La API mantiene nombres claros en inglés para TypeScript, pero cada campo
 * apunta explícitamente a su columna real en español para no crear tablas
 * paralelas como message_outbox.
 */
@Table({
  schema: 'mensajeria',
  tableName: 'mensaje_outbox',
  underscored: true,
  timestamps: false,
  paranoid: false,
})
export class MessageOutbox extends Model<MessageOutbox> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true, field: 'id_mensaje' })
  id: number;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'canal' })
  channel: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'para' })
  recipient: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'tipo' })
  templateCode: string;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'template_key' })
  templateKey?: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  payload: Record<string, unknown>;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: 'PENDIENTE', field: 'estado' })
  status: string;

  @Column({ type: DataType.SMALLINT, allowNull: false, defaultValue: 5, field: 'prioridad' })
  priority: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: 'intentos' })
  attempts: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 6, field: 'max_intentos' })
  maxAttempts: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW, field: 'next_run_at' })
  scheduledAt: Date;

  @Column({ type: DataType.DATE, field: 'locked_at' })
  lockedAt?: Date;

  @Column({ type: DataType.TEXT, field: 'locked_by' })
  lockedBy?: string;

  @Column({ type: DataType.TEXT, field: 'last_error' })
  lastError?: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW, field: 'created_at' })
  createdAt: Date;

  @Column({ type: DataType.DATE, field: 'sent_at' })
  sentAt?: Date;
}
