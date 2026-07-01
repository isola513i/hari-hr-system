import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  const baseProps = {
    title: 'Headcount',
    value: 42,
    icon: <svg data-testid="icon" />,
    color: 'primary' as const,
  };

  it('renders the title and value', () => {
    render(<StatCard {...baseProps} />);
    expect(screen.getByText('Headcount')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('is a non-interactive card when no onClick is given', () => {
    render(<StatCard {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('becomes a labelled button and fires onClick when clickable', () => {
    const onClick = vi.fn();
    render(<StatCard {...baseProps} onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Headcount' });
    expect(btn).toHaveAttribute('tabindex', '0');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates on Enter and Space for keyboard users', () => {
    const onClick = vi.fn();
    render(<StatCard {...baseProps} onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Headcount' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('shows a trend percentage when provided', () => {
    render(<StatCard {...baseProps} trend={12} />);
    expect(screen.getByText('12%')).toBeInTheDocument();
  });
});
