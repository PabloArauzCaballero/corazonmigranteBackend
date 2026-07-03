import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { AdsCampaign } from './ads-campaign.model';
import { AdsPlacement } from './ads-placement.model';

@Table({ tableName: 'ads_campaign_placements', underscored: true, timestamps: false })
export class AdsCampaignPlacement extends Model<AdsCampaignPlacement> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => AdsCampaign)
  @Column({ type: DataType.UUID, allowNull: false, field: 'campaign_id' })
  campaignId: string;

  @ForeignKey(() => AdsPlacement)
  @Column({ type: DataType.UUID, allowNull: false, field: 'placement_id' })
  placementId: string;
}
