import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ContentAuthorsService } from './content-authors.service';
import { ContentPublicationsService } from './content-publications.service';
import { ContentTaxonomyService } from './content-taxonomy.service';
import { CreateContentAuthorDto, UpdateContentAuthorDto } from './dto/author.dto';
import { ContentPublicationQueryDto } from './dto/content-query.dto';
import {
  CreateContentPublicationDto,
  SchedulePublicationDto,
  UpdateContentPublicationDto,
} from './dto/publication.dto';
import {
  CreateContentCategoryDto,
  CreateContentTagDto,
  UpdateContentCategoryDto,
} from './dto/taxonomy.dto';

@ApiTags('Administración de contenido')
@ApiBearerAuth()
@Controller('admin/content')
export class AdminContentController {
  constructor(
    private readonly authors: ContentAuthorsService,
    private readonly publications: ContentPublicationsService,
    private readonly taxonomy: ContentTaxonomyService,
  ) {}

  @Get('publications')
  @Permissions('content:read')
  listPublications(@Query() query: ContentPublicationQueryDto) {
    return this.publications.listAdmin(query);
  }

  @Post('publications')
  @Permissions('content:write')
  createPublication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContentPublicationDto,
  ) {
    return this.publications.create(user.sub, dto);
  }

  @Get('publications/:id')
  @Permissions('content:read')
  getPublication(@Param('id') id: string) {
    return this.publications.getAdmin(id);
  }

  @Patch('publications/:id')
  @Permissions('content:write')
  updatePublication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentPublicationDto,
  ) {
    return this.publications.update(user.sub, id, dto);
  }

  @Post('publications/:id/publish')
  @Permissions('content:write')
  publishPublication(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.publications.publish(user.sub, id);
  }

  @Post('publications/:id/schedule')
  @Permissions('content:write')
  schedulePublication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SchedulePublicationDto,
  ) {
    return this.publications.schedule(user.sub, id, dto);
  }

  @Post('publications/:id/archive')
  @Permissions('content:write')
  archivePublication(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.publications.archive(user.sub, id);
  }

  @Get('categories')
  @Permissions('content:read')
  listCategories() {
    return this.taxonomy.listCategories();
  }

  @Post('categories')
  @Permissions('content:write')
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContentCategoryDto) {
    return this.taxonomy.createCategory(user.sub, dto);
  }

  @Patch('categories/:id')
  @Permissions('content:write')
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentCategoryDto,
  ) {
    return this.taxonomy.updateCategory(user.sub, id, dto);
  }

  @Get('tags')
  @Permissions('content:read')
  listTags() {
    return this.taxonomy.listTags();
  }

  @Post('tags')
  @Permissions('content:write')
  createTag(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContentTagDto) {
    return this.taxonomy.createTag(user.sub, dto);
  }

  @Get('authors')
  @Permissions('content:read')
  listAuthors() {
    return this.authors.list();
  }

  @Post('authors')
  @Permissions('content:write')
  createAuthor(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContentAuthorDto) {
    return this.authors.create(user.sub, dto);
  }

  @Patch('authors/:id')
  @Permissions('content:write')
  updateAuthor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentAuthorDto,
  ) {
    return this.authors.update(user.sub, id, dto);
  }
}
