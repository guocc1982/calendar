import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Post('api/v1/events/:id/share')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('id') id: string,
    @Body() body: { password?: string; expiresInDays?: number },
    @Request() req: any,
  ) {
    return this.shareService.createShare(id, req.user.id, body.password, body.expiresInDays);
  }

  @Get('api/v1/events/:id/shares')
  @UseGuards(JwtAuthGuard)
  list(@Request() req: any) {
    return this.shareService.listShares(req.user.id);
  }

  @Delete('api/v1/shared/events/:token')
  @UseGuards(JwtAuthGuard)
  revoke(@Param('token') token: string, @Request() req: any) {
    return this.shareService.revokeShare(token, req.user.id);
  }

  // Public endpoint - no auth required
  @Get('api/v1/shared/events/:token')
  getSharedEvent(@Param('token') token: string, @Query('password') password?: string) {
    return this.shareService.getSharedEvent(token, password);
  }
}
