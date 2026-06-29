import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { UsersService } from './users.service';
import { UpdatePatientProfileDto, UpdateTherapistProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.me(user.sub);
  }

  @Patch('me/patient-profile')
  @Roles('PATIENT')
  updatePatient(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePatientProfileDto) {
    return this.usersService.updatePatientProfile(user.sub, dto);
  }

  @Patch('me/therapist-profile')
  @Roles('THERAPIST')
  updateTherapist(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTherapistProfileDto) {
    return this.usersService.updateTherapistProfile(user.sub, dto);
  }

  @Get('admin/users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Permissions('users:read')
  list(@Query() query: PaginationQueryDto) {
    return this.usersService.list(query);
  }
}
