// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { useKeyboard } from '../hooks/useKeyboard.js';

function TestComponent({ bindings }: { bindings: Parameters<typeof useKeyboard>[0] }) {
  useKeyboard(bindings);
  return <div data-testid="target" />;
}

function fireKey(key: string, opts: KeyboardEventInit = {}) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  });
}

describe('useKeyboard', () => {
  it('calls handler when matching key is pressed', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'j', description: 'next', handler }]} />);
    fireKey('j');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call handler for non-matching key', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'j', description: 'next', handler }]} />);
    fireKey('k');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when shift key is held but binding has no shift', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'a', description: 'accept', shift: false, handler }]} />);
    fireKey('a', { shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires when shift is required and held', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'A', description: 'bulk accept', shift: true, handler }]} />);
    fireKey('A', { shiftKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire when Ctrl modifier is held', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'a', description: 'accept', handler }]} />);
    fireKey('a', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when target is an input element', () => {
    const handler = vi.fn();
    render(<TestComponent bindings={[{ key: 'a', description: 'accept', handler }]} />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
