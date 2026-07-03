import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { ContentCategory } from './content-category.model';
import { ContentPublication } from './content-publication.model';
import { AdsCampaign } from './ads-campaign.model';

@Table({ tableName: 'ads_campaign_content_targets', underscored: true, timestamps: true })
export class AdsCampaignContentTarget extends Model<AdsCampaignContentTarget> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => AdsCampaign)
  @Column({ type: DataType.UUID, allowNull: false, field: 'campaign_id' })
  campaignId: string;

  @ForeignKey(() => ContentPublication)
  @Column({ type: DataType.UUID, field: 'publication_id' })
  publicationId?: string;

  @ForeignKey(() => ContentCategory)
  @Column({ type: DataType.UUID, field: 'category_id' })
  categoryId?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'INCLUDE',
    field: 'targeting_mode',
  })
  targetingMode: string;

  @Column({ type: DataType.TEXT })
  reason?: string;
}
