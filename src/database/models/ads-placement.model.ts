import { BelongsToMany, Column, DataType, Model, Table } from 'sequelize-typescript';
import { AdsCampaign } from './ads-campaign.model';
import { AdsCampaignPlacement } from './ads-campaign-placement.model';

@Table({ tableName: 'ads_placements', underscored: true, timestamps: true, paranoid: true })
export class AdsPlacement extends Model<AdsPlacement> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @Column({ type: DataType.STRING(80), allowNull: false, unique: true })
  code: string;

  @Column({ type: DataType.STRING(140), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT })
  description?: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'HOME' })
  context: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' })
  isActive: boolean;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  dimensions: Record<string, unknown>;

  @BelongsToMany(() => AdsCampaign, () => AdsCampaignPlacement)
  campaigns?: AdsCampaign[];
}
