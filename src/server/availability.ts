export type RuleType =
  | 'ONLY_DAYS'
  | 'MAX_DAYS_WEEK'
  | 'MAX_HOURS_DAY'
  | 'EARLIEST'
  | 'LATEST'
  | 'NOT_BEFORE_VACATION'
  | 'WEEK_RHYTHM'
  | 'NOTE';

// days leer oder fehlend heißt: gilt an jedem Tag.
export interface Rule {
  type: RuleType;
  days?: number[];
  value?: string | number;
}

export interface RuleContext {
  weekday: number;
  start: string;
  end: string;
  netHours: number;
  weekDayCount: number;
  // Nur bei echten Tagen bekannt, in der Standardwoche des Dienstplans nicht.
  weekNumber?: number;
  beforeVacation?: boolean;
}

// hard: an diesem Tag wird gar keine Schicht aus dem Dienstplan erzeugt.
export interface RuleIssue {
  text: string;
  hard: boolean;
}

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const isTime = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function parseRules(raw: unknown): Rule[] {
  try {
    return JSON.parse(typeof raw === 'string' ? raw : '[]');
  } catch {
    return [];
  }
}

export function ruleIssues(rules: Rule[], ctx: RuleContext): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const day = DAY_NAMES[ctx.weekday];

  for (const rule of rules) {
    const applies = !rule.days?.length || rule.days.includes(ctx.weekday);
    switch (rule.type) {
      case 'ONLY_DAYS':
        if (!applies) issues.push({ text: `arbeitet nicht am ${day}`, hard: true });
        break;
      case 'MAX_DAYS_WEEK':
        if (ctx.weekDayCount > Number(rule.value)) issues.push({ text: `höchstens ${rule.value} Tage pro Woche`, hard: false });
        break;
      case 'MAX_HOURS_DAY':
        if (applies && ctx.netHours > Number(rule.value)) issues.push({ text: `höchstens ${rule.value} Std. am ${day}`, hard: false });
        break;
      case 'EARLIEST':
        if (applies && ctx.start < String(rule.value)) issues.push({ text: `${day} frühestens ab ${rule.value} Uhr`, hard: false });
        break;
      case 'LATEST':
        if (applies && ctx.end > String(rule.value)) issues.push({ text: `${day} spätestens bis ${rule.value} Uhr`, hard: false });
        break;
      case 'NOT_BEFORE_VACATION':
        if (applies && ctx.beforeVacation) issues.push({ text: `${day} nicht direkt vor dem Urlaub`, hard: true });
        break;
      case 'WEEK_RHYTHM':
        if (applies && ctx.weekNumber !== undefined && (ctx.weekNumber % 2 === 0) !== (rule.value === 'EVEN')) {
          issues.push({ text: `arbeitet nur in ${rule.value === 'EVEN' ? 'geraden' : 'ungeraden'} Kalenderwochen`, hard: true });
        }
        break;
      case 'NOTE':
        break;
    }
  }
  return issues;
}

export function sanitizeRules(input: unknown): Rule[] | null {
  if (!Array.isArray(input) || input.length > 30) return null;

  const clean: Rule[] = [];
  for (const raw of input) {
    const days = raw?.days ?? [];
    if (!Array.isArray(days) || !days.every(d => [1, 2, 3, 4, 5].includes(d))) return null;
    const value = raw?.value;

    switch (raw?.type) {
      case 'ONLY_DAYS':
        if (days.length === 0) return null;
        clean.push({ type: raw.type, days });
        break;
      case 'MAX_DAYS_WEEK':
        if (!Number.isInteger(value) || value < 1 || value > 5) return null;
        clean.push({ type: raw.type, value });
        break;
      case 'MAX_HOURS_DAY':
        if (typeof value !== 'number' || !(value > 0 && value <= 12)) return null;
        clean.push({ type: raw.type, days, value });
        break;
      case 'EARLIEST':
      case 'LATEST':
        if (!isTime(value)) return null;
        clean.push({ type: raw.type, days, value });
        break;
      case 'NOT_BEFORE_VACATION':
        clean.push({ type: raw.type, days });
        break;
      case 'WEEK_RHYTHM':
        if (value !== 'EVEN' && value !== 'ODD') return null;
        clean.push({ type: raw.type, days, value });
        break;
      case 'NOTE':
        if (typeof value !== 'string' || !value.trim() || value.length > 200) return null;
        clean.push({ type: raw.type, value: value.trim() });
        break;
      default:
        return null;
    }
  }
  return clean;
}
