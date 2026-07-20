import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    name: string;
    email: string;
    password?: string;
    orgId?: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('邮箱已存在');
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        orgId: data.orgId,
        phone: data.phone,
        preferences: { timezone: 'Asia/Shanghai', reminders: [15, 60] },
      },
      select: { id: true, name: true, email: true, tenantId: true, orgId: true },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, orgId: true, status: true },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, tenantId: true, orgId: true, status: true, preferences: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async update(id: string, data: { name?: string; phone?: string; orgId?: string }) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true } });
  }
}
