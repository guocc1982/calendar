import { Controller, Get, Param, Query, Res, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { CalendarSyncService } from './calendar-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1')
export class CalendarSyncController {
  constructor(private syncService: CalendarSyncService) {}

  @Get('events/:id/export/ics')
  @UseGuards(JwtAuthGuard)
  async exportSingle(@Param('id') id: string, @Res() res: Response) {
    const ics = await this.syncService.exportSingleEvent(id);
    if (!ics) return res.status(404).json({ error: '日程不存在' });
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${id}.ics"`,
    });
    res.send(ics);
  }

  @Get('calendar/export/ics')
  @UseGuards(JwtAuthGuard)
  async exportCalendar(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const ics = await this.syncService.exportUserEvents(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return ics;
  }

  @Get('calendar/subscribe/token')
  @UseGuards(JwtAuthGuard)
  async generateToken(@Request() req: any) {
    return this.syncService.generateSubscriptionToken(req.user.id);
  }

  @Get('calendar/subscribe/:token/ics')
  async subscribeFeed(@Param('token') token: string, @Res() res: Response) {
    const ics = await this.syncService.getSubscriptionFeed(token);
    if (!ics) return res.status(404).json({ error: '无效的订阅令牌' });
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="richeng-calendar.ics"',
    });
    res.send(ics);
  }
}
