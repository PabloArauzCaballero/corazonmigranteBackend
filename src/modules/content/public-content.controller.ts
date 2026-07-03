import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ContentPublicationsService } from './content-publications.service';
import { ContentTaxonomyService } from './content-taxonomy.service';
import { PublicContentQueryDto } from './dto/content-query.dto';

@ApiTags('Publicaciones públicas')
@Public()
@Controller('publications')
export class PublicContentController {
  constructor(
    private readonly publications: ContentPublicationsService,
    private readonly taxonomy: ContentTaxonomyService,
  ) {}

  @Get('news')
  listNews(@Query() query: PublicContentQueryDto) {
    return this.publications.listPublic(query, 'NEWS');
  }

  @Get('columns')
  listColumns(@Query() query: PublicContentQueryDto) {
    return this.publications.listPublic(query, 'COLUMN');
  }

  @Get('news/:slug')
  getNews(@Param('slug') slug: string) {
    return this.publications.getPublicBySlug(slug);
  }

  @Get('columns/:slug')
  getColumn(@Param('slug') slug: string) {
    return this.publications.getPublicBySlug(slug);
  }

  @Get('categories')
  listCategories() {
    return this.taxonomy.listCategories(true);
  }

  @Get('tags')
  listTags() {
    return this.taxonomy.listTags();
  }
}
