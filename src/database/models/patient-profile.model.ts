import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'patient_profiles', underscored: true, timestamps: true, paranoid: true })
export class PatientProfile extends Model<PatientProfile> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'user_id' })
  userId: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' }) firstName: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' }) lastName: string;
  @Column({ type: DataType.STRING(40) }) phone?: string;
  @Column({ type: DataType.DATEONLY, field: 'birth_date' }) birthDate?: string;
  @Column({ type: DataType.STRING(80) }) country?: string;
  @Column({ type: DataType.STRING(120) }) city?: string;
  @Column({ type: DataType.STRING(120) }) occupation?: string;
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {}, field: 'profile_metadata' })
  profileMetadata: Record<string, unknown>;
  @Column({ type: DataType.UUID, field: 'avatar_file_id' }) avatarFileId?: string;
  @BelongsTo(() => User) user?: User;
}
