import { vi, afterEach } from 'vitest';

// jest-dom matchers are only meaningful in jsdom; import only in browser-like environments
if (typeof window !== 'undefined') {
  // Using require-style dynamic import via eval avoids TS treating this as a module import
  // while still loading jest-dom matchers at runtime in jsdom.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@testing-library/jest-dom');
}

// Provide a mock window.pocket API for renderer component tests.
// Each test can override individual methods with vi.fn() as needed.
const mockPocket = {
  settings: {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
  },
  secrets: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  review: {
    getBatches: vi.fn().mockResolvedValue([]),
    getTransactions: vi.fn().mockResolvedValue([]),
    accept: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    setCategory: vi.fn().mockResolvedValue(undefined),
    undo: vi.fn().mockResolvedValue({ restoredCount: 0, actionType: 'none' }),
  },
  merchantRules: {
    getAll: vi.fn().mockResolvedValue([]),
    suggest: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  },
};

// Only inject window.pocket in jsdom (not in node env)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'pocket', { value: mockPocket, writable: true, configurable: true });
}

// Reset mocks between tests to prevent state leakage
afterEach(() => { vi.clearAllMocks(); });
