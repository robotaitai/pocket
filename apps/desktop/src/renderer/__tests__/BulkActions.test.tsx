// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BulkActions } from '../components/BulkActions.js';

describe('BulkActions', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActions selectedCount={0} onAcceptSelected={vi.fn()} onRejectSelected={vi.fn()} onClearSelection={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows selected count when items are selected', () => {
    render(
      <BulkActions selectedCount={3} onAcceptSelected={vi.fn()} onRejectSelected={vi.fn()} onClearSelection={vi.fn()} />,
    );
    expect(screen.getByText('3 selected')).toBeTruthy();
  });

  it('calls onAcceptSelected when Accept all is clicked', async () => {
    const onAccept = vi.fn();
    render(
      <BulkActions selectedCount={2} onAcceptSelected={onAccept} onRejectSelected={vi.fn()} onClearSelection={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /accept 2 selected/i }));
    expect(onAccept).toHaveBeenCalled();
  });

  it('calls onRejectSelected when Reject all is clicked', async () => {
    const onReject = vi.fn();
    render(
      <BulkActions selectedCount={2} onAcceptSelected={vi.fn()} onRejectSelected={onReject} onClearSelection={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /reject 2 selected/i }));
    expect(onReject).toHaveBeenCalled();
  });

  it('calls onClearSelection when Clear is clicked', async () => {
    const onClear = vi.fn();
    render(
      <BulkActions selectedCount={1} onAcceptSelected={vi.fn()} onRejectSelected={vi.fn()} onClearSelection={onClear} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
