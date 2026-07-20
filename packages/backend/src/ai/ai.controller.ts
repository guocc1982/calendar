import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventService } from '../event/event.service';

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private eventService: EventService,
  ) {}

  @Post('parse')
  @UseGuards(JwtAuthGuard)
  async parseText(@Body('text') text: string) {
    if (!text) return { error: '缺少文本' };
    return this.aiService.parseWithLLM(text);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createFromText(@Body('text') text: string, @Request() req: any) {
    if (!text) return { error: '缺少文本' };
    const parsed = await this.aiService.parseWithLLM(text);
    if (!parsed.startTime || !parsed.endTime) {
      return { error: '未能解析出时间', parsed };
    }
    const event = await this.eventService.create({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      summary: parsed.summary,
      description: text,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      eventType: parsed.eventType || 'PERSONAL',
      location: parsed.location,
    });
    return { event, parsed };
  }
}
