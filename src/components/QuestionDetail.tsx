import { useState } from 'react';
import type { QuestionWithProduct } from '@/pages/Inbox';
import CategoryBadge from './CategoryBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, User, Package, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  question: QuestionWithProduct | null;
  onPublish: (id: string) => void;
  onDiscard: (id: string) => void;
  isUpdating: boolean;
}

const QuestionDetail = ({ question, onPublish, onDiscard, isUpdating }: Props) => {
  const [answer, setAnswer] = useState('');
  const [key, setKey] = useState('');

  if (question && question.id !== key) {
    setKey(question.id);
    setAnswer(question.suggested_answer || '');
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

  const elapsed = formatDistanceToNow(new Date(question.created_at), { addSuffix: true, locale: es });

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
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={question.category} />
            <span className="text-xs text-muted-foreground">{elapsed}</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{question.products.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{question.products.ml_product_id}</p>
        </div>

        <div className="glass-panel rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{question.buyer_name}</span>
            <span className="text-xs text-muted-foreground">({question.buyer_id})</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.question_text}</p>
        </div>

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

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
          <Button onClick={() => onPublish(question.id)} disabled={isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar Respuesta
          </Button>
          <Button variant="outline" onClick={() => onDiscard(question.id)} disabled={isUpdating} className="gap-2">
            <X className="w-4 h-4" />
            Descartar
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionDetail;
