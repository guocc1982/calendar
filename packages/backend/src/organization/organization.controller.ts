import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: { name: string; parentId?: string }, @Request() req: any) {
    return this.orgService.create({ ...data, tenantId: req.user.tenantId });
  }

  @Get('tree')
  @UseGuards(JwtAuthGuard)
  getTree(@Request() req: any) {
    return this.orgService.getTree(req.user.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any) {
    return this.orgService.findByTenant(req.user.tenantId);
  }
}
