import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('admin/audit')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Permissions('audit:read')
  list(@Query() query: PaginationQueryDto) {
    return this.auditService.list(query);
  }
}
