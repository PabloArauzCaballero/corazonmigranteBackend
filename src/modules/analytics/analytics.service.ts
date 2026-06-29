import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PublicVisit, UiEvent } from '@/database/models';
import { sha256 } from '@/common/utils/hash.util';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { CreateUiEventDto } from './dto/ui-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(PublicVisit) private readonly visitModel: typeof PublicVisit,
    @InjectModel(UiEvent) private readonly eventModel: typeof UiEvent,
  ) {}
  trackVisit(input: { path: string; ip?: string; userAgent?: string; referrer?: string }) {
    return this.visitModel.create({
      path: input.path,
      ipHash: input.ip ? sha256(input.ip) : undefined,
      userAgentHash: input.userAgent ? sha256(input.userAgent) : undefined,
      referrer: input.referrer,
    } as any);
  }
  trackUiEvent(dto: CreateUiEventDto) {
    return this.eventModel.create({
      sessionId: dto.sessionId,
      eventName: dto.eventName,
      payload: dto.payload ?? {},
    } as any);
  }
  listEvents(query: PaginationQueryDto) {
    return this.eventModel
      .findAndCountAll({ ...toLimitOffset(query), order: [['createdAt', 'DESC']] })
      .then(({ rows, count }) => ({ items: rows, pagination: buildPagination(query, count) }));
  }
}
