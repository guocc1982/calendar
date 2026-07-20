import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { EventService } from '../event/event.service';

@Module({
  controllers: [AiController],
  providers: [AiService, EventService],
  exports: [AiService],
})
export class AiModule {}
