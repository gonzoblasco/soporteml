

# Fase 3: Sugerencias proactivas de Conocimiento — Plan

## Decisiones del feedback

1. **Criterio = solo tipos críticos faltantes** (0 entries de `politica`, `restriccion`, o `faq`). Sin medir calidad. Tono suave: "podrías mejorar esto".
2. **Independiente de CRM suggestions** — max 2 knowledge suggestions, siempre visibles si existen, bloque compacto separado.
3. **Solo gaps globales en v1** — no sugerir por categoría todavía (Fase 3.1).
4. **Anti-spam** — max 1 sugerencia mostrada por sesión (dedup client-side con `useRef<Set>`). Si ya se vio "faltan políticas" en esta sesión, no repetir.

## Cambios

### 1. `ai-copilot/index.ts` — generar `knowledge_suggestions`

Después de fetchear `kEntries`, contar tipos globales existentes:

```text
const globalTypes = new Set(kEntries?.filter(e => e.scope === 'global').map(e => e.type));
const suggestions = [];
if (!globalTypes.has('politica')) suggestions.push({ message: "Podrías agregar una política de envíos o devoluciones para mejorar las respuestas", type: "politica" });
if (!globalTypes.has('restriccion')) suggestions.push({ message: "Definí qué no prometer a los compradores para evitar respuestas riesgosas", type: "restriccion" });
if (!globalTypes.has('faq')) suggestions.push({ message: "Agregá preguntas frecuentes para respuestas más completas", type: "faq" });
// Max 2
parsed.knowledge_suggestions = suggestions.slice(0, 2);
```

### 2. `AICopilotPanel.tsx` — renderizar + anti-spam

- Add `knowledge_suggestions` to `CopilotResult` interface
- Add `useRef<Set<string>>` for `dismissedKnowledgeSuggestionsRef` (session-scoped, persists across question changes)
- Filter out already-seen suggestions by `type`
- After rendering, mark types as seen
- Render as compact block with `BookOpen` icon + link to `/knowledge`
- Use `useNavigate` from react-router-dom

### 3. Files

| File | Change |
|---|---|
| `supabase/functions/ai-copilot/index.ts` | Count global types, generate max 2 `knowledge_suggestions` |
| `src/components/AICopilotPanel.tsx` | Render suggestions with session dedup |
| `.lovable/plan.md` | Mark Fase 3 done |
| `CHANGELOG.md` | Document |

No database changes needed.

