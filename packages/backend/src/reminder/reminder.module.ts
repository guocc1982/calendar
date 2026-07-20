import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  providers: [ReminderService, NotificationService],
  exports: [ReminderService],
})
export class ReminderModule {}
