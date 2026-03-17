import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import QuestionCard from './QuestionCard';
import type { QuestionRow } from '@/types/question';
import { derivePriorityChips } from '@/lib/priorityChips';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'hace 2 horas'),
}));

// Mock date-fns locale
vi.mock('date-fns/locale', () => ({
  es: {},
}));

// Mock CategoryBadge
vi.mock('./CategoryBadge', () => ({
  default: ({ category }: { category: string }) => <span>{category}</span>,
}));

// Mock priorityChips
vi.mock('@/lib/priorityChips', () => ({
  derivePriorityChips: vi.fn(() => []),
}));

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockQuestion: QuestionRow = {
  id: '1',
  question_text: '¿Cuál es el precio?',
  buyer_id: 'buyer123',
  buyer_nickname: 'Juan',
  ai_category: 'Precio',
  created_at: '2023-01-01T00:00:00Z',
  status: 'pending',
  human_reason: null,
  product_id: null,
  product_title: null,
  priority_score: null,
};

describe('QuestionCard', () => {
  it('renders question text and buyer info', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('¿Cuál es el precio?')).toBeInTheDocument();
    expect(screen.getByText('Juan · hace 2 horas')).toBeInTheDocument();
    expect(screen.getByText('Precio')).toBeInTheDocument();
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <QuestionCard
        question={mockQuestion}
        isSelected={true}
        onClick={() => {}}
      />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-accent');
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <QuestionCard
        question={mockQuestion}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    const button = container.querySelector('button');
    fireEvent.click(button!);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('shows priority chips when showHumanReason is true and chips exist', () => {
    const mockDerivePriorityChips = vi.mocked(derivePriorityChips);
    mockDerivePriorityChips.mockReturnValue([{ label: 'Urgente', color: 'bg-red-500' }]);

    render(
      <QuestionCard
        question={mockQuestion}
        isSelected={false}
        onClick={() => {}}
        showHumanReason={true}
      />
    );

    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });
});