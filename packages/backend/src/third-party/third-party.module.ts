import { Module } from '@nestjs/common';
import { ThirdPartyService } from './third-party.service';
import { AuditService } from './audit.service';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalController, ThirdPartyAdminController } from './third-party.controller';
import { EventService } from '../event/event.service';

@Module({
  controllers: [ExternalController, ThirdPartyAdminController],
  providers: [ThirdPartyService, AuditService, ApiKeyGuard, EventService],
  exports: [ThirdPartyService, AuditService],
})
export class ThirdPartyModule {}

