import { useState } from 'react';
import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, User, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  question: QuestionRow | null;
  onUpdated?: () => void;
}

const QuestionDetail = ({ question, onUpdated }: Props) => {
  const [answer, setAnswer] = useState('');
  const [key, setKey] = useState('');
  const [publishing, setPublishing] = useState(false);

  if (question && question.id !== key) {
    setKey(question.id);
    setAnswer(question.ai_suggested_answer ?? '');
  }

  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Seleccioná una pregunta para responder</p>
        </div>
      </div>
    );
  }

  const date = new Date(question.created_at);
  const elapsed = isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true, locale: es });

  const handlePublish = async () => {
    setPublishing(true);
    const { error } = await supabase
      .from('questions')
      .update({
        final_answer: answer,
        status: 'published',
        answered_at: new Date().toISOString(),
      })
      .eq('id', question.id);
    setPublishing(false);
    if (error) {
      toast.error('Error al publicar: ' + error.message);
    } else {
      toast.success('Respuesta publicada correctamente');
      onUpdated?.();
    }
  };

  const handleDiscard = async () => {
    const { error } = await supabase
      .from('questions')
      .update({ status: 'archived' })
      .eq('id', question.id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.info('Pregunta archivada');
      onUpdated?.();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col p-6 overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={question.ai_category} />
            <span className="text-xs text-muted-foreground">{elapsed}</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {question.product_title ?? 'Producto'}
          </h2>
          <p className="text-xs text-muted-foreground font-mono">{question.product_meli_id}</p>
        </div>

        {/* Question */}
        <div className="glass-panel rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{question.buyer_id ?? 'Comprador'}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.question_text}</p>
        </div>

        {/* AI Answer */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Respuesta Sugerida por IA</span>
          </div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="flex-1 min-h-[140px] bg-muted/30 border-border/50 resize-none text-sm leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
          <Button onClick={handlePublish} disabled={publishing || !answer.trim()} className="gap-2">
            <Send className="w-4 h-4" />
            Publicar Respuesta
          </Button>
          <Button variant="outline" onClick={handleDiscard} className="gap-2">
            <X className="w-4 h-4" />
            Archivar
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionDetail;
