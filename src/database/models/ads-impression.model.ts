import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
import { ContentPublication } from './content-publication.model';
import { AdsCampaignCreative } from './ads-campaign-creative.model';

@Table({ tableName: 'ads_impressions', underscored: true, timestamps: false })
export class AdsImpression extends Model<AdsImpression> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => AdsCampaignCreative)
  @Column({ type: DataType.UUID, allowNull: false, field: 'creative_id' })
  creativeId: string;

  @ForeignKey(() => ContentPublication)
  @Column({ type: DataType.UUID, field: 'publication_id' })
  publicationId?: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'user_id' })
  userId?: string;

  @Column({ type: DataType.STRING(80), field: 'placement_code' })
  placementCode?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'rendered_at',
  })
  renderedAt: Date;
}
