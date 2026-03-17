import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';
import { Package } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
  },
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, size }: { children: React.ReactNode; onClick?: () => void; size?: string }) => (
    <button onClick={onClick} data-size={size}>{children}</button>
  ),
}));

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={Package}
        title="No items"
        description="There are no items to display."
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const mockOnAction = vi.fn();
    render(
      <EmptyState
        icon={Package}
        title="No items"
        description="There are no items to display."
        actionLabel="Add Item"
        onAction={mockOnAction}
      />
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('renders secondary button when provided', () => {
    const mockOnSecondary = vi.fn();
    render(
      <EmptyState
        icon={Package}
        title="No items"
        description="There are no items to display."
        secondaryLabel="Learn More"
        onSecondary={mockOnSecondary}
      />
    );

    const button = screen.getByText('Learn More');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockOnSecondary).toHaveBeenCalledTimes(1);
  });
});