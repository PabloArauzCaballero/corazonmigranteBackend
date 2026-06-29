import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { AnalyticsService } from './analytics.service';
import { CreateUiEventDto } from './dto/ui-event.dto';
@ApiTags('Analytics')
@Controller('analytics')
@Public()
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Post('ui-events') track(@Body() dto: CreateUiEventDto) {
    return this.service.trackUiEvent(dto);
  }
}
@ApiTags('Admin Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('ui-events') @Permissions('analytics:read') list(@Query() q: PaginationQueryDto) {
    return this.service.listEvents(q);
  }
}
