import {
  Controller, Get, Post, Delete, Param, Res, UseGuards, Request,
  UploadedFile, UseInterceptors, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1')
export class AttachmentController {
  constructor(private attachService: AttachmentService) {}

  @Post('events/:id/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.attachService.upload(id, req.user.id, file);
  }

  @Get('events/:id/attachments')
  @UseGuards(JwtAuthGuard)
  list(@Param('id') id: string) {
    return this.attachService.findByEvent(id);
  }

  @Get('attachments/:id')
  @UseGuards(JwtAuthGuard)
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.attachService.getFile(id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
      'Content-Length': file.fileSize.toString(),
    });
    return new StreamableFile(file.stream);
  }

  @Delete('attachments/:id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @Request() req: any) {
    return this.attachService.delete(id, req.user.id);
  }
}
