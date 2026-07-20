import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService, private mailService: MailService) {}

  async create(data: { userId: string; type: string; title: string; content?: string; relatedEventId?: string }) {
    const notification = await this.prisma.notification.create({ data });
    // 这里会触发 WebSocket 推送（由 NotificationGateway 处理）
    return notification;
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId }, data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false }, data: { isRead: true },
    });
  }

  async notifyEventCreated(event: any, attendees: any[]) {
    for (const attendee of attendees) {
      if (attendee.userId) {
        await this.create({
          userId: attendee.userId,
          type: 'event_invite',
          title: `日程邀请: ${event.summary}`,
          content: event.description,
          relatedEventId: event.id,
        });
        // Send email notification (async, non-blocking)
        const user = await this.prisma.user.findUnique({ where: { id: attendee.userId } });
        if (user?.email) {
          this.mailService.sendEventInvite(user.email, event.summary, event.startTime, '日程系统').catch(() => {});
        }
      }
    }
  }

  async sendReminders() {
    const now = new Date();
    // Find events starting within the next 60 minutes
    const upcoming = await this.prisma.event.findMany({
      where: {
        startTime: { gte: now, lte: new Date(now.getTime() + 3600000) },
        status: 'CONFIRMED',
      },
      include: { attendees: true, user: true },
    });

    for (const event of upcoming) {
      const diffMinutes = Math.round((event.startTime.getTime() - now.getTime()) / 60000);
      for (const attendee of event.attendees) {
        if (attendee.userId) {
          const user = await this.prisma.user.findUnique({ where: { id: attendee.userId } });
          if (user?.email) {
            this.mailService.sendReminder(user.email, event.summary, event.startTime, diffMinutes).catch(() => {});
          }
        }
      }
    }
    return { reminded: upcoming.length };
  }
}


