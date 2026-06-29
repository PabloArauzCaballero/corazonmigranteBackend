import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { AccountingService } from './accounting.service';
import {
  CreateAccountDto,
  CreateAccountGroupDto,
  CreateCostCenterDto,
  CreateTransactionDto,
} from './dto/accounting.dto';
@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('admin/accounting')
@Roles('ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}
  @Get('account-groups') @Permissions('accounting:read') listGroups(
    @Query() q: PaginationQueryDto,
  ) {
    return this.service.listGroups(q);
  }
  @Post('account-groups') @Permissions('accounting:write') createGroup(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: CreateAccountGroupDto,
  ) {
    return this.service.createGroup(u.sub, dto);
  }
  @Get('accounts') @Permissions('accounting:read') listAccounts(@Query() q: PaginationQueryDto) {
    return this.service.listAccounts(q);
  }
  @Post('accounts') @Permissions('accounting:write') createAccount(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ) {
    return this.service.createAccount(u.sub, dto);
  }
  @Post('cost-centers') @Permissions('accounting:write') createCostCenter(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: CreateCostCenterDto,
  ) {
    return this.service.createCostCenter(u.sub, dto);
  }
  @Post('transactions') @Permissions('accounting:write') createTransaction(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.service.createTransaction(u.sub, dto);
  }
}
