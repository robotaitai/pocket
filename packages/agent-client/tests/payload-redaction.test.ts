import { describe, it, expect } from 'vitest';
import { assertMerchantNameSafe, assertChatPayloadSafe, sanitizeDocumentText } from '../src/privacy.js';

describe('assertMerchantNameSafe', () => {
  it('passes for a normal merchant name', () => {
    expect(() => assertMerchantNameSafe('Supermarket Shufersal')).not.toThrow();
  });

  it('throws for a name containing an IBAN', () => {
    expect(() => assertMerchantNameSafe('IL62 0108 0000 0009 9999 999')).toThrow();
  });

  it('throws for an excessively long name', () => {
    expect(() => assertMerchantNameSafe('A'.repeat(201))).toThrow('maximum safe length');
  });

  it('throws if name contains "balance:"', () => {
    expect(() => assertMerchantNameSafe('balance: 50000')).toThrow();
  });

  it('passes for Hebrew merchant names', () => {
    expect(() => assertMerchantNameSafe('סופרמרקט רמי לוי')).not.toThrow();
  });
});

describe('assertChatPayloadSafe', () => {
  it('passes for plain text question and answer', () => {
    expect(() => assertChatPayloadSafe(
      'How much did I spend on groceries?',
      'Spent ₪250 on groceries in March across 4 transactions.',
    )).not.toThrow();
  });

  it('throws if localAnswer is raw JSON', () => {
    expect(() => assertChatPayloadSafe(
      'How much?',
      JSON.stringify({ amount: 100, accountId: 'acc-123' }),
    )).toThrow('formatted text');
  });

  it('throws if question contains an IBAN', () => {
    expect(() => assertChatPayloadSafe(
      'What is IL62 0108 0000 0009 9999 999?',
      'I do not know.',
    )).toThrow();
  });
});

describe('sanitizeDocumentText', () => {
  it('redacts IBAN patterns', () => {
    const text = 'Account: IL62 0108 0000 0009 9999 999 - balance 5000';
    const sanitized = sanitizeDocumentText(text);
    expect(sanitized).toContain('[IBAN-REDACTED]');
    expect(sanitized).not.toContain('IL62');
  });

  it('leaves normal text unchanged', () => {
    const text = 'Date: 2026-03-01 Amount: -250 Description: Supermarket';
    expect(sanitizeDocumentText(text)).toBe(text);
  });

  it('handles multiple IBANs in text', () => {
    const text = 'From IL62010800000009999999900 to IL62010800000009999999901';
    const sanitized = sanitizeDocumentText(text);
    expect(sanitized.match(/\[IBAN-REDACTED\]/g)?.length).toBe(2);
  });
});
