import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PaginationQueryDto } from '@/common/pagination/pagination.dto';
import { MessagingService } from './messaging.service';
import { SendTestEmailDto } from './dto/test-email.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller(['admin/messaging', 'admin/mensajeria'])
@Roles('ADMIN', 'SUPER_ADMIN')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('outbox')
  @Permissions('messaging:read')
  list(@Query() query: PaginationQueryDto) {
    return this.messagingService.list(query);
  }

  @Post('outbox/process')
  @Permissions('messaging:write')
  process() {
    return this.messagingService.processPending();
  }

  @Post('outbox/:id/process')
  @Permissions('messaging:write')
  processOne(@Param('id') id: string) {
    return this.messagingService.processOne(id);
  }

  @Post('test-email')
  @Permissions('messaging:write')
  enqueueTestEmail(@Body() dto: SendTestEmailDto) {
    return this.messagingService.enqueueTestEmail(dto);
  }
}
