import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from './user.model';
import { AdsCampaignCreative } from './ads-campaign-creative.model';
import { AdsCampaignPlacement } from './ads-campaign-placement.model';
import { AdsCompany } from './ads-company.model';
import { AdsPlacement } from './ads-placement.model';

@Table({ tableName: 'ads_campaigns', underscored: true, timestamps: true, paranoid: true })
export class AdsCampaign extends Model<AdsCampaign> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => AdsCompany)
  @Column({ type: DataType.UUID, allowNull: false, field: 'company_id' })
  companyId: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'created_by_user_id' })
  createdByUserId?: string;

  @Column({ type: DataType.STRING(180), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'AWARENESS' })
  objective: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'DRAFT' })
  status: string;

  @Column({ type: DataType.DATE, allowNull: false, field: 'starts_at' })
  startsAt: Date;

  @Column({ type: DataType.DATE, allowNull: false, field: 'ends_at' })
  endsAt: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'budget_amount',
  })
  budgetAmount: string;

  @Column({ type: DataType.STRING(3), allowNull: false, defaultValue: 'BOB' })
  currency: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 100 })
  priority: number;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'STANDARD' })
  pacing: string;

  @Column({ type: DataType.TEXT })
  notes?: string;

  @BelongsTo(() => AdsCompany)
  company?: AdsCompany;

  @HasMany(() => AdsCampaignCreative)
  creatives?: AdsCampaignCreative[];

  @BelongsToMany(() => AdsPlacement, () => AdsCampaignPlacement)
  placements?: AdsPlacement[];
}
