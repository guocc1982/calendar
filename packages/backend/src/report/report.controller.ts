import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('weekly')
  @UseGuards(JwtAuthGuard)
  getWeekly(@Request() req: any, @Query('weekStart') weekStart?: string) {
    return this.reportService.generateWeeklyReport(req.user.id, weekStart);
  }
}
