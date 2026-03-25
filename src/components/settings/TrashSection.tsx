import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const TrashSection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Array<{ id: string; meli_question_id: string; question_text: string; created_at: string; product_title?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = useCallback(async () => {
    if (!currentCompanyId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('id, meli_question_id, question_text, created_at, product_id, products(title)')
      .eq('company_id', currentCompanyId)
      .eq('status', 'deleted')
      .order('created_at', { ascending: false });

    setItems((data ?? []).map((q: any) => ({
      id: q.id,
      meli_question_id: q.meli_question_id,
      question_text: q.question_text,
      created_at: q.created_at,
      product_title: q.products?.title,
    })));
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('questions').update({ status: 'pending' }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Restaurada', description: 'La pregunta volvió a pendientes.' });
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && currentCompanyId) {
      await supabase.from('dismissed_meli_questions' as any).insert({
        meli_question_id: item.meli_question_id,
        company_id: currentCompanyId,
      });
    }
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Eliminada', description: 'La pregunta fue eliminada definitivamente.' });
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleEmptyTrash = async () => {
    if (!currentCompanyId) return;
    const dismissedRows = items.map(i => ({
      meli_question_id: i.meli_question_id,
      company_id: currentCompanyId,
    }));
    await supabase.from('dismissed_meli_questions' as any).upsert(dismissedRows, { onConflict: 'meli_question_id,company_id' });

    const ids = items.map(i => i.id);
    const { error } = await supabase.from('questions').delete().in('id', ids);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Papelera vaciada', description: 'Todas las preguntas fueron eliminadas definitivamente.' });
      setItems([]);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Papelera</CardTitle>
              <CardDescription>Preguntas eliminadas ({items.length})</CardDescription>
            </div>
          </div>
          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  Vaciar papelera
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán permanentemente {items.length} pregunta(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sí, vaciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">La papelera está vacía.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.question_text}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.product_title ?? 'Sin producto'} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id)} title="Restaurar">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Eliminar definitivamente">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar definitivamente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta pregunta será eliminada permanentemente de la base de datos. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePermanentDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrashSection;
