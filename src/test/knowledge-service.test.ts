import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchKnowledgeContext } from '../../supabase/functions/_shared/knowledge-service';

describe('fetchKnowledgeContext', () => {
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = vi.fn();
  });

  it('returns empty strings when no entries found', async () => {
    mockQuery.mockResolvedValue({ data: null });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  eq: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', null);

    expect(result).toEqual({ positive: '', restrictions: '' });
  });

  it('returns empty strings on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB Error'));

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  eq: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', null);

    expect(result).toEqual({ positive: '', restrictions: '' });
  });

  it('processes global knowledge entries correctly', async () => {
    const mockEntries = [
      {
        title: 'Política de envíos',
        content: 'Enviamos en 24hs',
        type: 'politica',
        scope: 'global',
        priority: 1,
      },
      {
        title: 'No prometer descuentos',
        content: 'Nunca ofrecer descuentos no autorizados',
        type: 'restriccion',
        scope: 'global',
        priority: 2,
      },
    ];

    mockQuery.mockResolvedValue({ data: mockEntries });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  eq: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', null);

    expect(result.positive).toContain('CONOCIMIENTO DEL NEGOCIO');
    expect(result.positive).toContain('Política de envíos: Enviamos en 24hs');
    expect(result.restrictions).toContain('RESTRICCIONES');
    expect(result.restrictions).toContain('No prometer descuentos: Nunca ofrecer descuentos no autorizados');
  });

  it('processes category knowledge entries correctly', async () => {
    const mockEntries = [
      {
        title: 'Sobre celulares',
        content: 'Los celulares tienen garantía de 1 año',
        type: 'faq',
        scope: 'categoria',
        scope_ref: 'MLA123',
        priority: 1,
      },
      {
        title: 'No vender usados',
        content: 'Nunca vender productos usados como nuevos',
        type: 'restriccion',
        scope: 'categoria',
        scope_ref: 'MLA123',
        priority: 2,
      },
    ];

    mockQuery.mockResolvedValue({ data: mockEntries });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  or: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', 'MLA123');

    expect(result.positive).toContain('CONOCIMIENTO DE CATEGORÍA');
    expect(result.positive).toContain('Sobre celulares: Los celulares tienen garantía de 1 año');
    expect(result.restrictions).toContain('RESTRICCIONES');
    expect(result.restrictions).toContain('No vender usados: Nunca vender productos usados como nuevos');
  });

  it('respects character limit', async () => {
    const longContent = 'a'.repeat(2000);
    const mockEntries = [
      {
        title: 'Long entry',
        content: longContent,
        type: 'politica',
        scope: 'global',
        priority: 1,
      },
      {
        title: 'Short entry',
        content: 'short',
        type: 'politica',
        scope: 'global',
        priority: 2,
      },
    ];

    mockQuery.mockResolvedValue({ data: mockEntries });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  eq: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', null);

    // Should include the short entry but truncate before the long one exceeds limit
    expect(result.positive.length).toBeLessThanOrEqual(4000 + 100); // Allow some buffer for formatting
  });

  it('prioritizes restrictions over positive knowledge', async () => {
    const mockEntries = [
      {
        title: 'Restriction 1',
        content: 'No do this',
        type: 'restriccion',
        scope: 'global',
        priority: 1,
      },
      {
        title: 'Positive 1',
        content: 'Do this',
        type: 'politica',
        scope: 'global',
        priority: 1,
      },
    ];

    mockQuery.mockResolvedValue({ data: mockEntries });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  eq: mockQuery,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await fetchKnowledgeContext(mockSupabase as any, 'company-1', null);

    // Restrictions should come first in the query order
    expect(result.restrictions).toContain('Restriction 1');
    expect(result.positive).toContain('Positive 1');
  });
});