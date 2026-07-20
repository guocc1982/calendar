import { Injectable, Logger } from '@nestjs/common';

export type BotPlatform = 'wechat' | 'dingtalk' | 'feishu';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  async sendMessage(
    platform: BotPlatform,
    webhookUrl: string,
    title: string,
    content: string,
    eventUrl?: string,
  ): Promise<boolean> {
    try {
      const payload = this.buildPayload(platform, title, content, eventUrl);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        this.logger.log(`Bot message sent to ${platform}: ${title}`);
        return true;
      }
      this.logger.error(`Bot send failed: ${response.status} ${await response.text()}`);
      return false;
    } catch (err) {
      this.logger.error(`Bot send error: ${err}`);
      return false;
    }
  }

  private buildPayload(platform: BotPlatform, title: string, content: string, eventUrl?: string) {
    const text = `${title}\n\n${content}`;
    const linkText = eventUrl ? `\n\n[查看详情](${eventUrl})` : '';

    switch (platform) {
      case 'wechat':
        return {
          msgtype: 'markdown',
          markdown: { content: `# ${title}\n${content}${linkText}` },
        };

      case 'dingtalk':
        return {
          msgtype: 'markdown',
          markdown: {
            title: title.substring(0, 20),
            text: `# ${title}\n${content}${linkText}`,
          },
        };

      case 'feishu':
        return {
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: title } },
            elements: [
              { tag: 'markdown', content: content + (linkText || '') },
            ],
          },
        };

      default:
        return { msgtype: 'text', text: { content: text } };
    }
  }

  async sendEventNotification(
    platform: BotPlatform,
    webhookUrl: string,
    eventSummary: string,
    startTime: Date,
    description?: string,
  ) {
    const content = [
      `时间：${startTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      description ? `描述：${description}` : '',
    ].filter(Boolean).join('\n');

    return this.sendMessage(platform, webhookUrl, `新日程: ${eventSummary}`, content);
  }
}
