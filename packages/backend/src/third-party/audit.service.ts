import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    appId: string;
    apiKeyId?: string;
    eventType: string;
    requestSummary?: string;
    ipAddress?: string;
    result: string;
  }) {
    return this.prisma.apiAuditLog.create({ data });
  }


  async findByTenant(tenantId: string, page = 1, limit = 20) {
    const apps = await this.prisma.thirdPartyApp.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const appIds = apps.map(a => a.id);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.apiAuditLog.findMany({
        where: { appId: { in: appIds } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiAuditLog.count({ where: { appId: { in: appIds } } }),
    ]);
    return { items, total, page, limit };
  }
  async findByApp(appId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.apiAuditLog.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiAuditLog.count({ where: { appId } }),
    ]);
    return { items, total, page, limit };
  };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.apiAuditLog.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiAuditLog.count({ where: { appId } }),
    ]);
    return { items, total, page, limit };
  }
}


