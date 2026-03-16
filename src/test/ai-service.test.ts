import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAiAnswer, generateCopilotDraft } from '../../supabase/functions/_shared/ai-service';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock Deno
vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({}), { virtual: true });

const mockDenoEnv = vi.fn((key: string) => {
  if (key === 'AI_API_KEY') return 'test-key';
  if (key === 'AI_MODEL') return 'gpt-4o-mini';
  return undefined;
});

Object.defineProperty(global, 'Deno', {
  value: {
    env: {
      get: mockDenoEnv,
    },
  },
  writable: true,
});

describe('generateAiAnswer', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockDenoEnv.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default values when AI_API_KEY is not set', async () => {
    mockDenoEnv.mockReturnValueOnce(undefined);

    const result = await generateAiAnswer('test question', 'test context', {});

    expect(result).toEqual({
      answer: '',
      category: 'Otro',
      requires_human: false,
      requires_human_reason: '',
      confidence: 0,
    });
  });

  it('successfully generates AI answer', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '{"answer": "Test answer", "category": "Precio", "requires_human": false, "requires_human_reason": "", "confidence": 0.9}'
        }
      }]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateAiAnswer('¿Cuánto cuesta?', 'Producto: Test - $100', {});

    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
    expect(result).toEqual({
      answer: 'Test answer',
      category: 'Precio',
      requires_human: false,
      requires_human_reason: '',
      confidence: 0.9,
    });
  });

  it('handles AI API error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API Error'),
    });

    const result = await generateAiAnswer('test', 'context', {});

    expect(result).toEqual({
      answer: '',
      category: 'Otro',
      requires_human: false,
      requires_human_reason: '',
      confidence: 0,
    });
  });

  it('handles malformed JSON response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Invalid JSON'
        }
      }]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateAiAnswer('test', 'context', {});

    expect(result.answer).toBe('Invalid JSON');
    expect(result.category).toBe('Otro');
  });

  it('includes custom instructions in prompt', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '{"answer": "Test", "category": "Otro", "requires_human": false, "requires_human_reason": "", "confidence": 0.5}'
        }
      }]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await generateAiAnswer('test', 'context', { aiCustomInstructions: 'Custom instruction' });

    const callArgs = fetchMock.mock.calls[0][1];
    const messages = JSON.parse(callArgs.body).messages;
    expect(messages[0].content).toContain('Custom instruction');
  });
});

describe('generateCopilotDraft', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockDenoEnv.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when AI_API_KEY is not set', async () => {
    mockDenoEnv.mockReturnValueOnce(undefined);

    const result = await generateCopilotDraft('test question', 'test context', {});

    expect(result).toEqual({
      summary: 'Error: AI_API_KEY not configured',
      draft: '',
      missing_data: [],
    });
  });

  it('successfully generates copilot draft', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: '{"summary": "Test summary", "draft": "Test draft", "missing_data": ["color"]}'
        }
      }]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateCopilotDraft('¿Qué colores hay?', 'Producto: Camisa', {
      aiTone: 'amigable',
      buyerNickname: 'Juan',
      productTitle: 'Camisa',
      productPrice: 50,
    });

    expect(result).toEqual({
      summary: 'Test summary',
      draft: 'Test draft',
      missing_data: ['color'],
    });

    const callArgs = fetchMock.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.messages[0].content).toContain('amigable');
    expect(body.messages[1].content).toContain('Juan');
    expect(body.messages[1].content).toContain('Camisa');
    expect(body.messages[1].content).toContain('$50');
  });

  it('handles AI API error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API Error'),
    });

    const result = await generateCopilotDraft('test', 'context', {});

    expect(result).toEqual({
      summary: 'Error al generar la respuesta.',
      draft: '',
      missing_data: [],
    });
  });

  it('handles malformed JSON response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Plain text response'
        }
      }]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateCopilotDraft('test', 'context', {});

    expect(result).toEqual({
      summary: 'No pude analizar la pregunta automáticamente.',
      draft: 'Plain text response',
      missing_data: [],
    });
  });
});