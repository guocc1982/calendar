import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: any, @Request() req: any) {
    return this.eventService.create({ ...data, tenantId: req.user.tenantId, userId: req.user.id });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.eventService.findByUserId(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('conflicts')
  @UseGuards(JwtAuthGuard)
  checkConflicts(
    @Request() req: any,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.eventService.checkConflicts(
      req.user.tenantId,
      req.user.id,
      new Date(startTime),
      new Date(endTime),
      excludeId,
    );
  }


  @Get('team')
  @UseGuards(JwtAuthGuard)
  getTeamEvents(
    @Request() req: any,
    @Query('userIds') userIds: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.eventService.getTeamEvents(
      req.user.tenantId,
      userIds.split(','),
      new Date(startDate),
      new Date(endDate),
      req.user.id,
    );
  }
  @Get('busy')
  @UseGuards(JwtAuthGuard)
  getBusySlots(
    @Request() req: any,
    @Query('userIds') userIds: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.eventService.getBusySlots(
      req.user.tenantId,
      userIds.split(','),
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.eventService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.eventService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string) {
    return this.eventService.delete(id);
  }
}

