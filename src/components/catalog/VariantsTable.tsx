import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Archive, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEntry } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';

export interface Variant {
  id: string;
  variant_name: string;
  variant_sku: string | null;
  attributes: Record<string, string>;
  support_notes: string | null;
  archived_at: string | null;
}

interface Props {
  productId: string;
  companyId: string;
  variants: Variant[];
  onRefresh: () => void;
}

export function VariantsTable({ productId, companyId, variants, onRefresh }: Props) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');
  const [newAttrs, setNewAttrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeVariants = variants.filter((v) => !v.archived_at);
  const archivedVariants = variants.filter((v) => v.archived_at);

  const addAttr = () => {
    if (newAttrKey.trim() && newAttrVal.trim()) {
      setNewAttrs({ ...newAttrs, [newAttrKey.trim()]: newAttrVal.trim() });
      setNewAttrKey('');
      setNewAttrVal('');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('product_variants' as any)
      .insert({
        product_id: productId,
        company_id: companyId,
        variant_name: newName.trim(),
        variant_sku: newSku.trim() || null,
        attributes: newAttrs,
        support_notes: newNotes.trim() || null,
        updated_by: user?.id,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Error al crear variante');
    } else {
      await logAuditEntry({
        companyId, actorUserId: user!.id, entityType: 'product_variant',
        entityId: (data as any).id, action: 'create',
        after: { variant_name: newName.trim() },
      });
      toast.success('Variante creada');
      setAdding(false);
      setNewName('');
      setNewSku('');
      setNewNotes('');
      setNewAttrs({});
      onRefresh();
    }
    setSaving(false);
  };

  const handleArchive = async (v: Variant) => {
    const { error } = await supabase
      .from('product_variants' as any)
      .update({ archived_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', v.id);

    if (!error) {
      await logAuditEntry({
        companyId, actorUserId: user!.id, entityType: 'product_variant',
        entityId: v.id, action: 'archive', before: { variant_name: v.variant_name },
      });
      toast('Variante archivada', {
        action: { label: 'Deshacer', onClick: () => handleRestore(v) },
        duration: 3000,
      });
      onRefresh();
    }
  };

  const handleRestore = async (v: Variant) => {
    await supabase
      .from('product_variants' as any)
      .update({ archived_at: null, updated_by: user?.id })
      .eq('id', v.id);

    await logAuditEntry({
      companyId, actorUserId: user!.id, entityType: 'product_variant',
      entityId: v.id, action: 'restore', after: { variant_name: v.variant_name },
    });
    toast.success('Variante restaurada');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Active variants */}
      {activeVariants.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay variantes configuradas. Agregá una si este producto viene en distintas versiones.
        </p>
      )}

      {activeVariants.map((v) => (
        <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{v.variant_name}</p>
            {v.variant_sku && <p className="text-xs text-muted-foreground">SKU: {v.variant_sku}</p>}
            {Object.entries(v.attributes || {}).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(v.attributes).map(([k, val]) => (
                  <Badge key={k} variant="secondary" className="text-[10px]">{k}: {val}</Badge>
                ))}
              </div>
            )}
            {v.support_notes && <p className="text-xs text-muted-foreground mt-1">{v.support_notes}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleArchive(v)}>
            <Archive className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}

      {/* Add variant form */}
      {adding ? (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <Input placeholder="Nombre (ej: Negro / Talle M)" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm" />
          <Input placeholder="SKU (opcional)" value={newSku} onChange={(e) => setNewSku(e.target.value)} className="text-sm" />
          <div className="flex gap-2">
            <Input placeholder="Atributo" value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)} className="text-sm flex-1" />
            <Input placeholder="Valor" value={newAttrVal} onChange={(e) => setNewAttrVal(e.target.value)} className="text-sm flex-1" />
            <Button variant="outline" size="sm" onClick={addAttr} disabled={!newAttrKey.trim()}>+</Button>
          </div>
          {Object.keys(newAttrs).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(newAttrs).map(([k, val]) => (
                <Badge key={k} variant="secondary" className="text-[10px] gap-1">
                  {k}: {val}
                  <button onClick={() => { const copy = { ...newAttrs }; delete copy[k]; setNewAttrs(copy); }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Input placeholder="Notas de soporte (opcional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Agregar variante
        </Button>
      )}

      {/* Archived */}
      {archivedVariants.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Archivadas ({archivedVariants.length})</p>
          {archivedVariants.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <span className="flex-1 truncate line-through">{v.variant_name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRestore(v)}>
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
