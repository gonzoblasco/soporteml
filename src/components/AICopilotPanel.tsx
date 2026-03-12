import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { QuestionRow } from '@/types/question';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Sparkles, RotateCcw, Loader2, AlertCircle, ClipboardList, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CrmSuggestion {
  message: string;
  tab?: string;
}

interface KnowledgeSuggestion {
  message: string;
  type: string;
}

interface CopilotResult {
  summary: string;
  draft: string;
  missing_data: string[];
  crm_suggestions?: CrmSuggestion[];
  knowledge_suggestions?: KnowledgeSuggestion[];
}

interface Props {
  question: QuestionRow;
  onUseDraft: (draft: string) => void;
  onOpenCrmDrawer?: (tab?: string) => void;
}

const TONE_OPTIONS = [
  { value: 'breve', label: 'Breve', description: 'Corta y directa' },
  { value: 'cálida', label: 'Cálida', description: 'Amable y cercana' },
  { value: 'técnica', label: 'Técnica', description: 'Precisa y detallada' },
] as const;

type ToneValue = typeof TONE_OPTIONS[number]['value'];

const AICopilotPanel = ({ question, onUseDraft, onOpenCrmDrawer }: Props) => {
  const { currentCompanyId } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [activeTone, setActiveTone] = useState<ToneValue | null>(null);
  const autoApplyRef = useRef(false);
  const lastQuestionIdRef = useRef<string | null>(null);
  const seenKnowledgeSuggestionsRef = useRef<Set<string>>(new Set());

  const fetchCopilot = async (toneOverride?: ToneValue, isAutoTrigger = false) => {
    setLoading(true);
    setError(null);
    setCheckedItems(new Set());
    if (isAutoTrigger) autoApplyRef.current = true;

    // Fetch AI settings for tone/instructions
    let aiTone = 'profesional';
    let aiCustomInstructions: string | null = null;
    if (currentCompanyId) {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('ai_tone, ai_custom_instructions')
        .eq('company_id', currentCompanyId)
        .maybeSingle();
      if (settings) {
        aiTone = settings.ai_tone;
        aiCustomInstructions = settings.ai_custom_instructions;
      }
    }

    // Override with user-selected tone variant
    if (toneOverride) {
      aiTone = toneOverride;
      setActiveTone(toneOverride);
    }

    const { data, error: fnError } = await supabase.functions.invoke('ai-copilot', {
      body: {
        question_text: question.question_text,
        product_title: question.product_title,
        product_price: question.product_price,
        buyer_nickname: question.buyer_nickname,
        ai_category: question.ai_category,
        ai_suggested_answer: question.ai_suggested_answer,
        ai_tone: aiTone,
        ai_custom_instructions: aiCustomInstructions,
        product_id: question.product_id || undefined,
      },
    });

    setLoading(false);

    if (fnError) {
      const msg = fnError.message || 'Error al consultar el copiloto';
      setError(msg);
      toast.error(msg);
      autoApplyRef.current = false;
      return;
    }

    if (data?.error) {
      setError(data.error);
      toast.error(data.error);
      autoApplyRef.current = false;
      return;
    }

    const copilotResult = data as CopilotResult;
    setResult(copilotResult);

    // Auto-apply draft on initial load
    if (autoApplyRef.current && copilotResult.draft) {
      onUseDraft(copilotResult.draft);
      autoApplyRef.current = false;
    }
  };

  // Auto-trigger on question change (pending questions only, and only if no AI answer already exists)
  useEffect(() => {
    const isPending = question.status === 'pending' || question.status === 'needs_human';
    const isNewQuestion = lastQuestionIdRef.current !== question.id;
    lastQuestionIdRef.current = question.id;

    if (isNewQuestion && isPending) {
      setResult(null);
      setError(null);
      setActiveTone(null);

      // If the sync already generated an answer, don't auto-trigger the copilot
      if (question.ai_suggested_answer) {
        // No auto-trigger — the textarea already has the sync-generated answer
        return;
      }

      fetchCopilot(undefined, true);
    }
  }, [question.id]);

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Not yet requested (only for non-pending questions that didn't auto-trigger)
  if (!result && !loading && !error) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <Button
          variant="outline"
          onClick={() => fetchCopilot()}
          className="w-full gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          Sugerir respuesta con IA
        </Button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={loading ? 'loading' : 'result'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Copiloto IA</span>
          </div>
          {!loading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fetchCopilot(activeTone ?? undefined)}
              title="Regenerar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Tone variants */}
        {!loading && result && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-1">Tono:</span>
            {TONE_OPTIONS.map(t => (
              <Button
                key={t.value}
                variant={activeTone === t.value ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2.5 text-[11px] rounded-full"
                onClick={() => fetchCopilot(t.value)}
                title={t.description}
              >
                {t.label}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analizando pregunta…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : result ? (
          <>
            {/* Summary */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Resumen</p>
              <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
            </div>

            {/* Draft */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Borrador sugerido</p>
              <div className="rounded-md bg-background/60 border border-border/30 p-3 text-sm leading-relaxed text-foreground">
                {result.draft}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-1.5 text-xs"
                onClick={() => {
                  onUseDraft(result.draft);
                  toast.success('Borrador aplicado al editor');
                }}
              >
                <Sparkles className="w-3 h-3" />
                Usar este borrador
              </Button>
            </div>

            {/* Missing data checklist */}
            {result.missing_data.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList className="w-3.5 h-3.5 text-warning" />
                  <p className="text-xs font-medium text-muted-foreground">Datos faltantes</p>
                </div>
                <div className="space-y-1.5">
                  {result.missing_data.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2 cursor-pointer group"
                    >
                      <Checkbox
                        checked={checkedItems.has(idx)}
                        onCheckedChange={() => toggleCheck(idx)}
                        className="mt-0.5"
                      />
                      <span className={`text-xs leading-relaxed transition-colors ${checkedItems.has(idx) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* CRM Suggestions from quality loop */}
            {result.crm_suggestions && result.crm_suggestions.length > 0 && onOpenCrmDrawer && (
              <div className="rounded-md bg-accent/50 border border-border/30 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[11px] font-medium text-primary">Mejorá tu catálogo</p>
                </div>
                {result.crm_suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOpenCrmDrawer(s.tab)}
                    className="block w-full text-left text-[11px] text-foreground hover:text-primary transition-colors leading-relaxed"
                  >
                    → {s.message}
                  </button>
                ))}
              </div>
            )}

            {/* Knowledge gap suggestions */}
            {(() => {
              const unseen = (result.knowledge_suggestions || []).filter(s => !seenKnowledgeSuggestionsRef.current.has(s.type));
              if (unseen.length === 0) return null;
              // Show max 1 per render, mark as seen
              const toShow = unseen.slice(0, 1);
              toShow.forEach(s => seenKnowledgeSuggestionsRef.current.add(s.type));
              return (
                <div className="rounded-md bg-muted/50 border border-border/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-medium text-muted-foreground">Mejorá tu base de conocimiento</p>
                  </div>
                  {toShow.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate('/knowledge')}
                      className="block w-full text-left text-[11px] text-foreground hover:text-primary transition-colors leading-relaxed"
                    >
                      💡 {s.message}
                    </button>
                  ))}
                </div>
              );
            })()}
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};

export default AICopilotPanel;
