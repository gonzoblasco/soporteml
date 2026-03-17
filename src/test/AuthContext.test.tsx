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

    builder.then = (resolve: any) => {
      if (table === 'memberships') {
        return Promise.resolve({
          data: [
            { company_id: 'comp123', role: 'admin', is_default: true },
            { company_id: 'comp456', role: 'agent', is_default: false },
          ],
        }).then(resolve);
      }
      return Promise.resolve({ data: null }).then(resolve);
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

const tick = () => new Promise(r => setTimeout(r, 0));

describe("AuthContext", () => {
  let mockOnAuthStateChange: any;
  let mockGetSession: any;

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

    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    // Wait for async operations (setTimeout(0) + DB queries) to complete
    await waitFor(() => {
      expect(capturedAuth.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(capturedAuth.user).toBe(mockUser);
      expect(capturedAuth.session).toBe(mockSession);
    });
  });

  // Bug exposure test: race condition with rapid auth state changes
  it("should handle rapid auth state changes without race conditions", async () => {
    const mockUser1 = { id: "user1" } as User;
    const mockUser2 = { id: "user2" } as User;
    const mockSession1 = { user: mockUser1 } as Session;
    const mockSession2 = { user: mockUser2 } as Session;

    let authCallback: any = null;
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => {
          capturedAuth = auth;
        }} />
      </AuthProvider>
    );

    // Simulate rapid auth changes
    await act(async () => {
      authCallback("SIGNED_IN", mockSession1);
      await tick();
    });

    await act(async () => {
      authCallback("SIGNED_OUT", null);
      await tick();
    });

    await act(async () => {
      authCallback("SIGNED_IN", mockSession2);
      await tick();
    });

    // Wait for stabilization
    await waitFor(() => {
      expect(capturedAuth.user).toBe(mockUser2);
      expect(capturedAuth.session).toBe(mockSession2);
    });
  });

  // Bug exposure test: setCurrentCompanyId fallback logic
  it("should handle setCurrentCompanyId with invalid company gracefully", async () => {
    const mockUser = { id: "user123" } as User;
    const mockSession = { user: mockUser } as Session;

    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    let capturedAuth: any = null;

    render(
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

    // Start already signed in
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    let capturedAuth: any = null;
    let authCallback: any = null;

    // Capture the callback for later use
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      authCallback = callback;
      callback("SIGNED_IN", mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation(mockOnAuthStateChange);

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth.user).toBe(mockUser);
    });

    // Logout
    await act(async () => {
      authCallback("SIGNED_OUT", null);
      await tick();
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
