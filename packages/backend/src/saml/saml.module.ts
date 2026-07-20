import { Module } from '@nestjs/common';
import { SamlController } from './saml.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SamlController],
})
export class SamlModule {}
