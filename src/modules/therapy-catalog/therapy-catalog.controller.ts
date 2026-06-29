import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { TherapyCatalogService } from './therapy-catalog.service';
import {
  CreateApproachDto,
  CreateProductDto,
  UpdateApproachDto,
  UpdateProductDto,
} from './dto/therapy.dto';

@ApiTags('Therapy public catalog')
@Controller('therapy')
@Public()
export class TherapyCatalogController {
  constructor(private readonly service: TherapyCatalogService) {}
  @Get('approaches') listApproaches(@Query() query: PaginationQueryDto) {
    return this.service.listPublicApproaches(query);
  }
  @Get('products') listProducts(@Query() query: PaginationQueryDto) {
    return this.service.listProducts(query, true);
  }
}

@ApiTags('Admin therapy catalog')
@ApiBearerAuth()
@Controller('admin/therapy')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTherapyCatalogController {
  constructor(private readonly service: TherapyCatalogService) {}
  @Get('approaches') @Permissions('therapy:read') listApproaches(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listApproaches(query);
  }
  @Post('approaches') @Permissions('therapy:write') createApproach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApproachDto,
  ) {
    return this.service.createApproach(user.sub, dto);
  }
  @Patch('approaches/:id') @Permissions('therapy:write') updateApproach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateApproachDto,
  ) {
    return this.service.updateApproach(user.sub, id, dto);
  }
  @Get('products') @Permissions('therapy:read') listProducts(@Query() query: PaginationQueryDto) {
    return this.service.listProducts(query);
  }
  @Post('products') @Permissions('therapy:write') createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.createProduct(user.sub, dto);
  }
  @Patch('products/:id') @Permissions('therapy:write') updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.updateProduct(user.sub, id, dto);
  }
  @Delete('products/:id') @Permissions('therapy:write') deleteProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteProduct(user.sub, id);
  }
}
