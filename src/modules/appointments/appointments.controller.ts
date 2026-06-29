import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Post() @Roles('PATIENT') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.service.create(user, dto);
  }
  @Get('mine') listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listMine(user, query);
  }
  @Patch(':id/status') updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }
  @Get('/admin/list') @Roles('ADMIN', 'SUPER_ADMIN') @Permissions('appointments:read') adminList(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.adminList(query);
  }
}
