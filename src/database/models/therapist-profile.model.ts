import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'therapist_profiles', underscored: true, timestamps: true, paranoid: true })
export class TherapistProfile extends Model<TherapistProfile> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'user_id' })
  userId: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'first_name' }) firstName: string;
  @Column({ type: DataType.STRING(100), allowNull: false, field: 'last_name' }) lastName: string;
  @Column({ type: DataType.STRING(40) }) phone?: string;
  @Column({ type: DataType.STRING(140), allowNull: false }) title: string;
  @Column({ type: DataType.STRING(180), allowNull: false, field: 'main_specialty' })
  mainSpecialty: string;
  @Column({ type: DataType.TEXT }) bio?: string;
  @Column({ type: DataType.TEXT, field: 'personal_phrase' }) personalPhrase?: string;
  @Column({ type: DataType.STRING(500), field: 'youtube_url' }) youtubeUrl?: string;
  @Column({ type: DataType.STRING(80), field: 'license_number' }) licenseNumber?: string;
  @Column({ type: DataType.STRING(80) }) country?: string;
  @Column({ type: DataType.STRING(120) }) city?: string;
  @Column({ type: DataType.DECIMAL(12, 2), field: 'base_session_price' }) baseSessionPrice?: number;
  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'PENDING',
    field: 'approval_status',
  })
  approvalStatus: string;
  @Column({ type: DataType.UUID, field: 'avatar_file_id' }) avatarFileId?: string;
  @BelongsTo(() => User) user?: User;
}
