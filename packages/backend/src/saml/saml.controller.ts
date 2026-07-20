import { Controller, Get, Post, Req, Res, Param } from '@nestjs/common';
import { Response } from 'express';

@Controller('api/v1/auth/saml')
export class SamlController {
  // SP Metadata endpoint - provides XML metadata for IdP configuration
  @Get('metadata/:tenantDomain')
  getMetadata(@Param('tenantDomain') tenantDomain: string, @Res() res: Response) {
    const entityId = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/v1/auth/saml/metadata/${tenantDomain}`;
    const acsUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/v1/auth/saml/acs/${tenantDomain}`;

    const metadata = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  }

  // Login initiation - redirects to IdP
  @Get('login/:tenantDomain')
  login(@Param('tenantDomain') tenantDomain: string, @Res() res: Response) {
    // In production, this would generate a SAML AuthnRequest and redirect to IdP
    // const authnRequest = ...;
    // const redirectUrl = `${idpSsoUrl}?SAMLRequest=${encodeURIComponent(authnRequest)}`;
    res.redirect(`/login?saml=${tenantDomain}`);
  }

  // ACS (Assertion Consumer Service) - receives SAML response from IdP
  @Post('acs/:tenantDomain')
  async acs(@Param('tenantDomain') tenantDomain: string, @Req() req: any, @Res() res: Response) {
    // In production:
    // 1. Parse SAML response
    // 2. Validate signature
    // 3. Extract user attributes (email, name)
    // 4. Find or create user
    // 5. Generate JWT token
    // 6. Redirect to frontend with token

    // TODO: Implement with passport-saml
    res.status(501).json({ error: 'SAML ACS not yet implemented. Install passport-saml and configure IdP.' });
  }
}
