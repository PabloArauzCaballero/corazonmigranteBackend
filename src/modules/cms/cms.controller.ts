import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { CmsService } from './cms.service';
import {
  CreateElementDto,
  CreatePageDto,
  UpdateElementDto,
  UpdatePageDto,
} from './dto/cms.dto';

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

  @Get() @Permissions('cms:read') list(@Query() query: PaginationQueryDto) {
    return this.service.listPages(query);
  }

  @Get(':pageId') @Permissions('cms:read') detail(@Param('pageId') pageId: string) {
    return this.service.getPage(pageId);
  }

  @Post() @Permissions('cms:write') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePageDto,
  ) {
    return this.service.createPage(user.sub, dto);
  }

  @Patch(':pageId') @Permissions('cms:write') update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.service.updatePage(user.sub, pageId, dto);
  }

  @Delete(':pageId') @Permissions('cms:write') remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
  ) {
    return this.service.deletePage(user.sub, pageId);
  }

  @Get(':pageId/elements') @Permissions('cms:read') listElements(
    @Param('pageId') pageId: string,
  ) {
    return this.service.listElements(pageId);
  }

  @Get(':pageId/elements/:elementId') @Permissions('cms:read') elementDetail(
    @Param('pageId') pageId: string,
    @Param('elementId') elementId: string,
  ) {
    return this.service.getElement(pageId, elementId);
  }

  @Post(':pageId/elements') @Permissions('cms:write') addElement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Body() dto: CreateElementDto,
  ) {
    return this.service.addElement(user.sub, pageId, dto);
  }

  @Patch(':pageId/elements/:elementId') @Permissions('cms:write') updateElement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Param('elementId') elementId: string,
    @Body() dto: UpdateElementDto,
  ) {
    return this.service.updateElement(user.sub, pageId, elementId, dto);
  }

  @Delete(':pageId/elements/:elementId') @Permissions('cms:write') removeElement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pageId') pageId: string,
    @Param('elementId') elementId: string,
  ) {
    return this.service.deleteElement(user.sub, pageId, elementId);
  }
}
