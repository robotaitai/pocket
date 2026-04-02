// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BulkActions } from '../components/BulkActions.js';

const defaultProps = {
  selectedCount: 0,
  totalCount: 5,
  onSelectAll: vi.fn(),
  onAcceptSelected: vi.fn(),
  onRejectSelected: vi.fn(),
  onClearSelection: vi.fn(),
};

describe('BulkActions', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkActions {...defaultProps} selectedCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows selected count and total when items are selected', () => {
    render(<BulkActions {...defaultProps} selectedCount={3} totalCount={5} />);
    expect(screen.getByText('3 of 5 selected')).toBeTruthy();
  });

  it('shows "Select all N" button when not all are selected', () => {
    render(<BulkActions {...defaultProps} selectedCount={3} totalCount={5} />);
    expect(screen.getByText('Select all 5')).toBeTruthy();
  });

  it('does not show "Select all" when all are selected', () => {
    render(<BulkActions {...defaultProps} selectedCount={5} totalCount={5} />);
    expect(screen.queryByText(/select all/i)).toBeNull();
  });

  it('calls onAcceptSelected when Accept is clicked', async () => {
    const onAccept = vi.fn();
    render(<BulkActions {...defaultProps} selectedCount={2} onAcceptSelected={onAccept} />);
    await userEvent.click(screen.getByRole('button', { name: /accept 2 selected/i }));
    expect(onAccept).toHaveBeenCalled();
  });

  it('calls onRejectSelected when Reject is clicked', async () => {
    const onReject = vi.fn();
    render(<BulkActions {...defaultProps} selectedCount={2} onRejectSelected={onReject} />);
    await userEvent.click(screen.getByRole('button', { name: /reject 2 selected/i }));
    expect(onReject).toHaveBeenCalled();
  });

  it('calls onClearSelection when Clear is clicked', async () => {
    const onClear = vi.fn();
    render(<BulkActions {...defaultProps} selectedCount={1} onClearSelection={onClear} />);
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onSelectAll when "Select all N" is clicked', async () => {
    const onSelectAll = vi.fn();
    render(<BulkActions {...defaultProps} selectedCount={2} totalCount={5} onSelectAll={onSelectAll} />);
    await userEvent.click(screen.getByText('Select all 5'));
    expect(onSelectAll).toHaveBeenCalled();
  });
});
