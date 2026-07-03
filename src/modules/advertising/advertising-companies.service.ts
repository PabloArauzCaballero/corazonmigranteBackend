import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AdsCompany } from '@/database/models';
import { AuditService } from '../audit/audit.service';
import { CreateAdsCompanyDto, UpdateAdsCompanyDto } from './dto/company.dto';
import { toAdsCompanyDto } from './mappers/advertising.mapper';

@Injectable()
export class AdvertisingCompaniesService {
  constructor(
    @InjectModel(AdsCompany) private readonly companyModel: typeof AdsCompany,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const companies = await this.companyModel.findAll({ order: [['commercialName', 'ASC']] });
    return companies.map(toAdsCompanyDto);
  }

  async create(actorUserId: string, dto: CreateAdsCompanyDto) {
    return this.companyModel.sequelize!.transaction(async (transaction) => {
      const company = await this.companyModel.create(
        { ...dto, status: dto.status ?? 'ACTIVE' } as any,
        {
          transaction,
        },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.company.create',
          entityType: 'AdsCompany',
          entityId: company.id,
          after: company.toJSON(),
        },
        { transaction },
      );
      return toAdsCompanyDto(company);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateAdsCompanyDto) {
    const company = await this.find(id);
    const before = company.toJSON();
    return company.sequelize!.transaction(async (transaction) => {
      await company.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.company.update',
          entityType: 'AdsCompany',
          entityId: company.id,
          before,
          after: company.toJSON(),
        },
        { transaction },
      );
      return toAdsCompanyDto(company);
    });
  }

  async find(id: string) {
    const company = await this.companyModel.findByPk(id);
    if (!company) {
      throw new NotFoundException({
        code: 'ADS_COMPANY_NOT_FOUND',
        message: 'Empresa anunciante no encontrada.',
      });
    }
    return company;
  }
}
