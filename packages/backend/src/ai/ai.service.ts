import { Injectable, Logger } from '@nestjs/common';

export interface ParsedEvent {
  summary: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  eventType?: string;
  location?: { name?: string };
  attendees?: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // LLM prompt template for schedule parsing
  private readonly SYSTEM_PROMPT = `你是一个日程解析助手。请从用户的自然语言输入中提取日程信息，返回结构化数据。

请提取以下字段：
- summary: 日程标题（必填）
- description: 详细描述（可选）
- startTime: ISO 8601 格式的开始时间（根据上下文推算日期）
- endTime: ISO 8601 格式的结束时间
- eventType: 事件类型，可选值：MEETING（会议）、TRAVEL（差旅）、PERSONAL（个人）、TASK（任务）
- location: 地点对象 { name: "地点名称" }（可选）

注意：
- 如果用户说"明天"，表示当前日期的第二天
- 如果用户说"下周三"，表示下周的星期三
- 时间格式如"下午2点"转换为 14:00
- 如果是全天事件，startTime 设置为当天 00:00，endTime 设置为当天 23:59
- 当前日期为 {currentDate}`;

  // Function Calling definition for structured output
  private readonly FUNCTION_DEFINITION = {
    name: 'createSchedule',
    description: '从自然语言中提取日程信息',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '日程标题' },
        description: { type: 'string', description: '详细描述' },
        startTime: { type: 'string', description: '开始时间（ISO 8601）' },
        endTime: { type: 'string', description: '结束时间（ISO 8601）' },
        eventType: { type: 'string', enum: ['MEETING', 'TRAVEL', 'PERSONAL', 'TASK'], description: '事件类型' },
        location: {
          type: 'object',
          properties: { name: { type: 'string', description: '地点名称' } },
          required: ['name'],
        },
        attendees: { type: 'array', items: { type: 'string' }, description: '参与者列表' },
      },
      required: ['summary'],
    },
  };

  async parseWithLLM(text: string): Promise<ParsedEvent> {
    const llmUrl = process.env.LLM_API_URL;
    const llmKey = process.env.LLM_API_KEY;
    const llmModel = process.env.LLM_MODEL || 'gpt-4o-mini';

    // If LLM is configured, call the API
    if (llmUrl && llmKey) {
      try {
        const prompt = this.SYSTEM_PROMPT.replace('{currentDate}', new Date().toLocaleDateString('zh-CN'));
        const response = await fetch(llmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmKey}`,
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: text },
            ],
            functions: [this.FUNCTION_DEFINITION],
            function_call: { name: 'createSchedule' },
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const functionCall = data.choices?.[0]?.message?.function_call;
          if (functionCall?.arguments) {
            const parsed = JSON.parse(functionCall.arguments);
            this.logger.log('LLM parsed event: ' + JSON.stringify(parsed));
            return {
              summary: parsed.summary || text,
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              eventType: parsed.eventType || 'PERSONAL',
              location: parsed.location,
              description: parsed.description,
              attendees: parsed.attendees,
            };
          }
        }
        this.logger.warn('LLM API returned unexpected response, falling back to rule-based parsing');
      } catch (err) {
        this.logger.error('LLM API call failed: ' + err + ', falling back to rule-based parsing');
      }
    }

    // Rule-based fallback
    return this.parseSchedule(text);
  }

  async parseSchedule(text: string): Promise<ParsedEvent> {
    this.logger.log('Rule-based parsing: ' + text);
    const result: ParsedEvent = { summary: '', eventType: 'PERSONAL' };

    // Extract time range
    const timeRangeMatch = text.match(
      /(\d{1,2})[点时:：](\d{0,2})[分]?(?:到|至|-|~)(\d{1,2})[点时:：](\d{0,2})[分]?/
    );
    if (timeRangeMatch) {
      const baseDate = this.resolveDateContext(text);
      const startH = parseInt(timeRangeMatch[1]);
      const startM = parseInt(timeRangeMatch[2] || '0');
      const endH = parseInt(timeRangeMatch[3]);
      const endM = parseInt(timeRangeMatch[4] || '0');
      const start = new Date(baseDate);
      start.setHours(startH, startM, 0, 0);
      result.startTime = start.toISOString();
      const end = new Date(baseDate);
      end.setHours(endH, endM, 0, 0);
      result.endTime = end.toISOString();
    }

    // Extract title
    let title = text
      .replace(/\d{1,2}[点时:：]\d{0,2}[分]?(?:到|至|-|~)\d{1,2}[点时:：]\d{0,2}[分]?/g, '')
      .replace(/^(?:明天|今日|今天|后天|下[周][一二三四五六日天])\s*/g, '')
      .replace(/^(?:上午|下午|早上|晚上)\s*/g, '')
      .replace(/地点.{2,20}(?:楼|层|会议室|办公室|大厦)/g, '')
      .trim();
    if (title) result.summary = title;
    if (!result.summary) result.summary = text;

    // Detect event type
    if (/会议|评审|讨论|同步|复盘|规划/.test(text)) result.eventType = 'MEETING';
    if (/出差|旅行|差旅|航班|酒店/.test(text)) result.eventType = 'TRAVEL';
    if (/休假|请假|年假|病假|调休/.test(text)) result.eventType = 'PERSONAL';
    if (/任务|待办|完成|交付/.test(text)) result.eventType = 'TASK';

    // Extract location
    const locMatch = text.match(/(?:地点|位置|在|位于)\s*(.{2,10}(?:楼|层|会议室|办公室|大厦|中心|厅|室))/);
    if (locMatch) result.location = { name: locMatch[1] };

    return result;
  }

  private resolveDateContext(text: string): Date {
    const now = new Date();
    if (text.includes('明天')) now.setDate(now.getDate() + 1);
    if (text.includes('后天')) now.setDate(now.getDate() + 2);
    now.setHours(0, 0, 0, 0);
    return now;
  }
}
