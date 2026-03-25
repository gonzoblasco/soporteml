import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AICopilotPanel from './AICopilotPanel';
import type { QuestionRow } from '@/types/question';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => {
  const auth = {
    getSession: vi.fn(),
  };
  const from = vi.fn();
  
  return {
    supabase: {
      auth,
      from,
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockQuestion: QuestionRow = {
  id: 'q1',
  question_text: '¿Cuánto cuesta?',
  product_title: 'Test Product',
  product_price: 100,
  buyer_nickname: 'buyer123',
  ai_category: 'precio',
  ai_suggested_answer: null,
  ai_confidence: null,
  ai_decision_reason: null,
  auto_action: null,
  answered_by_ai: false,
  product_id: 'prod1',
  status: 'pending',
  created_at: '2026-01-01',
  company_id: 'comp1',
  meli_question_id: 'mq1',
  buyer_id: 'b1',
  final_answer: null,
  answered_by: null,
  answered_at: null,
  requires_human: false,
  requires_human_reason: null,
  meli_status: null,
  meli_permalink: null,
};

describe('AICopilotPanel - AI Function Call', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should not call the AI function if user is not authenticated', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    const mockUseAuth = useAuth as any;
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      currentCompanyId: 'comp1',
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <AICopilotPanel
          question={mockQuestion}
          onUseDraft={vi.fn()}
        />
      </BrowserRouter>
    );

    // Wait a bit to ensure the effect doesn't trigger
    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should pass the access token explicitly via fetch', async () => {
    const mockAccessToken = 'test-access-token-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Test summary',
        draft: 'Test draft',
        missing_data: [],
      }),
    });
    globalThis.fetch = mockFetch;

    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user1' },
          access_token: mockAccessToken,
        },
      },
    });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });

    const mockUseAuth = useAuth as any;
    mockUseAuth.mockReturnValue({
      user: { id: 'user1' },
      session: { user: { id: 'user1' }, access_token: mockAccessToken },
      currentCompanyId: 'comp1',
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <AICopilotPanel
          question={mockQuestion}
          onUseDraft={vi.fn()}
        />
      </BrowserRouter>
    );

    // Wait for fetch to be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Verify the Authorization header is passed
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
  });
});
