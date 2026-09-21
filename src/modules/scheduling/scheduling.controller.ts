import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  AvailabilityQueryDto,
  CreateBlockedTimeDto,
  CreateScheduleDto,
  UpdateBlockedTimeDto,
  UpdateScheduleDto,
} from './dto/scheduling.dto';
import { SchedulingService } from './scheduling.service';

@ApiTags('Scheduling')
@ApiBearerAuth()
@Controller('therapists/me')
@Roles('THERAPIST')
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Get('schedules') list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMySchedules(user.sub);
  }

  @Get('schedules/:scheduleId') detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.getSchedule(user.sub, scheduleId);
  }

  @Post('schedules') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.service.createSchedule(user.sub, dto);
  }

  @Patch('schedules/:scheduleId') update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.service.updateSchedule(user.sub, scheduleId, dto);
  }

  @Delete('schedules/:scheduleId') remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.deleteSchedule(user.sub, scheduleId);
  }

  @Get('blocked-times') listBlocks(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listBlockedTimes(user.sub);
  }

  @Post('blocked-times') block(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockedTimeDto,
  ) {
    return this.service.createBlockedTime(user.sub, dto);
  }

  @Patch('blocked-times/:blockedTimeId') updateBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('blockedTimeId') blockedTimeId: string,
    @Body() dto: UpdateBlockedTimeDto,
  ) {
    return this.service.updateBlockedTime(user.sub, blockedTimeId, dto);
  }

  @Delete('blocked-times/:blockedTimeId') removeBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('blockedTimeId') blockedTimeId: string,
  ) {
    return this.service.deleteBlockedTime(user.sub, blockedTimeId);
  }
}

/**
 * Mismas operaciones, pero ejecutadas por administración sobre el terapeuta que
 * indique la URL. Es lo que necesita el panel de usuarios para corregir el horario
 * de una doctora sin pedirle que entre con su propia cuenta.
 */
@ApiTags('Admin Scheduling')
@ApiBearerAuth()
@Controller('admin/therapists/:therapistUserId')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminSchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Get('schedules') @Permissions('scheduling:read') async list(
    @Param('therapistUserId') therapistUserId: string,
  ) {
    await this.service.assertTherapistExists(therapistUserId);
    return this.service.listMySchedules(therapistUserId);
  }

  @Get('schedules/:scheduleId') @Permissions('scheduling:read') detail(
    @Param('therapistUserId') therapistUserId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.getSchedule(therapistUserId, scheduleId);
  }

  @Post('schedules') @Permissions('scheduling:write') async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    await this.service.assertTherapistExists(therapistUserId);
    return this.service.createSchedule(therapistUserId, dto, user.sub);
  }

  @Patch('schedules/:scheduleId') @Permissions('scheduling:write') update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.service.updateSchedule(therapistUserId, scheduleId, dto, user.sub);
  }

  @Delete('schedules/:scheduleId') @Permissions('scheduling:write') remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.deleteSchedule(therapistUserId, scheduleId, user.sub);
  }

  @Get('blocked-times') @Permissions('scheduling:read') async listBlocks(
    @Param('therapistUserId') therapistUserId: string,
  ) {
    await this.service.assertTherapistExists(therapistUserId);
    return this.service.listBlockedTimes(therapistUserId);
  }

  @Post('blocked-times') @Permissions('scheduling:write') async block(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Body() dto: CreateBlockedTimeDto,
  ) {
    await this.service.assertTherapistExists(therapistUserId);
    return this.service.createBlockedTime(therapistUserId, dto, user.sub);
  }

  @Patch('blocked-times/:blockedTimeId') @Permissions('scheduling:write') updateBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Param('blockedTimeId') blockedTimeId: string,
    @Body() dto: UpdateBlockedTimeDto,
  ) {
    return this.service.updateBlockedTime(therapistUserId, blockedTimeId, dto, user.sub);
  }

  @Delete('blocked-times/:blockedTimeId') @Permissions('scheduling:write') removeBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('therapistUserId') therapistUserId: string,
    @Param('blockedTimeId') blockedTimeId: string,
  ) {
    return this.service.deleteBlockedTime(therapistUserId, blockedTimeId, user.sub);
  }
}

@ApiTags('Booking')
@Controller('booking')
@Public()
export class BookingController {
  constructor(private readonly service: SchedulingService) {}
  @Get('availability') availability(@Query() query: AvailabilityQueryDto) {
    return this.service.getAvailability(query);
  }
}
