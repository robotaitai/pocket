import type { ChatIntent, ChatQueryPlan } from './types.js';
import { currentMonth, lastMonth, lastNMonths, parsePeriodToken } from './periods.js';

const CATEGORY_KEYWORDS = [
  'groceries', 'dining', 'transport', 'health', 'utilities',
  'entertainment', 'shopping', 'education', 'banking', 'savings', 'income', 'transfer', 'other',
];

interface PatternRule {
  pattern: RegExp;
  intent: ChatIntent;
  extract: (m: RegExpMatchArray) => Record<string, string | number | null>;
  humanReadable: (m: RegExpMatchArray) => string;
}

const PATTERNS: PatternRule[] = [
  // "how much did I spend on groceries this month"
  {
    pattern: /(?:how much did i spend on|spending on|total (?:for|on))\s+(\w+)(?:\s+(this month|last month|last \d+ months?))?/i,
    intent: 'category_spend',
    extract: (m) => ({
      category: m[1]!.toLowerCase(),
      period: m[2] ?? 'this month',
    }),
    humanReadable: (m) => `Spending on ${m[1]} for ${m[2] ?? 'this month'}`,
  },
  // "compare this month to last month"
  {
    pattern: /compare\s+(this month|last month)\s+(?:to|with|vs\.?)\s+(this month|last month)/i,
    intent: 'period_comparison',
    extract: (m) => ({ period1: m[1]!.toLowerCase(), period2: m[2]!.toLowerCase() }),
    humanReadable: (m) => `Compare ${m[1]} vs ${m[2]}`,
  },
  // "what recurring payments do I have" / "what subscriptions"
  {
    pattern: /(?:what|show me|list)(?:\s+\w+)*\s+(?:recurring payments?|subscriptions?)/i,
    intent: 'recurring_list',
    extract: () => ({}),
    humanReadable: () => 'Recurring payments',
  },
  // "what new merchants appeared" / "suspicious charges"
  {
    pattern: /(?:new merchants?|suspicious charges?|unfamiliar|unknown merchants?)/i,
    intent: 'new_merchants',
    extract: () => ({ days: 30 }),
    humanReadable: () => 'New merchants in the last 30 days',
  },
  // "how much did I spend at [merchant]"
  {
    pattern: /how much did i spend at\s+(.+?)(?:\s+in\s+(.+))?$/i,
    intent: 'merchant_history',
    extract: (m) => ({ merchant: m[1]!.trim(), period: m[2] ?? 'last 3 months' }),
    humanReadable: (m) => `Spend at ${m[1]} in ${m[2] ?? 'last 3 months'}`,
  },
  // "largest expenses" / "biggest transactions"
  {
    pattern: /(?:largest|biggest|top)\s+(?:non-recurring\s+)?expenses?/i,
    intent: 'largest_expenses',
    extract: () => ({ limit: 10 }),
    humanReadable: () => 'Largest expenses',
  },
  // "top merchants" / "where do I spend most"
  {
    pattern: /(?:top merchants?|where do i spend|biggest merchants?)/i,
    intent: 'top_merchants',
    extract: () => ({ limit: 10 }),
    humanReadable: () => 'Top merchants by spend',
  },
  // "what is my income this month"
  {
    pattern: /(?:what is my|show my|total)\s+income(?:\s+(this month|last month|last \d+ months?))?/i,
    intent: 'income_summary',
    extract: (m) => ({ period: m[1] ?? 'this month' }),
    humanReadable: (m) => `Income for ${m[1] ?? 'this month'}`,
  },
  // "how much did I spend this month" / "total expenses this month"
  {
    pattern: /(?:how much did i spend|total (?:expenses?|spending))(?:\s+(this month|last month|last \d+ months?))?/i,
    intent: 'period_summary',
    extract: (m) => ({ period: m[1] ?? 'this month' }),
    humanReadable: (m) => `Period summary for ${m[1] ?? 'this month'}`,
  },
];

/** Match a natural-language question to a structured query plan. */
export function parseChatQuestion(question: string): ChatQueryPlan {
  const trimmed = question.trim();

  for (const rule of PATTERNS) {
    const m = trimmed.match(rule.pattern);
    if (m) {
      return {
        intent: rule.intent,
        params: rule.extract(m),
        humanReadable: rule.humanReadable(m),
      };
    }
  }

  return {
    intent: 'unknown',
    params: {},
    humanReadable: trimmed,
  };
}

/** Returns the date range for a period token like "this month", "last 3 months". */
export function periodRangeFromToken(token: string) {
  return parsePeriodToken(token) ?? currentMonth();
}

/**
 * Returns suggested questions for the "unknown" intent UI fallback.
 */
export const SUGGESTED_QUESTIONS = [
  'How much did I spend on groceries this month?',
  'What are my recurring payments?',
  'Compare this month to last month',
  'What new merchants appeared recently?',
  'What are my largest expenses?',
  'What are my top merchants?',
  'What is my income this month?',
  'How much did I spend this month?',
] as const;

export { currentMonth, lastMonth, lastNMonths };
