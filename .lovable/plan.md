

## Plan: Auto-trigger AI Copilot on Question Load

**Goal**: When a question is selected, automatically invoke the AI Copilot so the answer textarea starts with the copilot-generated draft (not the simple `ai_suggested_answer` from sync).

### Current Flow
1. `QuestionDetail` loads → sets `answer` to `question.ai_suggested_answer` (basic sync value)
2. `AICopilotPanel` shows a manual "Sugerir respuesta con IA" button
3. User clicks → copilot runs → user clicks "Usar este borrador" → answer updates

### New Flow
1. `QuestionDetail` loads → sets `answer` to empty or `ai_suggested_answer` as fallback
2. `AICopilotPanel` auto-triggers `fetchCopilot()` on mount (for pending questions only)
3. Once the copilot returns, it auto-applies the draft to the answer textarea via `onUseDraft`
4. User sees the copilot result (summary, missing data, tone options) and can regenerate or edit

### Changes

**`src/components/AICopilotPanel.tsx`**:
- Add a `useEffect` that calls `fetchCopilot()` automatically on mount (when `question.id` changes)
- Add an `autoApply` flag: when the copilot result comes back from auto-trigger, call `onUseDraft(draft)` automatically instead of requiring a button click
- Keep the "Usar este borrador" button for subsequent regenerations (tone changes, manual retriggers)
- Skip auto-trigger if question status is `published` or `archived`

**`src/components/QuestionDetail.tsx`**:
- Keep `answer` initialized to `ai_suggested_answer` as immediate fallback (shown while copilot loads)
- No other changes needed since `onUseDraft` already calls `setAnswer`

### UX Behavior
- On question select: answer textarea shows `ai_suggested_answer` immediately, copilot starts loading
- When copilot finishes: answer textarea updates to the richer AI draft, toast confirms
- User can change tone, regenerate, or manually edit the text at any time
- Published/archived questions skip auto-trigger (current guard already handles this)

