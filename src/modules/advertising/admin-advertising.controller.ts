import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { AdvertisingCampaignsService } from './advertising-campaigns.service';
import { AdvertisingCompaniesService } from './advertising-companies.service';
import { AdvertisingCreativesService } from './advertising-creatives.service';
import { AdvertisingPlacementsService } from './advertising-placements.service';
import { AdvertisingQueryDto } from './dto/advertising-query.dto';
import {
  CreateAdsCampaignDto,
  SetAdsCampaignStatusDto,
  UpdateAdsCampaignDto,
} from './dto/campaign.dto';
import { CreateAdsCompanyDto, UpdateAdsCompanyDto } from './dto/company.dto';
import { CreateAdsCreativeDto, UpdateAdsCreativeDto } from './dto/creative.dto';
import { CreateAdsPlacementDto, UpdateAdsPlacementDto } from './dto/placement.dto';

@ApiTags('Administración de publicidad')
@ApiBearerAuth()
@Controller('admin/advertising')
export class AdminAdvertisingController {
  constructor(
    private readonly campaigns: AdvertisingCampaignsService,
    private readonly companies: AdvertisingCompaniesService,
    private readonly creatives: AdvertisingCreativesService,
    private readonly placements: AdvertisingPlacementsService,
  ) {}

  @Get('companies')
  @Permissions('advertising:read')
  listCompanies() {
    return this.companies.list();
  }

  @Post('companies')
  @Permissions('advertising:write')
  createCompany(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdsCompanyDto) {
    return this.companies.create(user.sub, dto);
  }

  @Patch('companies/:id')
  @Permissions('advertising:write')
  updateCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdsCompanyDto,
  ) {
    return this.companies.update(user.sub, id, dto);
  }

  @Get('placements')
  @Permissions('advertising:read')
  listPlacements() {
    return this.placements.list();
  }

  @Post('placements')
  @Permissions('advertising:write')
  createPlacement(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdsPlacementDto) {
    return this.placements.create(user.sub, dto);
  }

  @Patch('placements/:id')
  @Permissions('advertising:write')
  updatePlacement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdsPlacementDto,
  ) {
    return this.placements.update(user.sub, id, dto);
  }

  @Get('campaigns')
  @Permissions('advertising:read')
  listCampaigns(@Query() query: AdvertisingQueryDto) {
    return this.campaigns.list(query);
  }

  @Post('campaigns')
  @Permissions('advertising:write')
  createCampaign(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdsCampaignDto) {
    return this.campaigns.create(user.sub, dto);
  }

  @Get('campaigns/:id')
  @Permissions('advertising:read')
  getCampaign(@Param('id') id: string) {
    return this.campaigns.get(id);
  }

  @Patch('campaigns/:id')
  @Permissions('advertising:write')
  updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdsCampaignDto,
  ) {
    return this.campaigns.update(user.sub, id, dto);
  }

  @Post('campaigns/:id/status')
  @Permissions('advertising:write')
  setCampaignStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetAdsCampaignStatusDto,
  ) {
    return this.campaigns.setStatus(user.sub, id, dto);
  }

  @Get('campaigns/:campaignId/creatives')
  @Permissions('advertising:read')
  listCreatives(@Param('campaignId') campaignId: string) {
    return this.creatives.list(campaignId);
  }

  @Post('campaigns/:campaignId/creatives')
  @Permissions('advertising:write')
  createCreative(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateAdsCreativeDto,
  ) {
    return this.creatives.create(user.sub, campaignId, dto);
  }

  @Patch('creatives/:id')
  @Permissions('advertising:write')
  updateCreative(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdsCreativeDto,
  ) {
    return this.creatives.update(user.sub, id, dto);
  }
}
