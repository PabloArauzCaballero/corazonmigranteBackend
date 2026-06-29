import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { HealthService } from './health.service';
@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly service: HealthService) {}
  @Get() check() {
    return this.service.check();
  }
}
