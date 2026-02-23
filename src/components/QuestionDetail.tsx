import { useState } from 'react';
import type { Question } from '@/data/mockData';
import CategoryBadge from './CategoryBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, User, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  question: Question | null;
}

const QuestionDetail = ({ question }: Props) => {
  const [answer, setAnswer] = useState('');
  const [key, setKey] = useState('');

  // Reset answer when question changes
  if (question && question.id !== key) {
    setKey(question.id);
    setAnswer(question.suggestedAnswer);
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

  const elapsed = formatDistanceToNow(question.createdAt, { addSuffix: true, locale: es });

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
            <CategoryBadge category={question.category} />
            <span className="text-xs text-muted-foreground">{elapsed}</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{question.productName}</h2>
          <p className="text-xs text-muted-foreground font-mono">{question.productId}</p>
        </div>

        {/* Question */}
        <div className="glass-panel rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{question.buyerName}</span>
            <span className="text-xs text-muted-foreground">({question.buyerId})</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{question.questionText}</p>
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
          <Button
            onClick={() => toast.success('Respuesta publicada correctamente')}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Publicar Respuesta
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Pregunta descartada')}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Descartar
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionDetail;
