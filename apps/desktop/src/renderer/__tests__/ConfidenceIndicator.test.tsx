// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.js';

describe('ConfidenceIndicator', () => {
  it('renders nothing when score is null', () => {
    const { container } = render(<ConfidenceIndicator score={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when score is 1 (fully confident)', () => {
    const { container } = render(<ConfidenceIndicator score={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders percentage for score below 1', () => {
    render(<ConfidenceIndicator score={0.75} />);
    expect(screen.getByLabelText('Confidence: 75%')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('shows low confidence for score below 0.6', () => {
    render(<ConfidenceIndicator score={0.45} />);
    expect(screen.getByText('45%')).toBeTruthy();
  });
});
