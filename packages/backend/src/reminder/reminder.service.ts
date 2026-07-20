import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

export interface ReminderSuggestion {
  minutesBefore: number;
  label: string;
  reason: string;
}

@Injectable()
export class ReminderService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  suggestReminders(eventType: string, startTime: Date, location?: { name?: string }): ReminderSuggestion[] {
    const now = new Date();
    const hoursUntilEvent = (startTime.getTime() - now.getTime()) / 3600000;

    switch (eventType) {
      case 'TRAVEL':
        return [
          { minutesBefore: 1440, label: '1 天前', reason: '差旅准备提醒' },
          { minutesBefore: 120, label: '2 小时前', reason: '差旅出发提醒' },
          { minutesBefore: 30, label: '30 分钟前', reason: '确认行程' },
        ].filter(r => r.minutesBefore <= hoursUntilEvent * 60);

      case 'MEETING':
        return [
          { minutesBefore: 60, label: '1 小时前', reason: '会议准备' },
          { minutesBefore: 15, label: '15 分钟前', reason: '会议即将开始' },
        ].filter(r => r.minutesBefore <= hoursUntilEvent * 60);

      case 'TASK':
        return [
          { minutesBefore: 1440, label: '1 天前', reason: '任务截止提醒' },
          { minutesBefore: 60, label: '1 小时前', reason: '任务即将到期' },
        ].filter(r => r.minutesBefore <= hoursUntilEvent * 60);

      case 'PERSONAL':
      default:
        return [
          { minutesBefore: 60, label: '1 小时前', reason: '日程提醒' },
        ].filter(r => r.minutesBefore <= hoursUntilEvent * 60);
    }
  }

  async scheduleEventReminders(eventId: string, userId: string, eventType: string, startTime: Date, location?: any) {
    const suggestions = this.suggestReminders(eventType, startTime, location);
    const reminderConfig = suggestions.map(s => s.minutesBefore);

    // Store reminder config on the event
    await this.prisma.event.update({
      where: { id: eventId },
      data: { reminderConfig },
    });

    return suggestions;
  }

  async checkAndSendReminders() {
    const now = new Date();

    // Find events starting within the next 24 hours
    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        startTime: { gte: now, lte: new Date(now.getTime() + 86400000) },
        status: 'CONFIRMED',
        reminderConfig: { not: null },
      },
      include: { user: true, attendees: true },
    });

    const results: string[] = [];

    for (const event of upcomingEvents) {
      const config = event.reminderConfig as number[] | null;
      if (!config) continue;

      const msUntilEvent = event.startTime.getTime() - now.getTime();
      const minutesUntilEvent = Math.round(msUntilEvent / 60000);

      for (const reminderMinutes of config) {
        // Send reminder when within 1 minute of the target time
        const diff = Math.abs(minutesUntilEvent - reminderMinutes);
        if (diff <= 2) {
          // Send to owner
          await this.notificationService.create({
            userId: event.userId,
            type: 'event_reminder',
            title: `提醒: ${event.summary}`,
            content: `${event.summary} 将在 ${reminderMinutes} 分钟后开始`,
            relatedEventId: event.id,
          });

          // Send to attendees
          for (const attendee of event.attendees) {
            if (attendee.userId && attendee.userId !== event.userId) {
              await this.notificationService.create({
                userId: attendee.userId,
                type: 'event_reminder',
                title: `提醒: ${event.summary}`,
                content: `${event.summary} 将在 ${reminderMinutes} 分钟后开始`,
                relatedEventId: event.id,
              });
            }
          }

          results.push(`Reminder sent for ${event.summary} (${reminderMinutes}min before)`);
        }
      }
    }

    return { reminded: results.length, details: results };
  }
}
