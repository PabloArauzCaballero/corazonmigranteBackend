import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AdvertisingPlacementsService } from './advertising-placements.service';
import { AdvertisingPublicService } from './advertising-public.service';
import { PublicAdSlotsQueryDto } from './dto/advertising-query.dto';

@ApiTags('Publicidad pública')
@Public()
@Controller('advertising')
export class PublicAdvertisingController {
  constructor(
    private readonly publicAds: AdvertisingPublicService,
    private readonly placements: AdvertisingPlacementsService,
  ) {}

  @Get('slots')
  getSlots(@Query() query: PublicAdSlotsQueryDto) {
    return this.publicAds.getSlots(query);
  }

  @Get('placements')
  listPlacements() {
    return this.placements.list(true);
  }
}
