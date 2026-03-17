import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "../hooks/usePagination";

describe("usePagination", () => {
  it("should initialize with correct values", () => {
    const { result } = renderHook(() => usePagination(100, 10));

    expect(result.current.page).toBe(0);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(9);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
    expect(result.current.pageSize).toBe(10);
  });

  it("should handle navigation correctly", () => {
    const { result } = renderHook(() => usePagination(50, 10));

    expect(result.current.page).toBe(0);
    expect(result.current.totalPages).toBe(5);

    act(() => {
      result.current.goNext();
    });
    expect(result.current.page).toBe(1);
    expect(result.current.from).toBe(10);
    expect(result.current.to).toBe(19);

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.page).toBe(0);

    act(() => {
      result.current.goTo(2);
    });
    expect(result.current.page).toBe(2);
    expect(result.current.from).toBe(20);
    expect(result.current.to).toBe(29);
  });

  it("should handle edge cases", () => {
    const { result } = renderHook(() => usePagination(25, 10));

    // Try to go beyond last page
    act(() => {
      result.current.goTo(10);
    });
    expect(result.current.page).toBe(2); // Should be clamped to max

    // Try to go to negative page
    act(() => {
      result.current.goTo(-1);
    });
    expect(result.current.page).toBe(0); // Should be clamped to 0
  });

  it("should handle reset", () => {
    const { result } = renderHook(() => usePagination(100, 10));

    act(() => {
      result.current.goTo(5);
    });
    expect(result.current.page).toBe(5);

    act(() => {
      result.current.reset();
    });
    expect(result.current.page).toBe(0);
  });

  // Bug exposure tests
  it("should handle zero totalCount", () => {
    const { result } = renderHook(() => usePagination(0, 10));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.canNext).toBe(false);
    expect(result.current.canPrev).toBe(false);
  });

  // Bug exposure test: negative totalCount
  it("should handle negative totalCount", () => {
    const { result } = renderHook(() => usePagination(-10, 10));

    // Math.ceil(-10/10) = Math.ceil(-1) = -1, then Math.max(1, -1) = 1
    expect(result.current.totalPages).toBe(1);
    // But this might not be the expected behavior
  });

  // Bug exposure test: zero pageSize should be corrected to 1
  it("should handle zero pageSize", () => {
    const { result } = renderHook(() => usePagination(100, 0));

    expect(result.current.totalPages).toBe(100); // 100 items with pageSize 1
    expect(result.current.pageSize).toBe(1); // Corrected to minimum 1
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(0); // 0 + 1 - 1 = 0
  });

  // Bug exposure test: negative pageSize should be corrected to 1
  it("should handle negative pageSize", () => {
    const { result } = renderHook(() => usePagination(100, -10));

    expect(result.current.totalPages).toBe(100); // 100 items with pageSize 1
    expect(result.current.pageSize).toBe(1); // Corrected to minimum 1
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(0); // 0 + 1 - 1 = 0
  });

  it("should handle very large numbers", () => {
    const { result } = renderHook(() => usePagination(1000000, 100));

    expect(result.current.totalPages).toBe(10000);
    expect(result.current.canNext).toBe(true);
  });
});