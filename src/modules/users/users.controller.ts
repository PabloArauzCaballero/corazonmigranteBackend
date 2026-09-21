import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { UsersService } from './users.service';
import { UpdatePatientProfileDto, UpdateTherapistProfileDto } from './dto/update-profile.dto';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateAvatarDto,
  AdminUpdateUserDto,
  AdminUpdateUserStatusDto,
  AdminUsersQueryDto,
} from './dto/admin-users.dto';

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
}

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  list(@Query() query: AdminUsersQueryDto) {
    return this.usersService.list(query);
  }

  /**
   * Declarado antes que `:userId`: si fuese al revés, Nest resolvería `/patients`
   * como un identificador de usuario y devolvería siempre 404.
   */
  @Get('patients')
  @Permissions('users:read')
  listPatients(@Query() query: PaginationQueryDto) {
    return this.usersService.listPatients(query);
  }

  @Get(':userId')
  @Permissions('users:read')
  detail(@Param('userId') userId: string) {
    return this.usersService.getUser(userId);
  }

  @Post()
  @Permissions('users:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdminCreateUserDto) {
    return this.usersService.createUser(user.sub, dto);
  }

  @Patch(':userId')
  @Permissions('users:write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.updateUser(user.sub, userId, dto);
  }

  @Patch(':userId/status')
  @Permissions('users:write')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(user.sub, userId, dto);
  }

  @Patch(':userId/therapist-profile')
  @Permissions('users:write')
  updateTherapistProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateTherapistProfileDto,
  ) {
    return this.usersService.updateTherapistProfileByAdmin(user.sub, userId, dto);
  }

  @Patch(':userId/patient-profile')
  @Permissions('users:write')
  updatePatientProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.usersService.updatePatientProfileByAdmin(user.sub, userId, dto);
  }

  @Patch(':userId/avatar')
  @Permissions('users:write')
  updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateAvatarDto,
  ) {
    return this.usersService.updateAvatar(user.sub, userId, dto);
  }

  @Post(':userId/password')
  @Permissions('users:write')
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.usersService.resetPasswordByAdmin(user.sub, userId, dto);
  }

  @Delete(':userId')
  @Permissions('users:write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('userId') userId: string) {
    return this.usersService.deleteUser(user.sub, userId);
  }
}
