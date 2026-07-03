import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { FileAsset } from './file-asset.model';
import { AdsCampaign } from './ads-campaign.model';

@Table({ tableName: 'ads_campaign_creatives', underscored: true, timestamps: true, paranoid: true })
export class AdsCampaignCreative extends Model<AdsCampaignCreative> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @ForeignKey(() => AdsCampaign)
  @Column({ type: DataType.UUID, allowNull: false, field: 'campaign_id' })
  campaignId: string;

  @ForeignKey(() => FileAsset)
  @Column({ type: DataType.UUID, field: 'file_id' })
  fileId?: string;

  @Column({ type: DataType.STRING(180), allowNull: false })
  title: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'IMAGE',
    field: 'media_type',
  })
  mediaType: string;

  @Column({ type: DataType.STRING(800), allowNull: false, field: 'asset_url' })
  assetUrl: string;

  @Column({ type: DataType.STRING(800), allowNull: false, field: 'destination_url' })
  destinationUrl: string;

  @Column({ type: DataType.STRING(220), allowNull: false, field: 'alt_text' })
  altText: string;

  @Column({ type: DataType.STRING(120), field: 'mime_type' })
  mimeType?: string;

  @Column({ type: DataType.INTEGER })
  width?: number;

  @Column({ type: DataType.INTEGER })
  height?: number;

  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0, field: 'size_bytes' })
  sizeBytes: number;

  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    defaultValue: 'APPROVED',
    field: 'approval_status',
  })
  approvalStatus: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_primary' })
  isPrimary: boolean;

  @BelongsTo(() => AdsCampaign)
  campaign?: AdsCampaign;
}
