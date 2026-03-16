import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  },
}));

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
    vi.clearAllMocks();
    localStorage.clear();

    mockOnAuthStateChange = vi.fn();
    mockGetSession = vi.fn();

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });
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

    // Mock profile query
    const mockProfileQuery = vi.fn(() => Promise.resolve({
      data: { full_name: "Test User", company_id: "comp123" },
    }));
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockProfileQuery,
        })),
      })),
    });

    // Mock memberships query
    const mockMembershipsQuery = vi.fn(() => Promise.resolve({
      data: [{ company_id: "comp123", role: "admin", is_default: true }],
    }));
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: mockMembershipsQuery,
              })),
            })),
          })),
        })),
      })),
    });

    let capturedAuth: any = null;

    render(
      <AuthProvider>
        <TestComponent onAuth={(auth) => (capturedAuth = auth)} />
      </AuthProvider>
    );

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
    });

    act(() => {
      authCallback("SIGNED_OUT", null);
    });

    act(() => {
      authCallback("SIGNED_IN", mockSession2);
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

    // Mock profile and memberships
    (supabase.from as any)
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { full_name: "Test User", company_id: "comp123" },
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [
                      { company_id: "comp123", role: "admin", is_default: true },
                      { company_id: "comp456", role: "agent", is_default: false },
                    ],
                  })),
                })),
              })),
            })),
          })),
        })),
      });

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