import { useState } from 'react';
import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, User, Package, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  question: QuestionRow | null;
  onUpdated?: () => void;
}

const QuestionDetail = ({ question, onUpdated }: Props) => {
  const [answer, setAnswer] = useState('');
  const [key, setKey] = useState('');
  const [publishing, setPublishing] = useState(false);
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

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
    const { data, error } = await supabase.functions.invoke('publish-meli-answer', {
      body: { question_id: question.id, answer: answer.trim() },
    });
    setPublishing(false);
    if (error) {
      toast.error('Error al publicar en MercadoLibre: ' + (error.message || 'Error desconocido'));
    } else if (data?.error) {
      toast.error('Error de MeLi: ' + (data.details || data.error));
    } else {
      toast.success('Respuesta publicada en MercadoLibre');
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

  const handleRestore = async () => {
    const { error } = await supabase
      .from('questions')
      .update({ status: 'pending' })
      .eq('id', question.id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('Pregunta restaurada a pendientes');
      onUpdated?.();
    }
  };

  const handleSoftDelete = async () => {
    const { error } = await supabase
      .from('questions')
      .update({ status: 'deleted' })
      .eq('id', question.id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('Pregunta movida a la papelera');
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
            {question.product_permalink ? (
              <a
                href={question.product_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline inline-flex items-center gap-1.5"
              >
                {question.product_title ?? 'Producto'}
                <ExternalLink className="w-4 h-4 shrink-0 opacity-50" />
              </a>
            ) : (
              question.product_title ?? 'Producto'
            )}
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

        {/* Answer */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {question.status === 'published' ? 'Respuesta Publicada' : 'Respuesta Sugerida por IA'}
            </span>
          </div>
          {question.status === 'published' ? (
            <div className="flex-1 min-h-[140px] bg-muted/30 border border-border/50 rounded-md p-3 text-sm leading-relaxed text-foreground">
              {question.final_answer ?? answer}
            </div>
          ) : (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="flex-1 min-h-[140px] bg-muted/30 border-border/50 resize-none text-sm leading-relaxed"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
          {question.status === 'archived' ? (
            <>
              <Button onClick={handleRestore} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Restaurar a Pendientes
              </Button>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta pregunta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La pregunta será movida a la papelera. Podrás restaurarla o eliminarla definitivamente desde Settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sí, eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          ) : question.status === 'published' ? null : (
            <>
              <Button onClick={handlePublish} disabled={publishing || !answer.trim()} className="gap-2">
                <Send className="w-4 h-4" />
                Publicar Respuesta
              </Button>
              <Button variant="outline" onClick={handleDiscard} className="gap-2">
                <X className="w-4 h-4" />
                Archivar
              </Button>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta pregunta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La pregunta será movida a la papelera. Podrás restaurarla o eliminarla definitivamente desde Settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sí, eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionDetail;
