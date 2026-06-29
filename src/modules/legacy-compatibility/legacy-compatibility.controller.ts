import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
@ApiTags('Legacy compatibility')
@Controller('legacy')
@Public()
export class LegacyCompatibilityController {
  @Get('status')
  status() {
    return {
      enabled: true,
      message:
        'Módulo temporal: usar /api/v1 nuevos. Las rutas legacy deben mapearse una por una antes de retirarse.',
      deprecatedHeaders: ['Deprecation', 'Sunset'],
    };
  }
}
