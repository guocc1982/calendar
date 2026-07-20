import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { EventModule } from './event/event.module';
import { NotificationModule } from './notification/notification.module';
import { ThirdPartyModule } from './third-party/third-party.module';
import { AiModule } from './ai/ai.module';
import { ShareModule } from './share/share.module';
import { MailModule } from './mail/mail.module';
import { AttachmentModule } from './attachment/attachment.module';
import { BotModule } from './bot/bot.module';
import { ReminderModule } from './reminder/reminder.module';
import { CalendarSyncModule } from './calendar-sync/calendar-sync.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    UserModule,
    OrganizationModule,
    EventModule,
    NotificationModule,
    ThirdPartyModule,
    AiModule,
    ReportModule,
    CalendarSyncModule,
    ReminderModule,
    BotModule,
    AttachmentModule,
    MailModule,
    ShareModule,
  ],
})
export class AppModule {}









