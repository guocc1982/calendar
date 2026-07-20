import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AttachmentService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(eventId: string, userId: string, file: Express.Multer.File) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('日程不存在');

    // Save file to disk
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Save metadata to DB
    return this.prisma.attachment.create({
      data: {
        eventId,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: fileName,
      },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.attachment.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true, eventId: true },
    });
  }

  async getFile(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('文件不存在');

    const filePath = path.join(this.uploadDir, attachment.filePath);
    if (!fs.existsSync(filePath)) throw new NotFoundException('文件已丢失');

    return {
      stream: fs.createReadStream(filePath),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    };
  }

  async delete(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('文件不存在');
    if (attachment.userId !== userId) throw new NotFoundException('无权删除');

    // Delete from disk
    const filePath = path.join(this.uploadDir, attachment.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Delete from DB
    return this.prisma.attachment.delete({ where: { id } });
  }
}
