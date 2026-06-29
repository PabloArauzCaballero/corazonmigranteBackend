import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/file.dto';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync('storage/tmp', { recursive: true });
          cb(null, 'storage/tmp');
        },
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}`),
      }),
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upload(user, dto, file);
  }

  @Get(':id/signed-url')
  signedUrl(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getDownloadInfo(user, id);
  }

  @Get(':id/download')
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.service.downloadLocal(user, id, response);
  }
}
