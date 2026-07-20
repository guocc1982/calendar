import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, Req, UseGuards, Request } from '@nestjs/common';
import { ThirdPartyService } from './third-party.service';
import { AuditService } from './audit.service';
import { AuditService } from './audit.service';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// === 第三方推送接口（受 API Key 保护） ===
@Controller('api/v1/external')
export class ExternalController {
  constructor(
    private tpService: ThirdPartyService,
    private auditService: AuditService,
  ) {}

  @UseGuards(ApiKeyGuard)
  @Post('events')
  async pushEvent(@Body() body: any, @Req() req: any) {
    const result = await this.tpService.pushEvent({ ...body, tenantId: req.tenantId });
    await this.auditService.log({
      appId: req.thirdPartyApp.id,
      eventType: 'push_event',
      requestSummary: `推送日程: ${body.summary}`, result: 'success',
    });
    return result;
  }

  @UseGuards(ApiKeyGuard)
  @Post('events/batch')
  async pushBatch(@Body() body: { source: string; events: any[] }, @Req() req: any) {
    return this.tpService.pushBatch(req.tenantId, body.source, body.events);
  }

  @UseGuards(ApiKeyGuard)
  @Put('events/:id')
  async updateEvent(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.tpService.pushEvent({ ...body, eventId: id, tenantId: req.tenantId });
  }

  @UseGuards(ApiKeyGuard)
  @Delete('events/:id')
  async deleteEvent(@Param('id') id: string, @Req() req: any) {
    const source = req.headers['x-source'] || req.thirdPartyApp.appName;
    return this.tpService.deleteEvent(req.tenantId, source, id);
  }

  @UseGuards(ApiKeyGuard)
  @Post('events/sync')
  async syncEvents(@Body() body: { source: string; events: any[] }, @Req() req: any) {
    return this.tpService.syncEvents(req.tenantId, body.source, body.events);
  }

  @UseGuards(ApiKeyGuard)
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

// === 内部管理接口（受 JWT 保护） ===
@Controller('api/v1/admin/third-party')
export class ThirdPartyAdminController {
  constructor(private tpService: ThirdPartyService, private auditService: AuditService) {}


  @UseGuards(JwtAuthGuard)
  @Get('audit-logs')
  async getAuditLogs(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.auditService.findByApp(req.user.tenantId, page, limit);
  }
  @UseGuards(JwtAuthGuard)
  @Post('apps')
  registerApp(@Body() body: { appName: string; ipWhitelist?: string[]; allowedEventTypes?: string[] }, @Request() req: any) {
    return this.tpService.registerApp({ ...body, tenantId: req.user.tenantId, createdBy: req.user.id });
  }


  @UseGuards(JwtAuthGuard)
  @Get('audit-logs')
  async getAuditLogs(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.auditService.findByApp(req.user.tenantId, page, limit);
  }
  @UseGuards(JwtAuthGuard)
  @Get('apps')
  listApps(@Request() req: any) {
    return this.tpService.listApps(req.user.tenantId);
  }


  @UseGuards(JwtAuthGuard)
  @Get('audit-logs')
  async getAuditLogs(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.auditService.findByApp(req.user.tenantId, page, limit);
  }
  @UseGuards(JwtAuthGuard)
  @Post('apps/:id/revoke')
  revokeApp(@Param('id') id: string, @Request() req: any) {
    return this.tpService.revokeApp(id, req.user.tenantId);
  }
}


