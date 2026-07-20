import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    if (!apiKey) throw new UnauthorizedException('缺少 API Key');
    if (!timestamp) throw new UnauthorizedException('缺少时间戳');

    // 检查时间戳是否在 5 分钟内（防重放）
    const now = Date.now();
    const reqTime = parseInt(timestamp);
    if (Math.abs(now - reqTime) > 300000) throw new UnauthorizedException('请求已过期');

    // 查找 API Key 对应的应用
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const app = await this.prisma.thirdPartyApp.findFirst({
      where: { apiKeyHash, status: 'active' },
      include: { tenant: true },
    });
    if (!app) throw new UnauthorizedException('API Key 无效');

    if (app.expiresAt && new Date() > app.expiresAt) {
      throw new UnauthorizedException('API Key 已过期');
    }

    // 校验签名
    const method = request.method;
    const path = request.originalUrl || request.url;
    const body = method === 'GET' ? '' : JSON.stringify(request.body || {});
    const expectedSig = crypto
      .createHmac('sha256', apiKey)
      .update(`${method}${path}${timestamp}${body}`)
      .digest('hex');

    if (signature && signature !== expectedSig) {
      throw new UnauthorizedException('签名验证失败');
    }

    // 设置租户上下文
    request.tenantId = app.tenantId;
    request.thirdPartyApp = app;
    return true;
  }
}

