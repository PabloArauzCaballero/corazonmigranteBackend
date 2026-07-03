import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AdsPlacement } from '@/database/models';
import { AuditService } from '../audit/audit.service';
import { CreateAdsPlacementDto, UpdateAdsPlacementDto } from './dto/placement.dto';
import { toAdsPlacementDto } from './mappers/advertising.mapper';

@Injectable()
export class AdvertisingPlacementsService {
  constructor(
    @InjectModel(AdsPlacement) private readonly placementModel: typeof AdsPlacement,
    private readonly audit: AuditService,
  ) {}

  async list(activeOnly = false) {
    const placements = await this.placementModel.findAll({
      where: activeOnly ? { isActive: true } : undefined,
      order: [['code', 'ASC']],
    });
    return placements.map(toAdsPlacementDto);
  }

  async create(actorUserId: string, dto: CreateAdsPlacementDto) {
    return this.placementModel.sequelize!.transaction(async (transaction) => {
      const placement = await this.placementModel.create(
        { ...dto, context: dto.context ?? 'HOME', isActive: dto.isActive ?? true } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.placement.create',
          entityType: 'AdsPlacement',
          entityId: placement.id,
          after: placement.toJSON(),
        },
        { transaction },
      );
      return toAdsPlacementDto(placement);
    });
  }

  async update(actorUserId: string, id: string, dto: UpdateAdsPlacementDto) {
    const placement = await this.find(id);
    const before = placement.toJSON();
    return placement.sequelize!.transaction(async (transaction) => {
      await placement.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'advertising.placement.update',
          entityType: 'AdsPlacement',
          entityId: placement.id,
          before,
          after: placement.toJSON(),
        },
        { transaction },
      );
      return toAdsPlacementDto(placement);
    });
  }

  async find(id: string) {
    const placement = await this.placementModel.findByPk(id);
    if (!placement) {
      throw new NotFoundException({
        code: 'ADS_PLACEMENT_NOT_FOUND',
        message: 'Placement no encontrado.',
      });
    }
    return placement;
  }
}
