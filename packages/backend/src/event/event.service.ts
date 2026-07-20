import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { expandRecurringEvents } from './rrule-expander';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    userId: string;
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    timezone?: string;
    allDay?: boolean;
    eventType?: string;
    location?: any;
    recurrence?: string;
    reminderConfig?: any;
    visibility?: string;
    metadata?: any;
    attendees?: { userId?: string; name?: string; email?: string; required?: boolean }[];
  }) {
    const event = await this.prisma.event.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone || 'Asia/Shanghai',
        allDay: data.allDay || false,
        eventType: (data.eventType as any) || 'PERSONAL',
        location: data.location || Prisma.DbNull,
        recurrence: data.recurrence,
        reminderConfig: data.reminderConfig || Prisma.DbNull,
        visibility: (data.visibility as any) || 'PUBLIC',
        metadata: data.metadata || Prisma.DbNull,
        createdBy: data.userId,
        attendees: data.attendees?.length
          ? { create: data.attendees.map((a) => ({ userId: a.userId, name: a.name, email: a.email, required: a.required ?? true })) }
          : undefined,
      },
      include: { attendees: true },
    });
    return event;
  }

  async findByUserId(userId: string, startDate?: Date, endDate?: Date) {
    // Fetch events: those within date range + those with recurrence that might expand into range
    const where: any = { userId };
    if (startDate && endDate) {
      where.OR = [
        { startTime: { gte: startDate, lte: endDate } },
        { endTime: { gte: startDate, lte: endDate } },
        { startTime: { lte: startDate }, endTime: { gte: endDate } },
        // Include all recurring events (will be expanded below)
        { recurrence: { not: null }, startTime: { lte: endDate } },
      ];
    }
    const events = await this.prisma.event.findMany({
      where,
      include: { attendees: true },
      orderBy: { startTime: 'asc' },
    });

    if (!startDate || !endDate) return events;

    // Expand recurring events
    const expanded: any[] = [];
    for (const event of events) {
      if (event.recurrence) {
        const instances = expandRecurringEvents(
          { id: event.id, startTime: event.startTime, endTime: event.endTime, recurrence: event.recurrence },
          startDate,
          endDate,
        );
        for (const inst of instances) {
          expanded.push({
            ...event,
            id: inst.instanceId,
            startTime: inst.originalStart,
            endTime: inst.originalEnd,
            isRecurringInstance: true,
            recurringEventId: event.id,
          });
        }
      }
    }

    // Combine non-recurring events (already filtered by date) + expanded instances
    const nonRecurring = events.filter((e) => !e.recurrence);
    // Filter non-recurring events by date range
    const filtered = nonRecurring.filter((e) => {
      return e.startTime >= startDate || e.endTime >= startDate;
    });
    const combined = [...filtered, ...expanded].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    return combined;
  }

  async findByTenantAndTimeRange(tenantId: string, startDate: Date, endDate: Date) {
    return this.prisma.event.findMany({
      where: {
        tenantId,
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
          { startTime: { lte: startDate }, endTime: { gte: endDate } },
        ],
      },
      include: { attendees: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { attendees: true, comments: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!event) throw new NotFoundException('日程不存在');
    return event;
  }

  async update(id: string, data: any) {
    await this.findById(id);
    const { attendees, ...eventData } = data;
    return this.prisma.event.update({
      where: { id },
      data: eventData,
      include: { attendees: true },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.eventComment.deleteMany({ where: { eventId: id } });
    await this.prisma.eventAttendee.deleteMany({ where: { eventId: id } });
    return this.prisma.event.delete({ where: { id } });
  }

  async checkConflicts(tenantId: string, userId: string, startTime: Date, endTime: Date, excludeEventId?: string) {
    const where: any = {
      tenantId,
      userId,
      status: 'CONFIRMED',
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };
    if (excludeEventId) {
      where.id = { not: excludeEventId };
    }
    return this.prisma.event.findMany({
      where,
      select: { id: true, summary: true, startTime: true, endTime: true },
    });
  }

  // Third-party event push (upsert by ext_source + ext_event_id)
  async upsertExternal(data: {
    tenantId: string;
    userId: string;
    extSource: string;
    extEventId: string;
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    timezone?: string;
    location?: any;
    attendees?: any[];
    metadata?: any;
  }) {
    const existing = await this.prisma.event.findUnique({
      where: { extSource_extEventId: { extSource: data.extSource, extEventId: data.extEventId } },
    });

    if (existing) {
      return this.prisma.event.update({
        where: { id: existing.id },
        data: {
          summary: data.summary,
          description: data.description,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
          location: data.location || Prisma.DbNull,
          metadata: data.metadata || Prisma.DbNull,
          eventType: 'THIRD_PARTY',
        },
      });
    }

    return this.prisma.event.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        summary: data.summary,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone || 'Asia/Shanghai',
        location: data.location || Prisma.DbNull,
        metadata: data.metadata || Prisma.DbNull,
        extSource: data.extSource,
        extEventId: data.extEventId,
        eventType: 'THIRD_PARTY',
        createdBy: data.userId,
      },
    });
  }


  async getTeamEvents(tenantId: string, userIds: string[], startDate: Date, endDate: Date, viewerId: string) {
    // Fetch events: those within date range + recurring events that might expand
    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
          { startTime: { lte: startDate }, endTime: { gte: endDate } },
          { recurrence: { not: null }, startTime: { lte: endDate } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        attendees: true,
      },
      orderBy: [{ startTime: 'asc' }, { userId: 'asc' }],
    });

    // Expand recurring events
    const expanded: any[] = [];
    for (const event of events) {
      if (event.recurrence) {
        const instances = expandRecurringEvents(
          { id: event.id, startTime: event.startTime, endTime: event.endTime, recurrence: event.recurrence },
          startDate,
          endDate,
        );
        for (const inst of instances) {
          expanded.push({
            ...event,
            id: inst.instanceId,
            startTime: inst.originalStart,
            endTime: inst.originalEnd,
            isRecurringInstance: true,
            recurringEventId: event.id,
          });
        }
      }
    }

    // Filter visibility on original events (non-recurring)
    const nonRecurring = events.filter((e) => !e.recurrence).filter((e) => {
      if (e.visibility === 'PUBLIC') return true;
      if (e.visibility === 'PRIVATE' && e.userId === viewerId) return true;
      if (e.attendees?.some((a) => a.userId === viewerId)) return true;
      return false;
    });

    // Filter recurring originals by date range
    const recurringOriginals = events.filter((e) => e.recurrence).filter((e) => {
      if (e.userId !== viewerId && e.visibility === 'PRIVATE') return false;
      if (e.visibility === 'PUBLIC') return true;
      // For attendees: only show original if within date range
      if (startDate && endDate) {
        return (e.startTime >= startDate && e.startTime <= endDate) ||
               (e.endTime >= startDate && e.endTime <= endDate);
      }
      return true;
    });

    const combined = [...nonRecurring, ...recurringOriginals, ...expanded].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    return combined;
  }
  async getBusySlots(tenantId: string, userIds: string[], startDate: Date, endDate: Date) {
    return this.prisma.event.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
        status: 'CONFIRMED',
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
        ],
      },
      select: { userId: true, summary: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });
  }
}



