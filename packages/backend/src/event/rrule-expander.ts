export interface RRuleParsed {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  byDay?: string[];    // ['MO', 'WE', 'FR']
  byMonthDay?: number[];
  interval?: number;
  count?: number;
  until?: Date;
}

export interface ExpandedInstance {
  instanceId: string;       // eventId:N (0-based index)
  eventId: string;
  originalStart: Date;
  originalEnd: Date;
  isRecurring: true;
}

export function parseRRule(rruleStr: string): RRuleParsed | null {
  if (!rruleStr) return null;

  const parts = rruleStr.split(';');
  const result: RRuleParsed = { freq: 'DAILY', interval: 1 };

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || value === undefined) continue;

    switch (key) {
      case 'FREQ':
        if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value)) {
          result.freq = value as RRuleParsed['freq'];
        }
        break;
      case 'BYDAY':
        result.byDay = value.split(',');
        break;
      case 'BYMONTHDAY':
        result.byMonthDay = value.split(',').map(Number);
        break;
      case 'INTERVAL':
        result.interval = parseInt(value) || 1;
        break;
      case 'COUNT':
        result.count = parseInt(value) || 0;
        break;
      case 'UNTIL': {
        // Formats: YYYYMMDDTHHMMSSZ or YYYYMMDD
        const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
        if (match) {
          result.until = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]), 23, 59, 59
          );
        }
        break;
      }
    }
  }
  return result;
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function expandRecurringEvents(
  event: {
    id: string;
    startTime: Date;
    endTime: Date;
    recurrence: string | null;
  },
  rangeStart: Date,
  rangeEnd: Date,
): ExpandedInstance[] {
  if (!event.recurrence) return [];

  const rrule = parseRRule(event.recurrence);
  if (!rrule) return [];

  const instances: ExpandedInstance[] = [];
  const duration = event.endTime.getTime() - event.startTime.getTime();
  const startMs = event.startTime.getTime();
  let count = 0;

  const maxIterations = (rrule.count || 366) + 1;

  // For WEEKLY with BYDAY
  if (rrule.freq === 'WEEKLY' && rrule.byDay && rrule.byDay.length > 0) {
    const targetDays = rrule.byDay.map((d) => DAY_MAP[d]).filter((d) => d !== undefined);
    if (targetDays.length === 0) return [];

    // Start from the week of the original event
    const current = new Date(event.startTime);
    current.setDate(current.getDate() - current.getDay()); // Go to Sunday of that week
    current.setHours(0, 0, 0, 0);

    let iterations = 0;
    while (iterations < maxIterations) {
      const weekStart = new Date(current);

      for (const dayNum of targetDays) {
        const instanceDate = new Date(weekStart);
        instanceDate.setDate(instanceDate.getDate() + dayNum);

        // Set the time to the original event's start time
        const instanceStart = new Date(instanceDate);
        instanceStart.setHours(
          event.startTime.getHours(),
          event.startTime.getMinutes(),
          event.startTime.getSeconds(),
        );
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        // Skip if before the original event's start
        if (instanceStart.getTime() < event.startTime.getTime()) continue;

        count++;
        if (rrule.count && count > rrule.count) break;
        if (rrule.until && instanceStart > rrule.until) break;

        // Check if within query range
        if (instanceStart <= rangeEnd && instanceEnd >= rangeStart) {
          instances.push({
            instanceId: `${event.id}:${count - 1}`,
            eventId: event.id,
            originalStart: instanceStart,
            originalEnd: instanceEnd,
            isRecurring: true,
          });
        }

        // If instance is past the range and we have no count limit, we can stop early
        if (!rrule.count && instanceStart > rangeEnd) {
          // Only break if we've gone past the end and there's no end condition
          if (!rrule.until) break;
        }
      }

      if (rrule.count && count >= rrule.count) break;
      if (rrule.until && new Date(current) > rrule.until) break;

      // If all instances are past rangeEnd and no count/until, stop
      if (!rrule.count && !rrule.until) {
        const nextWeek = new Date(current);
        nextWeek.setDate(nextWeek.getDate() + 7);
        if (nextWeek > rangeEnd && instances.length > 0) break;
      }

      current.setDate(current.getDate() + 7 * (rrule.interval || 1));
      iterations++;
    }
    return instances;
  }

  // For DAILY frequency
  if (rrule.freq === 'DAILY') {
    const current = new Date(event.startTime);
    let iterations = 0;

    while (iterations < maxIterations) {
      const instanceStart = new Date(current);
      const instanceEnd = new Date(instanceStart.getTime() + duration);

      // Skip the original event itself
      if (iterations > 0) {
        count++;
        if (rrule.count && count > rrule.count) break;

        if (instanceStart <= rangeEnd && instanceEnd >= rangeStart) {
          instances.push({
            instanceId: `${event.id}:r${count}`,
            eventId: event.id,
            originalStart: instanceStart,
            originalEnd: instanceEnd,
            isRecurring: true,
          });
        }
      }

      if (rrule.until && instanceStart > rrule.until) break;
      if (!rrule.count && !rrule.until && instanceStart > rangeEnd) break;

      current.setDate(current.getDate() + (rrule.interval || 1));
      iterations++;
    }
    return instances;
  }

  // For MONTHLY frequency
  if (rrule.freq === 'MONTHLY') {
    const current = new Date(event.startTime);
    const targetDay = event.startTime.getDate();
    let iterations = 0;

    while (iterations < maxIterations) {
      const instanceStart = new Date(current);
      instanceStart.setDate(Math.min(targetDay, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
      const instanceEnd = new Date(instanceStart.getTime() + duration);

      if (iterations > 0) {
        count++;
        if (rrule.count && count > rrule.count) break;

        if (instanceStart <= rangeEnd && instanceEnd >= rangeStart) {
          instances.push({
            instanceId: `${event.id}:r${count}`,
            eventId: event.id,
            originalStart: instanceStart,
            originalEnd: instanceEnd,
            isRecurring: true,
          });
        }
      }

      if (rrule.until && instanceStart > rrule.until) break;
      if (!rrule.count && !rrule.until && instanceStart > rangeEnd) break;

      current.setMonth(current.getMonth() + (rrule.interval || 1));
      iterations++;
    }
    return instances;
  }

  // For YEARLY frequency
  if (rrule.freq === 'YEARLY') {
    const current = new Date(event.startTime);
    let iterations = 0;

    while (iterations < maxIterations) {
      const instanceStart = new Date(current);
      const instanceEnd = new Date(instanceStart.getTime() + duration);

      if (iterations > 0) {
        count++;
        if (rrule.count && count > rrule.count) break;

        if (instanceStart <= rangeEnd && instanceEnd >= rangeStart) {
          instances.push({
            instanceId: `${event.id}:r${count}`,
            eventId: event.id,
            originalStart: instanceStart,
            originalEnd: instanceEnd,
            isRecurring: true,
          });
        }
      }

      if (rrule.until && instanceStart > rrule.until) break;
      if (!rrule.count && !rrule.until && instanceStart > rangeEnd) break;

      current.setFullYear(current.getFullYear() + (rrule.interval || 1));
      iterations++;
    }
    return instances;
  }

  return instances;
}
