import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: "example.com" },
    update: {},
    create: {
      name: "示例企业",
      domain: "example.com",
      plan: "enterprise",
      features: { ai: true, thirdParty: true, teamCalendar: true },
    },
  });
  console.log("Tenant created:", tenant.name);

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "管理员",
      email: "admin@example.com",
      password: adminPassword,
      preferences: { timezone: "Asia/Shanghai", reminders: [15, 60] },
    },
  });
  console.log("Admin user created:", admin.email);

  // Create sample user
  const userPassword = await bcrypt.hash("user123", 10);
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "张三",
      email: "user@example.com",
      password: userPassword,
      preferences: { timezone: "Asia/Shanghai", reminders: [15] },
    },
  });
  console.log("Sample user created:", user.email);

  // Create system roles
  const roles = [
    { name: "超级管理员", permissions: { all: true }, isSystem: true },
    { name: "租户管理员", permissions: { tenant: ["read","write"], user: ["read","write"], event: ["read","write"] }, isSystem: true },
    { name: "普通员工", permissions: { event: ["read","write"] }, isSystem: true },
  ];
  for (const roleData of roles) {
    const role = await prisma.role.create({
      data: { tenantId: tenant.id, ...roleData },
    });
    console.log("Role created:", role.name);
  }

  // Create sample organization
  const org = await prisma.organization.create({
    data: { tenantId: tenant.id, name: "技术部", level: 0 },
  });
  console.log("Organization created:", org.name);

  // Update user's org
  await prisma.user.update({
    where: { id: user.id },
    data: { orgId: org.id },
  });

  // Create sample events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = [
    {
      summary: "Q3 产品评审",
      startTime: new Date(today.getTime() + 9 * 3600000),
      endTime: new Date(today.getTime() + 11 * 3600000),
      eventType: "MEETING",
      location: { name: "3F 大会议室" },
    },
    {
      summary: "午休",
      startTime: new Date(today.getTime() + 12 * 3600000),
      endTime: new Date(today.getTime() + 13 * 3600000),
      eventType: "PERSONAL",
    },
  ];
  for (const eventData of events) {
    await prisma.event.create({
      data: {
        ...eventData,
        tenantId: tenant.id,
        userId: user.id,
        createdBy: user.id,
      },
    });
  }
  console.log("Sample events created");
  console.log("Seed completed!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
