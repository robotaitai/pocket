import { useEffect } from 'react';

export type KeyboardHandler = (e: KeyboardEvent) => void;

export interface KeyBinding {
  key: string;
  shift?: boolean;
  description: string;
  handler: () => void;
}

/**
 * Registers keyboard bindings on the document. Bindings are removed when the
 * component that registered them unmounts.
 */
export function useKeyboard(bindings: KeyBinding[], active = true): void {
  useEffect(() => {
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't fire shortcuts when typing in an input/textarea/select
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      for (const binding of bindings) {
        const keyMatch = e.key === binding.key;
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
        if (keyMatch && shiftMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          binding.handler();
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [bindings, active]);
}
