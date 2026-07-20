import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; domain: string }) {
    const existing = await this.prisma.tenant.findUnique({
      where: { domain: data.domain },
    });
    if (existing) throw new ConflictException('租户域名已存在');
    return this.prisma.tenant.create({ data });
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('租户不存在');
    return tenant;
  }

  async findByDomain(domain: string) {
    return this.prisma.tenant.findUnique({ where: { domain } });
  }

  async update(id: string, data: { name?: string; plan?: string; status?: string }) {
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }
}
