import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalEvents: number;
  totalHours: number;
  byType: { type: string; count: number; hours: number; percentage: number }[];
  dailyBreakdown: { date: string; dayName: string; count: number; hours: number; events: any[] }[];
  topEvents: any[];
}

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async generateWeeklyReport(userId: string, weekStartDate?: string): Promise<WeeklyReport> {
    // Calculate week range
    const weekStart = weekStartDate ? new Date(weekStartDate) : this.getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setMilliseconds(-1);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { gte: weekStart, lte: weekEnd } },
          { endTime: { gte: weekStart, lte: weekEnd } },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dailyMap = new Map<string, { date: string; dayName: string; count: number; hours: number; events: any[] }>();
    const typeMap = new Map<string, { count: number; hours: number }>();
    const typeLabels: Record<string, string> = {
      MEETING: '会议', TRAVEL: '差旅', PERSONAL: '个人', TASK: '任务', THIRD_PARTY: '第三方',
    };

    let totalHours = 0;
    const topEvents: any[] = [];

    for (const event of events) {
      const duration = (event.endTime.getTime() - event.startTime.getTime()) / 3600000;
      totalHours += duration;

      // Per-type stats
      const type = event.eventType || 'PERSONAL';
      if (!typeMap.has(type)) typeMap.set(type, { count: 0, hours: 0 });
      const t = typeMap.get(type)!;
      t.count++;
      t.hours += duration;

      // Daily breakdown
      const dayKey = event.startTime.toISOString().substring(0, 10);
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          date: dayKey,
          dayName: dayNames[event.startTime.getDay()],
          count: 0, hours: 0, events: [],
        });
      }
      const d = dailyMap.get(dayKey)!;
      d.count++;
      d.hours += duration;
      d.events.push({
        summary: event.summary,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: Math.round(duration * 100) / 100,
        type: typeLabels[type] || type,
      });

      // Top events by duration
      topEvents.push({
        summary: event.summary,
        duration: Math.round(duration * 100) / 100,
        type: typeLabels[type] || type,
        date: event.startTime.toISOString().substring(0, 10),
      });
    }

    // Sort daily breakdown
    const dailyBreakdown = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // Top 10 events by duration
    topEvents.sort((a, b) => b.duration - a.duration);
    const top10 = topEvents.slice(0, 10);

    // By-type percentages
    const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type: typeLabels[type] || type,
      count: data.count,
      hours: Math.round(data.hours * 100) / 100,
      percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
    }));

    return {
      weekStart: weekStart.toISOString().substring(0, 10),
      weekEnd: weekEnd.toISOString().substring(0, 10),
      totalEvents: events.length,
      totalHours: Math.round(totalHours * 100) / 100,
      byType,
      dailyBreakdown,
      topEvents: top10,
    };
  }

  private getCurrentWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
