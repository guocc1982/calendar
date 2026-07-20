import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../event/event.service';
import { AuditService } from './audit.service';
import * as crypto from 'crypto';

@Injectable()
export class ThirdPartyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private auditService: AuditService,
  ) {}

  async registerApp(data: {
    tenantId: string;
    appName: string;
    ipWhitelist?: string[];
    allowedEventTypes?: string[];
    rateLimit?: number;
    createdBy: string;
  }) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const app = await this.prisma.thirdPartyApp.create({
      data: {
        tenantId: data.tenantId,
        appName: data.appName,
        apiKeyHash,
        ipWhitelist: data.ipWhitelist || null,
        allowedEventTypes: data.allowedEventTypes || null,
        rateLimit: data.rateLimit || 100,
        createdBy: data.createdBy,
      },
    });
    return { ...app, apiKey };
  }

  async revokeApp(id: string, tenantId: string) {
    const app = await this.prisma.thirdPartyApp.findUnique({ where: { id } });
    if (!app || app.tenantId !== tenantId) throw new NotFoundException('应用不存在');
    return this.prisma.thirdPartyApp.update({ where: { id }, data: { status: 'revoked' } });
  }

  async listApps(tenantId: string) {
    return this.prisma.thirdPartyApp.findMany({
      where: { tenantId },
      select: { id: true, appName: true, status: true, rateLimit: true, expiresAt: true, createdAt: true },
    });
  }

  async pushEvent(data: {
    tenantId: string;
    eventId: string;
    source: string;
    eventType: string;
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    timezone?: string;
    location?: any;
    organizer?: { userId: string; name: string };
    attendees?: any[];
    recurrence?: string;
    reminders?: number[];
    visibility?: string;
    metadata?: any;
  }) {
    if (!data.summary) throw new BadRequestException('缺少日程标题');
    if (!data.startTime || !data.endTime) throw new BadRequestException('缺少起止时间');

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('时间格式无效');
    }
    if (endTime <= startTime) throw new BadRequestException('结束时间必须晚于开始时间');

    // 查找或创建用户
    let userId = data.organizer?.userId;
    if (!userId) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId: data.tenantId }, orderBy: { createdAt: 'asc' },
      });
      if (!user) throw new BadRequestException('租户下无可用用户');
      userId = user.id;
    }

    const event = await this.eventService.upsertExternal({
      tenantId: data.tenantId,
      userId,
      extSource: data.source,
      extEventId: data.eventId,
      summary: data.summary,
      description: data.description,
      startTime,
      endTime,
      timezone: data.timezone || 'Asia/Shanghai',
      location: data.location,
      attendees: data.attendees,
      metadata: data.metadata,
    });

    return event;
  }

  async pushBatch(tenantId: string, source: string, events: any[]) {
    const results = [];
    for (const evt of events) {
      try {
        const result = await this.pushEvent({ ...evt, tenantId, source });
        results.push({ success: true, eventId: evt.eventId, data: result });
      } catch (err) {
        results.push({ success: false, eventId: evt.eventId, error: err.message });
      }
    }
    return { total: events.length, success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  async syncEvents(tenantId: string, source: string, events: any[]) {
    // 全量同步：先清除该来源的所有事件，再批量推送
    await this.prisma.event.deleteMany({
      where: { tenantId, extSource: source, eventType: 'THIRD_PARTY' },
    });
    return this.pushBatch(tenantId, source, events);
  }

  async deleteEvent(tenantId: string, source: string, extEventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { extSource_extEventId: { extSource: source, extEventId } },
    });
    if (!event) throw new NotFoundException('日程不存在');
    await this.eventService.delete(event.id);
    return { success: true };
  }
}

