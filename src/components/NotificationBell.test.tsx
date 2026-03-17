import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { NotificationBell } from './NotificationBell';

// Mock useAuth to avoid supabase network calls
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1' } }),
}));

// Mock react-router-dom navigation
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock supabase to avoid network calls
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ limit: () => ({}) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'hace 1 minuto',
}));

vi.mock('date-fns/locale', () => ({
  es: {},
}));

describe('NotificationBell', () => {
  it('renders bell button', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
