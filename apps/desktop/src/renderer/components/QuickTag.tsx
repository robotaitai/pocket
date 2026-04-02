import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js';

interface Props {
  currentCategory: string | null;
  onSelect: (category: string, saveMerchantRule: boolean) => void;
  onClose: () => void;
  suggestedCategory?: string | null;
}

export function QuickTag({ currentCategory, onSelect, onClose, suggestedCategory }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [saveRule, setSaveRule] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = CATEGORIES.filter((c) =>
    !query || c.includes(query.toLowerCase()) || (CATEGORY_LABELS[c] ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };

  return (
    <div
      role="dialog"
      aria-label="Tag transaction"
      style={{
        position: 'absolute',
        zIndex: 100,
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        width: 240,
        padding: 8,
      }}
      onKeyDown={handleKey}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search categories..."
        aria-label="Search categories"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 13,
          marginBottom: 6,
          outline: 'none',
        }}
      />

      {suggestedCategory && !currentCategory && (
        <div style={{ fontSize: 11, color: '#6b7280', padding: '2px 4px 6px' }}>
          Suggested: <strong>{CATEGORY_LABELS[suggestedCategory] ?? suggestedCategory}</strong>
        </div>
      )}

      <ul
        role="listbox"
        aria-label="Category options"
        style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 220, overflowY: 'auto' }}
      >
        {filtered.map((cat) => (
          <li key={cat} role="option" aria-selected={cat === currentCategory}>
            <button
              onClick={() => onSelect(cat, saveRule)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                background: cat === currentCategory ? '#eff6ff' : 'transparent',
                color: cat === currentCategory ? '#1d4ed8' : '#111827',
                fontWeight: cat === currentCategory ? 600 : 400,
                fontSize: 13,
              }}
            >
              {CATEGORY_LABELS[cat] ?? cat}
              {cat === suggestedCategory && <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: 11 }}>(suggested)</span>}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 13 }}>No match</li>
        )}
      </ul>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={saveRule}
          onChange={(e) => setSaveRule(e.target.checked)}
          aria-label="Remember this for similar merchants"
        />
        Remember for similar merchants
      </label>
    </div>
  );
}
