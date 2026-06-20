import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Package, RotateCcw, Trash2, ExternalLink, Save } from 'lucide-react';
import TemplatePicker from './TemplatePicker';
import AICopilotPanel from './AICopilotPanel';
import ProductSideCard from './ProductSideCard';
import { ProductFormDrawer } from './catalog/ProductFormDrawer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgoEs } from '@/lib/timeAgo';
import ThreadSummary from './ThreadSummary';

interface Props {
  question: QuestionRow | null;
  /** All questions belonging to the same hilo (buyer+product), incl. the selected one. */
  thread?: QuestionRow[];
  onUpdated?: () => void;
}

const QuestionDetail = ({ question, thread, onUpdated }: Props) => {
  const [answer, setAnswer] = useState('');
  const [key, setKey] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
  const [crmDrawerTab, setCrmDrawerTab] = useState<string | undefined>();
  const { userRole, companyId } = useAuth();
  const isAdmin = userRole === 'admin';
  const isMobile = useIsMobile();

  useEffect(() => {
    if (question) {
      setKey(question.id);
      setAnswer(question.ai_suggested_answer ?? '');
    }
  }, [question?.id]);

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
  const elapsed = isNaN(date.getTime()) ? '' : timeAgoEs(question.created_at);

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

  const handleSaveAsTemplate = async () => {
    if (!companyId || !answer.trim()) return;
    setSavingTemplate(true);
    const { error } = await supabase
      .from('templates')
      .insert({
        company_id: companyId,
        title: (question.question_text ?? '').slice(0, 60) || 'Sin título',
        category: (question.ai_category ?? 'general').toLowerCase(),
        content: answer.trim(),
        variables: [],
      });
    setSavingTemplate(false);
    if (error) {
      toast.error('Error al guardar plantilla: ' + error.message);
    } else {
      toast.success('Guardada como plantilla');
    }
  };

  const templateVars: Record<string, string> = {
    producto: question.product_title ?? '',
    nombre: question.buyer_nickname ?? '',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex overflow-hidden"
      >
        {/* Main content */}
        <div className={`flex-1 flex flex-col p-6 ${isMobile ? 'pb-24' : ''} overflow-y-auto space-y-4`}>
          {/* Thread summary (2+ messages) */}
          {thread && thread.length >= 2 && (
            <ThreadSummary thread={thread} companyId={companyId} />
          )}
          {/* Question Block — muted background */}
          <div className="rounded-lg bg-muted/50 p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={question.ai_category} />
              <span className="text-xs text-muted-foreground">
                {question.buyer_nickname ?? question.buyer_id ?? 'Comprador'} · {elapsed}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{question.question_text}</p>
            <p className="text-xs text-muted-foreground">
              Producto:{' '}
              {question.product_permalink ? (
                <a
                  href={question.product_permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline inline-flex items-center gap-1"
                >
                  {question.product_title ?? 'Producto'}
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                </a>
              ) : (
                question.product_title ?? 'Producto'
              )}
              {question.product_price != null && (
                <span> — ${question.product_price.toLocaleString('es-AR')}</span>
              )}
            </p>
          </div>

          {/* AI Copilot — only for non-published */}
          {question.status !== 'published' && (
            <AICopilotPanel
              question={question}
              onUseDraft={(draft) => setAnswer(draft)}
              onOpenCrmDrawer={(tab) => {
                setCrmDrawerTab(tab);
                setCrmDrawerOpen(true);
              }}
            />
          )}

          {/* AI Suggestion Block — primary tinted */}
          <div className="rounded-lg bg-muted/60 p-4 border border-border/40 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {question.status === 'published' ? 'Respuesta Publicada' : 'Respuesta'}
              </span>
            </div>
            {question.status === 'published' ? (
              <div className="flex-1 min-h-[120px] text-sm leading-relaxed text-foreground">
                {question.final_answer ?? answer}
              </div>
            ) : (
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Editá la respuesta o usá el copiloto para generar un borrador…"
                className="flex-1 min-h-[120px] bg-background/50 border-primary/10 resize-none text-sm leading-relaxed"
              />
            )}
          </div>

          {/* Actions - Desktop */}
          {!isMobile && (
            <div className="flex items-center gap-2 flex-wrap">
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
                          <AlertDialogDescription>La pregunta será movida a la papelera.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : question.status === 'published' ? null : (
                <>
                  <TemplatePicker onSelect={(text) => setAnswer(text)} variables={templateVars} />
                  <Button onClick={handlePublish} disabled={publishing || !answer.trim()} className="gap-2 flex-1 sm:flex-none">
                    <Send className="w-4 h-4" />
                    Publicar respuesta
                  </Button>
                  {isAdmin && answer.trim() && (
                    <Button variant="outline" size="sm" onClick={handleSaveAsTemplate} disabled={savingTemplate} className="gap-1.5 text-xs">
                      <Save className="w-3.5 h-3.5" />
                      Guardar como plantilla
                    </Button>
                  )}
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
                          <AlertDialogDescription>La pregunta será movida a la papelera.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Actions */}
        {isMobile && question.status !== 'published' && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border p-3 flex items-center gap-2">
            {question.status === 'archived' ? (
              <Button onClick={handleRestore} className="flex-1 gap-2" size="sm">
                <RotateCcw className="w-4 h-4" />
                Restaurar
              </Button>
            ) : (
              <>
                <Button onClick={handlePublish} disabled={publishing || !answer.trim()} className="flex-1 gap-2" size="sm">
                  <Send className="w-4 h-4" />
                  Publicar
                </Button>
                <Button variant="outline" onClick={handleDiscard} size="sm" className="gap-1.5">
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Product Side Card */}
        <ProductSideCard
          meliItemId={question.product_meli_id}
          productId={question.product_id}
          fallbackTitle={question.product_title}
          fallbackPrice={question.product_price}
          fallbackPermalink={question.product_permalink}
        />

        {/* CRM Drawer from Copilot suggestions */}
        {question.product_id && (
          <ProductFormDrawer
            open={crmDrawerOpen}
            onOpenChange={setCrmDrawerOpen}
            productId={question.product_id}
            defaultTab={crmDrawerTab}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionDetail;
