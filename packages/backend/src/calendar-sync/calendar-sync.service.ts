import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarSyncService {
  constructor(private prisma: PrismaService) {}

  async exportSingleEvent(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { user: { select: { name: true } } },
    });
    if (!event) return '';
    return this.generateIcs([event]);
  }

  async exportUserEvents(userId: string, startDate?: Date, endDate?: Date): Promise<string> {
    const where: any = { userId };
    if (startDate && endDate) {
      where.OR = [
        { startTime: { gte: startDate, lte: endDate } },
        { endTime: { gte: startDate, lte: endDate } },
      ];
    }
    const events = await this.prisma.event.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    });
    return this.generateIcs(events);
  }

  async exportTeamEvents(tenantId: string, userIds: string[], startDate: Date, endDate: Date): Promise<string> {
    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ startTime: 'asc' }, { userId: 'asc' }],
    });
    return this.generateIcs(events);
  }

  // Generate a subscription calendar token for WebCal
  async generateSubscriptionToken(userId: string): Promise<{ token: string; url: string }> {
    const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64url').substring(0, 32);
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    return {
      token,
      url: `${baseUrl}/api/v1/calendar/subscribe/${token}/ics`,
    };
  }

  // Get user events by subscription token (public endpoint)
  async getSubscriptionFeed(token: string): Promise<string | null> {
    // Token format: base64url(userId:timestamp)
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const userId = decoded.split(':')[0];
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return null;

      // Return events for the next 3 months
      const now = new Date();
      const end = new Date(now.getTime() + 90 * 86400000);
      return this.exportUserEvents(userId, now, end);
    } catch {
      return null;
    }
  }

  private generateIcs(events: any[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Richeng//Schedule//ZH',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:日程管理 - Richeng',
    ];

    for (const event of events) {
      const uid = `${event.id}@richeng`;
      const dtStart = this.formatIcsDate(event.startTime);
      const dtEnd = this.formatIcsDate(event.endTime);
      const summary = this.escapeIcsText(event.summary || '');
      const description = this.escapeIcsText(event.description || '');
      const location = event.location?.name ? this.escapeIcsText(event.location.name) : '';
      const organizer = event.user?.name ? this.escapeIcsText(event.user.name) : '';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${summary}`);
      if (description) lines.push(`DESCRIPTION:${description}`);
      if (location) lines.push(`LOCATION:${location}`);
      if (organizer) lines.push(`ORGANIZER:${organizer}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatIcsDate(date: Date): string {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeIcsText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
}
