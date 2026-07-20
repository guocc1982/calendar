import { Injectable, Logger } from '@nestjs/common';

export interface MailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: any = null;
  private initialized = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    try {
      // Dynamic require to avoid crash if nodemailer not installed
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
      this.initialized = true;
      this.logger.log('Mail transporter initialized');
    } catch (err) {
      this.logger.warn('Nodemailer not available, emails will be logged. Install: npm install nodemailer');
    }
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      this.logger.log(`[MOCK] Would send email to: ${options.to}`);
      this.logger.log(`[MOCK] Subject: ${options.subject}`);
      this.logger.log(`[MOCK] Body: ${options.text || options.html?.substring(0, 100)}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"日程管理" <noreply@richeng.local>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email: ${err}`);
      return false;
    }
  }

  async sendEventInvite(email: string, eventSummary: string, startTime: Date, organizerName: string) {
    return this.sendMail({
      to: email,
      subject: `日程邀请: ${eventSummary}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>日程邀请</h2>
          <p><strong>主题：</strong>${eventSummary}</p>
          <p><strong>时间：</strong>${startTime.toLocaleString('zh-CN')}</p>
          <p><strong>组织者：</strong>${organizerName}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">由 Richeng 日程管理系统自动发送</p>
        </div>
      `,
    });
  }

  async sendReminder(email: string, eventSummary: string, startTime: Date, minutesBefore: number) {
    return this.sendMail({
      to: email,
      subject: `[提醒] ${eventSummary} 将在 ${minutesBefore} 分钟后开始`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>日程提醒</h2>
          <p><strong>${eventSummary}</strong> 将在 ${minutesBefore} 分钟后开始</p>
          <p><strong>时间：</strong>${startTime.toLocaleString('zh-CN')}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">由 Richeng 日程管理系统自动发送</p>
        </div>
      `,
    });
  }
}
