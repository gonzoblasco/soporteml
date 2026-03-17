import { describe, it, expect } from "vitest";
import { groupQuestions } from "../lib/groupQuestions";
import type { QuestionRow } from "../types/question";

describe("groupQuestions", () => {
  const createMockQuestion = (overrides: Partial<QuestionRow>): QuestionRow => ({
    id: "q1",
    company_id: "comp1",
    product_id: "prod1",
    meli_question_id: "meli1",
    buyer_id: "buyer1",
    buyer_nickname: "buyer_nick1",
    question_text: "Test question",
    status: "pending",
    ai_suggested_answer: null,
    ai_category: null,
    ai_confidence: null,
    ai_decision_reason: null,
    auto_action: null,
    answered_by_ai: false,
    final_answer: null,
    answered_by: null,
    created_at: "2024-01-01T10:00:00Z",
    answered_at: null,
    requires_human: false,
    requires_human_reason: null,
    meli_status: null,
    meli_permalink: null,
    product_title: "Test Product",
    product_meli_id: "meli_prod1",
    product_permalink: "https://example.com",
    product_price: 100,
    ...overrides,
  });

  it("should group questions by buyer_id and product_id", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({ id: "q1", buyer_id: "buyer1", product_id: "prod1" }),
      createMockQuestion({ id: "q2", buyer_id: "buyer1", product_id: "prod1" }),
    ];

    const groups = groupQuestions(questions);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("buyer1::prod1");
    expect(groups[0].questions).toHaveLength(2);
  });

  it("should not group questions without buyer_id or product_id", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({ id: "q1", buyer_id: null, product_id: "prod1" }),
      createMockQuestion({ id: "q2", buyer_id: "buyer1", product_id: null }),
      createMockQuestion({ id: "q3", buyer_id: null, product_id: null }),
    ];

    const groups = groupQuestions(questions);
    expect(groups).toHaveLength(3);
    expect(groups.every(g => g.questions.length === 1)).toBe(true);
  });

  it("should sort groups by latest activity (most recent first)", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({ id: "q1", buyer_id: "buyer1", product_id: "prod1", created_at: "2024-01-01T10:00:00Z" }),
      createMockQuestion({ id: "q2", buyer_id: "buyer2", product_id: "prod2", created_at: "2024-01-02T10:00:00Z" }),
      createMockQuestion({ id: "q3", buyer_id: "buyer3", product_id: "prod3", created_at: "2024-01-01T12:00:00Z" }),
    ];

    const groups = groupQuestions(questions);
    expect(groups).toHaveLength(3);
    expect(groups[0].latest_at).toBe("2024-01-02T10:00:00Z");
    expect(groups[1].latest_at).toBe("2024-01-01T12:00:00Z");
    expect(groups[2].latest_at).toBe("2024-01-01T10:00:00Z");
  });

  it("should update buyer_nickname when latest_at changes", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({
        id: "q1",
        buyer_id: "buyer1",
        product_id: "prod1",
        buyer_nickname: "old_nick",
        created_at: "2024-01-01T10:00:00Z"
      }),
      createMockQuestion({
        id: "q2",
        buyer_id: "buyer1",
        product_id: "prod1",
        buyer_nickname: "new_nick",
        created_at: "2024-01-02T10:00:00Z"
      }),
    ];

    const groups = groupQuestions(questions);
    expect(groups[0].buyer_nickname).toBe("new_nick");
  });

  // Bug exposure test: buyer_nickname should be updated even if null
  it("should update buyer_nickname to null when newer question has null nickname", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({
        id: "q1",
        buyer_id: "buyer1",
        product_id: "prod1",
        buyer_nickname: "old_nick",
        created_at: "2024-01-01T10:00:00Z"
      }),
      createMockQuestion({
        id: "q2",
        buyer_id: "buyer1",
        product_id: "prod1",
        buyer_nickname: null,
        created_at: "2024-01-02T10:00:00Z"
      }),
    ];

    const groups = groupQuestions(questions);
    // Currently this fails - buyer_nickname stays "old_nick" instead of becoming null
    expect(groups[0].buyer_nickname).toBe(null);
  });

  it("should handle empty questions array", () => {
    const groups = groupQuestions([]);
    expect(groups).toEqual([]);
  });

  it("should handle single question", () => {
    const questions = [createMockQuestion({ id: "q1" })];
    const groups = groupQuestions(questions);
    expect(groups).toHaveLength(1);
    expect(groups[0].questions).toHaveLength(1);
  });

  // Bug exposure test: invalid date strings in sorting
  it("should handle invalid date strings in sorting", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({ id: "q1", buyer_id: "buyer1", product_id: "prod1", created_at: "2024-01-01T10:00:00Z" }),
      createMockQuestion({ id: "q2", buyer_id: "buyer2", product_id: "prod2", created_at: "invalid-date" }),
      createMockQuestion({ id: "q3", buyer_id: "buyer3", product_id: "prod3", created_at: "2024-01-02T10:00:00Z" }),
    ];

    // This should not throw and should handle invalid dates gracefully
    expect(() => groupQuestions(questions)).not.toThrow();
    const groups = groupQuestions(questions);
    expect(groups).toHaveLength(3);
  });

  it("should preserve product information from first question in group", () => {
    const questions: QuestionRow[] = [
      createMockQuestion({
        id: "q1",
        buyer_id: "buyer1",
        product_id: "prod1",
        product_title: "Product 1",
        created_at: "2024-01-01T10:00:00Z"
      }),
      createMockQuestion({
        id: "q2",
        buyer_id: "buyer1",
        product_id: "prod1",
        product_title: "Product 2", // This should be ignored
        created_at: "2024-01-02T10:00:00Z"
      }),
    ];

    const groups = groupQuestions(questions);
    expect(groups[0].product_title).toBe("Product 1");
  });
});