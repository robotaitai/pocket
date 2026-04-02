// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ReviewBatchSummary } from '../pocket.js';
import { ReviewQueue } from '../pages/ReviewQueue.js';

const mockBatch: ReviewBatchSummary = {
  batchId: 'batch-1',
  createdAt: '2026-03-31T10:00:00Z',
  sourceType: 'scraper',
  sourceFile: null,
  connectorId: 'hapoalim',
  extractionMethod: 'scraper',
  providerUsed: 'hapoalim',
  total: 3,
  pending: 2,
  accepted: 1,
  rejected: 0,
};

describe('ReviewQueue', () => {
  it('shows empty state when no batches', async () => {
    window.pocket.review.getBatches = vi.fn().mockResolvedValue([]);
    render(<ReviewQueue />);
    await waitFor(() => expect(screen.getByText(/no import batches/i)).toBeTruthy());
  });

  it('shows batch card with pending count', async () => {
    window.pocket.review.getBatches = vi.fn().mockResolvedValue([mockBatch]);
    render(<ReviewQueue />);
    await waitFor(() => {
      expect(screen.getByText(/scraper import/i)).toBeTruthy();
      expect(screen.getByText('2 pending')).toBeTruthy();
    });
  });

  it('shows total pending indicator in header', async () => {
    window.pocket.review.getBatches = vi.fn().mockResolvedValue([mockBatch]);
    render(<ReviewQueue />);
    await waitFor(() => {
      expect(screen.getByText('2 pending')).toBeTruthy();
    });
  });

  it('navigates into batch on card click', async () => {
    window.pocket.review.getBatches = vi.fn().mockResolvedValue([mockBatch]);
    window.pocket.review.getTransactions = vi.fn().mockResolvedValue([]);
    render(<ReviewQueue />);
    await waitFor(() => screen.getByText(/scraper import/i));
    await userEvent.click(screen.getByRole('button', { name: /open scraper batch/i }));
    await waitFor(() => {
      expect(window.pocket.review.getTransactions).toHaveBeenCalledWith({ batchId: 'batch-1', reviewStatus: 'all' });
    });
  });
});
