import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { CmsService } from './cms.service';
import { CreateElementDto, CreatePageDto } from './dto/cms.dto';

@ApiTags('Public CMS')
@Controller('public/pages')
@Public()
export class CmsController {
  constructor(private readonly service: CmsService) {}
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.service.getPublicPage(slug);
  }
}

@ApiTags('Admin CMS')
@ApiBearerAuth()
@Controller('admin/cms/pages')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminCmsController {
  constructor(private readonly service: CmsService) {}
  @Post() @Permissions('cms:write') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePageDto,
  ) {
    return this.service.createPage(user.sub, dto);
  }
  @Post(':pageId/elements') @Permissions('cms:write') addElement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateElementDto,
  ) {
    return this.service.addElement(user.sub, pageId, dto);
  }
}
