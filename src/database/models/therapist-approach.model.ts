import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { TherapyApproach } from './therapy-approach.model';

@Table({ tableName: 'therapist_approaches', underscored: true, timestamps: false })
export class TherapistApproach extends Model<TherapistApproach> {
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'therapist_user_id' })
  therapistUserId: string;
  @ForeignKey(() => TherapyApproach)
  @Column({ type: DataType.UUID, primaryKey: true, field: 'approach_id' })
  approachId: string;
}
