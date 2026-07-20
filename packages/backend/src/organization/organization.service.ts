import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(data: { tenantId: string; name: string; parentId?: string; managerId?: string }) {
    let level = 0;
    if (data.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: data.parentId } });
      level = (parent?.level ?? 0) + 1;
    }
    return this.prisma.organization.create({
      data: { ...data, level },
    });
  }

  async getTree(tenantId: string) {
    const orgs = await this.prisma.organization.findMany({
      where: { tenantId },
      include: { users: { select: { id: true, name: true, email: true } } },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });
    return this.buildTree(orgs, null);
  }

  private buildTree(orgs: any[], parentId: string | null): any[] {
    return orgs
      .filter((o) => o.parentId === parentId)
      .map((o) => ({ ...o, children: this.buildTree(orgs, o.id) }));
  }

  async findByTenant(tenantId: string) {
    return this.prisma.organization.findMany({
      where: { tenantId },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });
  }
}
