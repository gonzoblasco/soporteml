import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCopilotSuggestion, type CopilotRequestPayload } from './ai';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => {
  const invoke = vi.fn();
  return {
    supabase: {
      functions: {
        invoke,
      },
    },
  };
});

const mockedInvoke = (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>);

const basePayload: CopilotRequestPayload = {
  question: {
    question_text: '¿Este producto tiene garantía?',
    product_title: 'Producto de prueba',
    product_price: 100,
    buyer_nickname: 'comprador123',
    ai_category: 'postventa',
    ai_suggested_answer: null,
    product_id: 'prod_1',
  },
  aiTone: 'profesional',
  aiCustomInstructions: null,
};

describe('fetchCopilotSuggestion', () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it('construye correctamente el payload y devuelve el resultado tipado', async () => {
    mockedInvoke.mockResolvedValueOnce({
      data: {
        summary: 'Resumen',
        draft: 'Borrador',
        missing_data: [],
      },
      error: null,
    });

    const result = await fetchCopilotSuggestion(basePayload);

    expect(mockedInvoke).toHaveBeenCalledWith('ai-copilot', {
      body: expect.objectContaining({
        question_text: basePayload.question.question_text,
        product_title: basePayload.question.product_title,
        ai_tone: basePayload.aiTone,
        ai_custom_instructions: basePayload.aiCustomInstructions,
      }),
    });

    expect(result.summary).toBe('Resumen');
    expect(result.draft).toBe('Borrador');
  });

  it('lanza error cuando supabase devuelve error', async () => {
    mockedInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Fallo' },
    });

    await expect(fetchCopilotSuggestion(basePayload)).rejects.toThrow('Fallo');
  });

  it('lanza error cuando la respuesta es null', async () => {
    mockedInvoke.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(fetchCopilotSuggestion(basePayload)).rejects.toThrow('Respuesta vacía del copiloto');
  });
});

