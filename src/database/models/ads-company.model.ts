import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { AdsCampaign } from './ads-campaign.model';

@Table({ tableName: 'ads_companies', underscored: true, timestamps: true, paranoid: true })
export class AdsCompany extends Model<AdsCompany> {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true }) id: string;

  @Column({ type: DataType.STRING(180), allowNull: false, field: 'business_name' })
  businessName: string;

  @Column({ type: DataType.STRING(180), allowNull: false, field: 'commercial_name' })
  commercialName: string;

  @Column({ type: DataType.STRING(40), field: 'tax_id' })
  taxId?: string;

  @Column({ type: DataType.STRING(180), field: 'contact_name' })
  contactName?: string;

  @Column({ type: DataType.STRING(180), field: 'contact_email' })
  contactEmail?: string;

  @Column({ type: DataType.STRING(40), field: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'ACTIVE' })
  status: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata: Record<string, unknown>;

  @HasMany(() => AdsCampaign)
  campaigns?: AdsCampaign[];
}
