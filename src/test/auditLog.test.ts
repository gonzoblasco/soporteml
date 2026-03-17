import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAuditEntry } from "../lib/auditLog";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("auditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully log audit entry", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      error: null,
    });

    const result = await logAuditEntry({
      companyId: "comp123",
      actorUserId: "user123",
      entityType: "product",
      entityId: "prod123",
      action: "create",
      before: null,
      after: { name: "Test Product" },
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('audit-log', {
      body: {
        company_id: "comp123",
        entity_type: "product",
        entity_id: "prod123",
        action: "create",
        before_snapshot: null,
        after_snapshot: { name: "Test Product" },
      },
    });

    // Function should complete without throwing
    expect(result).toBeUndefined();
  });

  // Bug exposure test: errors should now be thrown
  it("should throw on audit log errors", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      error: { message: "Function failed" },
    });

    // Should now throw instead of being silent
    await expect(logAuditEntry({
      companyId: "comp123",
      actorUserId: "user123",
      entityType: "product",
      entityId: "prod123",
      action: "update",
    })).rejects.toThrow("Audit log failed: Function failed");
  });

  it("should throw on network errors", async () => {
    (supabase.functions.invoke as any).mockRejectedValue(new Error("Network error"));

    // Should throw for network errors
    await expect(logAuditEntry({
      companyId: "comp123",
      actorUserId: "user123",
      entityType: "product",
      entityId: "prod123",
      action: "archive",
    })).rejects.toThrow("Network error");
  });

  it("should pass all required parameters to edge function", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      error: null,
    });

    await logAuditEntry({
      companyId: "comp123",
      actorUserId: "user456",
      entityType: "question",
      entityId: "q789",
      action: "archive",
      before: { status: "active" },
      after: { status: "archived" },
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('audit-log', {
      body: {
        company_id: "comp123",
        entity_type: "question",
        entity_id: "q789",
        action: "archive",
        before_snapshot: { status: "active" },
        after_snapshot: { status: "archived" },
      },
    });
  });
});