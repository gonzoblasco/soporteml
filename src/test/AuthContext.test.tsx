import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  const createQueryBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      update: () => builder,
      in: () => builder,
    };

    builder.single = async () => {
      if (table === 'profiles') {
        return { data: { full_name: 'Test User', company_id: 'comp123' } };
      }
      return { data: null };
    };

    builder.maybeSingle = async () => {
      if (table === 'user_roles') {
        return { data: { role: 'admin' } };
      }
      return { data: null };
    };

    builder.then = async (resolve: any) => {
      // allow await on builder
      if (table === 'memberships') {
        return resolve({
          data: [
            { company_id: 'comp123', role: 'admin', is_default: true },
            { company_id: 'comp456', role: 'agent', is_default: false },
          ],
        });
      }
      return resolve({ data: null });
    };

    return builder;
  };

  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn(async () => ({ data: { session: null } })),
      },
      from: (table: string) => createQueryBuilder(table),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {},
    },
  };
});

// Test component that uses the auth context
const TestComponent = ({ onAuth }: { onAuth: (auth: any) => void }) => {
  const auth = useAuth();
  onAuth(auth);
  return null;
};

describe("AuthContext", () => {
  let mockOnAuthStateChange: any;
  let mockGetSession: any;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockOnAuthStateChange = vi.fn((callback) => {
      // Call callback asynchronously to mimic Supabase behavior
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession = vi.fn(async () => ({ data: { session: null } }));

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);
    (supabase.auth.getSession as any).mockImplementation(mockGetSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with loading state", () => {
    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    expect(capturedAuth.isLoading).toBe(true);
    expect(capturedAuth.user).toBe(null);
    expect(capturedAuth.session).toBe(null);
  });

  it("should handle user login and load profile data", async () => {
    const mockUser = { id: "user123" } as User;
    const mockSession = { user: mockUser } as Session;

    // Mock the auth state change
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    // Ensure getSession returns our logged-in session so it doesn't overwrite state
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    // Flush any pending setTimeouts used by AuthProvider
    await act(async () => {
      vi.runAllTimers();
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(capturedAuth.isLoading).toBe(false);
    });

    expect(capturedAuth.user).toBe(mockUser);
    expect(capturedAuth.session).toBe(mockSession);
  });

  // Bug exposure test: race condition with rapid auth state changes
  it("should handle rapid auth state changes without race conditions", async () => {
    const mockUser1 = { id: "user1" } as User;
    const mockUser2 = { id: "user2" } as User;
    const mockSession1 = { user: mockUser1 } as Session;
    const mockSession2 = { user: mockUser2 } as Session;

    let authCallback: any = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    let capturedAuth: any = null;
    let authUpdates: any[] = [];

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => {
          capturedAuth = auth;
          authUpdates.push({ ...auth });
        }} />
      </AuthProvider>
    );

    // Simulate rapid auth changes
    act(() => {
      authCallback("SIGNED_IN", mockSession1);
      vi.runAllTimers();
    });

    act(() => {
      authCallback("SIGNED_OUT", null);
      vi.runAllTimers();
    });

    act(() => {
      authCallback("SIGNED_IN", mockSession2);
      vi.runAllTimers();
    });

    // Wait for stabilization
    await waitFor(() => {
      expect(authUpdates.length).toBeGreaterThan(1);
    });

    // The final state should be consistent (last auth state)
    expect(capturedAuth.user).toBe(mockUser2);
    expect(capturedAuth.session).toBe(mockSession2);
  });

  // Bug exposure test: setCurrentCompanyId fallback logic
  it("should handle setCurrentCompanyId with invalid company gracefully", async () => {
    const mockUser = { id: "user123" } as User;
    const mockSession = { user: mockUser } as Session;

    // Setup initial auth state with memberships
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    // Ensure getSession returns our logged-in session to keep state consistent
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    let capturedAuth: any = null;

    const { rerender } = render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(capturedAuth.memberships.length).toBe(2);
    });

    // Try to set to invalid company
    act(() => {
      capturedAuth.setCurrentCompanyId("invalid-company");
    });

    // Should fallback to default company
    expect(capturedAuth.currentCompanyId).toBe("comp123");
    expect(capturedAuth.userRole).toBe("admin");
  });

  it("should handle logout correctly", async () => {
    const mockUser = { id: "user123" } as User;
    const mockSession = { user: mockUser } as Session;

    let authCallback: any = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    // Login
    act(() => {
      authCallback("SIGNED_IN", mockSession);
    });

    await waitFor(() => {
      expect(capturedAuth.user).toBe(mockUser);
    });

    // Logout
    act(() => {
      authCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(capturedAuth.user).toBe(null);
      expect(capturedAuth.session).toBe(null);
      expect(capturedAuth.memberships).toEqual([]);
      expect(capturedAuth.currentCompanyId).toBe(null);
      expect(capturedAuth.userRole).toBe(null);
    });
  });
});