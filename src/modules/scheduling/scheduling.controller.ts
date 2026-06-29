import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  AvailabilityQueryDto,
  CreateBlockedTimeDto,
  CreateScheduleDto,
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
  @Post('schedules') create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.service.createSchedule(user.sub, dto);
  }
  @Post('blocked-times') block(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockedTimeDto,
  ) {
    return this.service.createBlockedTime(user.sub, dto);
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
