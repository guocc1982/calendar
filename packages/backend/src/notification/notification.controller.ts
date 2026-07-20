import { Controller, Get, Patch, Post, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private notifService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any, @Param('page') page = 1) {
    return this.notifService.findByUser(req.user.id, page);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notifService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@Request() req: any) {
    return this.notifService.markAllAsRead(req.user.id);
  }

  @Post('send-reminders')
  @UseGuards(JwtAuthGuard)
  sendReminders() {
    return this.notifService.sendReminders();
  }
}
