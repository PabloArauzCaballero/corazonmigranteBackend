import {
  Column,
  DataType,
  Model,
  Table,
  BelongsToMany,
  HasOne,
  HasMany,
} from 'sequelize-typescript';
import { Role } from './role.model';
import { UserRole } from './user-role.model';
import { PatientProfile } from './patient-profile.model';
import { TherapistProfile } from './therapist-profile.model';
import { AdminProfile } from './admin-profile.model';
import { RefreshToken } from './refresh-token.model';

@Table({ tableName: 'users', underscored: true, timestamps: true, paranoid: true })
export class User extends Model<User> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;
  @Column({ type: DataType.STRING(180), allowNull: false, unique: true }) email: string;
  @Column({ type: DataType.STRING(255), allowNull: false, field: 'password_hash' })
  passwordHash: string;
  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' }) status: string;
  @Column({ type: DataType.DATE, field: 'email_verified_at' }) emailVerifiedAt?: Date;
  @Column({ type: DataType.DATE, field: 'last_login_at' }) lastLoginAt?: Date;

  @BelongsToMany(() => Role, () => UserRole) roles?: Role[];
  @HasOne(() => PatientProfile) patientProfile?: PatientProfile;
  @HasOne(() => TherapistProfile) therapistProfile?: TherapistProfile;
  @HasOne(() => AdminProfile) adminProfile?: AdminProfile;
  @HasMany(() => RefreshToken) refreshTokens?: RefreshToken[];
}
