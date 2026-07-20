import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  async createShare(eventId: string, userId: string, password?: string, expiresInDays?: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('日程不存在');

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000)
      : null;

    const passwordHash = password
      ? crypto.createHash('sha256').update(password).digest('hex')
      : null;

    const share = await this.prisma.eventShare.create({
      data: {
        eventId,
        token,
        password: passwordHash,
        expiresAt,
        createdBy: userId,
      },
    });

    return {
      shareUrl: `${process.env.PUBLIC_URL || ''}/api/v1/shared/events/${token}`,
      token: share.token,
      expiresAt: share.expiresAt,
      passwordProtected: !!password,
    };
  }

  async getSharedEvent(token: string, password?: string) {
    const share = await this.prisma.eventShare.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!share) throw new NotFoundException('分享链接无效');
    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new NotFoundException('分享链接已过期');
    }

    if (share.password) {
      if (!password) throw new NotFoundException('需要密码');
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash !== share.password) throw new NotFoundException('密码错误');
    }

    return {
      summary: share.event.summary,
      description: share.event.description,
      startTime: share.event.startTime,
      endTime: share.event.endTime,
      timezone: share.event.timezone,
      location: share.event.location,
      organizer: share.event.user?.name || '未知',
      eventType: share.event.eventType,
    };
  }

  async listShares(userId: string) {
    return this.prisma.eventShare.findMany({
      where: { createdBy: userId },
      include: {
        event: { select: { summary: true, startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeShare(token: string, userId: string) {
    const share = await this.prisma.eventShare.findUnique({
      where: { token },
    });
    if (!share) throw new NotFoundException('分享不存在');
    if (share.createdBy !== userId) throw new NotFoundException('无权操作');

    await this.prisma.eventShare.delete({ where: { token } });
    return { success: true };
  }
}
