import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { HomepageQueryDto, UpdateHomepageLayoutDto } from './dto/homepage.dto';
import { HomepageService } from './homepage.service';

@ApiTags('Homepage pública')
@Public()
@Controller('homepage')
export class PublicHomepageController {
  constructor(private readonly homepage: HomepageService) {}

  @Get()
  getHomepage(@Query() query: HomepageQueryDto) {
    return this.homepage.getHomepage(query);
  }
}

@ApiTags('Administración de homepage')
@ApiBearerAuth()
@Controller('admin/homepage')
export class AdminHomepageController {
  constructor(private readonly homepage: HomepageService) {}

  @Get('preview')
  @Permissions('homepage:read')
  getPreview(@CurrentUser() user: AuthenticatedUser, @Query() query: HomepageQueryDto) {
    return this.homepage.getAdminPreview(query, user);
  }

  @Patch('layout')
  @Permissions('homepage:write')
  updateLayout(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateHomepageLayoutDto) {
    return this.homepage.updateLayout(user.sub, dto);
  }
}
