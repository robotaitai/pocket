import { describe, it, expect } from 'vitest';
import { parseChatQuestion } from '../src/chat.js';

describe('parseChatQuestion', () => {
  it('recognizes category spend intent', () => {
    const plan = parseChatQuestion('How much did I spend on groceries this month?');
    expect(plan.intent).toBe('category_spend');
    expect(plan.params['category']).toBe('groceries');
    expect(plan.params['period']).toBe('this month');
  });

  it('recognizes last month category spend', () => {
    const plan = parseChatQuestion('How much did I spend on dining last month?');
    expect(plan.intent).toBe('category_spend');
    expect(plan.params['category']).toBe('dining');
    expect(plan.params['period']).toBe('last month');
  });

  it('recognizes recurring payments intent', () => {
    const plan = parseChatQuestion('What are my recurring payments?');
    expect(plan.intent).toBe('recurring_list');
  });

  it('recognizes subscriptions as recurring intent', () => {
    const plan = parseChatQuestion('Show me my subscriptions');
    expect(plan.intent).toBe('recurring_list');
  });

  it('recognizes period comparison', () => {
    const plan = parseChatQuestion('Compare this month to last month');
    expect(plan.intent).toBe('period_comparison');
    expect(plan.params['period1']).toBe('this month');
    expect(plan.params['period2']).toBe('last month');
  });

  it('recognizes new merchants', () => {
    const plan = parseChatQuestion('What new merchants appeared recently?');
    expect(plan.intent).toBe('new_merchants');
  });

  it('recognizes suspicious charges', () => {
    const plan = parseChatQuestion('Are there any suspicious charges?');
    expect(plan.intent).toBe('new_merchants');
  });

  it('recognizes merchant history', () => {
    const plan = parseChatQuestion('How much did I spend at Supermarket in the last 3 months?');
    expect(plan.intent).toBe('merchant_history');
    expect(String(plan.params['merchant'])).toContain('Supermarket');
  });

  it('recognizes largest expenses', () => {
    const plan = parseChatQuestion('What are my largest expenses?');
    expect(plan.intent).toBe('largest_expenses');
  });

  it('recognizes top merchants', () => {
    const plan = parseChatQuestion('Where do I spend most?');
    expect(plan.intent).toBe('top_merchants');
  });

  it('recognizes income summary', () => {
    const plan = parseChatQuestion('What is my income this month?');
    expect(plan.intent).toBe('income_summary');
  });

  it('recognizes period summary', () => {
    const plan = parseChatQuestion('How much did I spend this month?');
    expect(plan.intent).toBe('period_summary');
  });

  it('returns unknown for unrecognized questions', () => {
    const plan = parseChatQuestion('What is the meaning of life?');
    expect(plan.intent).toBe('unknown');
  });

  it('fills humanReadable field for all recognized intents', () => {
    const plan = parseChatQuestion('What are my recurring payments?');
    expect(plan.humanReadable).toBeTruthy();
    expect(plan.humanReadable.length).toBeGreaterThan(3);
  });
});
