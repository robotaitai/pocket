// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QuickTag } from '../components/QuickTag.js';

describe('QuickTag', () => {
  it('renders all categories by default', () => {
    render(<QuickTag currentCategory={null} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('Dining')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
  });

  it('calls onSelect with category and saveRule flag when a category is clicked', async () => {
    const onSelect = vi.fn();
    render(<QuickTag currentCategory={null} onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('Groceries'));
    expect(onSelect).toHaveBeenCalledWith('groceries', true);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<QuickTag currentCategory={null} onSelect={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('filters categories by search query', async () => {
    render(<QuickTag currentCategory={null} onSelect={vi.fn()} onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Search categories...'), 'gro');
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.queryByText('Dining')).toBeNull();
  });

  it('shows suggested category label', () => {
    const { container } = render(
      <QuickTag currentCategory={null} onSelect={vi.fn()} onClose={vi.fn()} suggestedCategory="groceries" />,
    );
    // The suggestion hint is shown above the list
    expect(container.querySelector('strong')?.textContent).toBe('Groceries');
    // The button in the list also shows "(suggested)" marker
    expect(screen.getAllByText(/\(suggested\)/).length).toBeGreaterThanOrEqual(1);
  });

  it('save-rule checkbox is checked by default', () => {
    render(<QuickTag currentCategory={null} onSelect={vi.fn()} onClose={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /remember/i });
    expect(checkbox).toBeChecked();
  });

  it('calls onSelect with saveRule=false when checkbox is unchecked', async () => {
    const onSelect = vi.fn();
    render(<QuickTag currentCategory={null} onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /remember/i }));
    await userEvent.click(screen.getByText('Dining'));
    expect(onSelect).toHaveBeenCalledWith('dining', false);
  });
});
