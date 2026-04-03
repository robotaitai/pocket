// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KeyboardHelp } from '../components/KeyboardHelp.js';
import { BulkActions } from '../components/BulkActions.js';
import { SourceBadge } from '../components/SourceBadge.js';

describe('accessibility smoke tests', () => {
  describe('KeyboardHelp', () => {
    it('has dialog role', () => {
      render(<KeyboardHelp onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('has accessible label', () => {
      render(<KeyboardHelp onClose={vi.fn()} />);
      expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeTruthy();
    });

    it('close button is accessible', () => {
      render(<KeyboardHelp onClose={vi.fn()} />);
      expect(screen.getByRole('button', { name: /close keyboard shortcuts/i })).toBeTruthy();
    });
  });

  describe('BulkActions', () => {
    it('has toolbar role', () => {
      render(
        <BulkActions selectedCount={2} totalCount={5} onSelectAll={vi.fn()} onAcceptSelected={vi.fn()} onRejectSelected={vi.fn()} onClearSelection={vi.fn()} />,
      );
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeTruthy();
    });

    it('accept and reject buttons have meaningful aria-labels', () => {
      render(
        <BulkActions selectedCount={2} totalCount={5} onSelectAll={vi.fn()} onAcceptSelected={vi.fn()} onRejectSelected={vi.fn()} onClearSelection={vi.fn()} />,
      );
      expect(screen.getByRole('button', { name: /accept 2 selected/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /reject 2 selected/i })).toBeTruthy();
    });
  });

  describe('SourceBadge', () => {
    it('has accessible label describing source and method', () => {
      render(<SourceBadge sourceType="pdf" extractionMethod="llm" />);
      expect(screen.getByLabelText(/source: pdf \/ method: llm/i)).toBeTruthy();
    });
  });
});
