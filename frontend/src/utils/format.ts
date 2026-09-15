import dayjs from 'dayjs';

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateTime(value: string): string {
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = startDate || '开始时间';
  const end = endDate || '至今';
  return `${start} - ${end}`;
}

export function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function fromLines(lines: string[]): string {
  return lines.join('\n');
}

