import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Plus, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEntry } from '@/lib/auditLog';
import { CompletenessIndicator } from './CompletenessIndicator';
import { VariantsTable, type Variant } from './VariantsTable';
import { AuditTimeline } from './AuditTimeline';
import { EnrichButton } from './EnrichButton';
import { DuplicateDetector } from './DuplicateDetector';

interface Product {
  id: string;
  company_id: string;
  title: string;
  meli_item_id: string | null;
  sku: string | null;
  permalink: string | null;
  status: string;
  source: string;
  external_id: string | null;
  external_url: string | null;
  support_summary: string | null;
  key_points: string[];
  shipping_notes: string | null;
  returns_notes: string | null;
  warranty_notes: string | null;
  faq_bullets: string[];
  do_not_say: string[];
  meli_cache_fetched_at?: string | null;
  meli_cache?: Record<string, unknown> | null;
  price?: number | null;
  meli_category_name?: string | null;
}

interface Props {
  product: Product;
  onRefresh: () => void;
  onClose: () => void;
  defaultTab?: string;
}

function EditableList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    if (draft.trim()) {
      onChange([...items, draft.trim()]);
      setDraft('');
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="flex-1 text-foreground">• {item}</span>
          <button className="text-muted-foreground hover:text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          className="text-sm"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function ProductForm({ product, onRefresh, onClose, defaultTab }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<Product>(product);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset form when product changes (including after enrichment)
  useEffect(() => {
    setForm(product);
    setSaved(false);
    fetchVariants();
  }, [product.id, product.support_summary, product.key_points, product.faq_bullets, product.warranty_notes, product.shipping_notes, product.meli_cache_fetched_at]);

  const fetchVariants = async () => {
    const { data } = await supabase
      .from('product_variants' as any)
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: true });
    setVariants((data ?? []) as unknown as Variant[]);
  };

  const updateField = useCallback((key: keyof Product, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const save = async () => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const updates: Record<string, unknown> = {};

    const editableFields: (keyof Product)[] = [
      'title', 'sku', 'permalink', 'support_summary', 'key_points',
      'shipping_notes', 'returns_notes', 'warranty_notes', 'faq_bullets', 'do_not_say',
    ];

    for (const key of editableFields) {
      if (JSON.stringify(form[key]) !== JSON.stringify(product[key])) {
        before[key] = product[key];
        after[key] = form[key];
        updates[key] = form[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      setSaved(true);
      return;
    }

    updates.updated_by = user?.id;
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', product.id);

    if (error) {
      toast.error('Error al guardar');
      return;
    }

    await logAuditEntry({
      companyId: product.company_id,
      actorUserId: user!.id,
      entityType: 'product',
      entityId: product.id,
      action: 'update',
      before,
      after,
    });

    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaved(false), 2500);
    onRefresh();
  };

  const handleArchive = async () => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'archived', updated_by: user?.id })
      .eq('id', product.id);

    if (!error) {
      await logAuditEntry({
        companyId: product.company_id,
        actorUserId: user!.id,
        entityType: 'product',
        entityId: product.id,
        action: 'archive',
        before: { status: 'active' },
        after: { status: 'archived' },
      });
      toast('Producto archivado', {
        action: { label: 'Deshacer', onClick: () => handleRestore() },
        duration: 3000,
      });
      onRefresh();
    }
  };

  const handleRestore = async () => {
    await supabase
      .from('products')
      .update({ status: 'active', updated_by: user?.id })
      .eq('id', product.id);

    await logAuditEntry({
      companyId: product.company_id,
      actorUserId: user!.id,
      entityType: 'product',
      entityId: product.id,
      action: 'restore',
      before: { status: 'archived' },
      after: { status: 'active' },
    });
    toast.success('Producto restaurado');
    onRefresh();
  };

  const isArchived = form.status === 'archived';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground truncate">{form.title}</h2>
            <CompletenessIndicator product={form} />
            {isArchived && <Badge variant="secondary" className="text-[10px]">Archivado</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {form.source === 'meli' ? `MeLi: ${form.meli_item_id || form.external_id}` : form.source === 'manual' ? 'Manual' : form.source}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 animate-fade-in">
              <Check className="w-3 h-3" /> Listo
            </span>
          )}
          <Button size="sm" onClick={save} disabled={saved}>Guardar</Button>
          {isArchived ? (
            <Button variant="outline" size="sm" className="gap-1" onClick={handleRestore}>
              <RotateCcw className="w-3 h-3" /> Restaurar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-destructive" onClick={handleArchive}>
              <Archive className="w-3 h-3" /> Archivar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab || "resumen"} className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="conocimiento">Conocimiento IA</TabsTrigger>
          <TabsTrigger value="variantes">Variantes</TabsTrigger>
          <TabsTrigger value="politicas">Políticas</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Tab 1 — Resumen */}
          <TabsContent value="resumen" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">SKU</Label>
                <Input value={form.sku || ''} onChange={(e) => updateField('sku', e.target.value || null)} placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Fuente</Label>
                <Input value={form.source} disabled className="text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ID externo</Label>
              <Input value={form.external_id || form.meli_item_id || ''} disabled className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Permalink</Label>
              <Input value={form.permalink || ''} onChange={(e) => updateField('permalink', e.target.value || null)} placeholder="URL del producto" />
            </div>

            {/* Epic 3: Enrichment + Duplicate Detection */}
            <EnrichButton
              productId={product.id}
              meliItemId={form.meli_item_id}
              externalId={form.external_id}
              meliFetchedAt={form.meli_cache_fetched_at ?? null}
              onEnriched={() => { onRefresh(); }}
            />

            {/* MeLi Cache Data Display */}
            {form.meli_cache && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <p className="text-[11px] font-semibold text-foreground">Datos de MeLi</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {form.price && (
                    <div>
                      <span className="text-muted-foreground">Precio:</span>{' '}
                      <span className="font-medium text-foreground">
                        ${Number(form.price).toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                  {form.meli_category_name && (
                    <div>
                      <span className="text-muted-foreground">Categoría:</span>{' '}
                      <span className="font-medium text-foreground">{form.meli_category_name}</span>
                    </div>
                  )}
                  {(form.meli_cache as any)?.condition && (
                    <div>
                      <span className="text-muted-foreground">Condición:</span>{' '}
                      <span className="font-medium text-foreground">{(form.meli_cache as any).condition === 'new' ? 'Nuevo' : 'Usado'}</span>
                    </div>
                  )}
                  {(form.meli_cache as any)?.warranty && (
                    <div>
                      <span className="text-muted-foreground">Garantía:</span>{' '}
                      <span className="font-medium text-foreground">{(form.meli_cache as any).warranty}</span>
                    </div>
                  )}
                  {(form.meli_cache as any)?.available_quantity != null && (
                    <div>
                      <span className="text-muted-foreground">Stock:</span>{' '}
                      <span className="font-medium text-foreground">{(form.meli_cache as any).available_quantity}</span>
                    </div>
                  )}
                  {(form.meli_cache as any)?.sold_quantity != null && (
                    <div>
                      <span className="text-muted-foreground">Vendidos:</span>{' '}
                      <span className="font-medium text-foreground">{(form.meli_cache as any).sold_quantity}</span>
                    </div>
                  )}
                  {(form.meli_cache as any)?.shipping?.free_shipping && (
                    <div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Envío gratis</Badge>
                    </div>
                  )}
                </div>

                {/* Attributes */}
                {Array.isArray((form.meli_cache as any)?.attributes) && (form.meli_cache as any).attributes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Atributos</p>
                    <div className="flex flex-wrap gap-1">
                      {((form.meli_cache as any).attributes as { name: string; value_name: string }[]).slice(0, 12).map((attr, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                          {attr.name}: {attr.value_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description preview */}
                {(form.meli_cache as any)?.description && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descripción MeLi</p>
                    <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line">
                      {(form.meli_cache as any).description}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DuplicateDetector
              productId={product.id}
              onSelectDuplicate={(dupId) => {
                window.open(`/catalog?product=${dupId}`, '_blank');
              }}
            />
          </TabsContent>

          {/* Tab 2 — Conocimiento IA */}
          <TabsContent value="conocimiento" className="space-y-5 mt-4">
            <p className="text-xs text-muted-foreground italic">
              Escribí como si le hablaras a tu mejor vendedor. Corto, claro, real.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Resumen para soporte</Label>
              <Textarea
                value={form.support_summary || ''}
                onChange={(e) => updateField('support_summary', e.target.value || null)}
                placeholder="2–5 líneas describiendo qué es el producto y cómo ayudar al comprador"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Puntos clave (3–6 bullets)</Label>
              <EditableList
                items={form.key_points || []}
                onChange={(v) => updateField('key_points', v)}
                placeholder="Ej: Incluye cargador USB-C"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">FAQ bullets</Label>
              <EditableList
                items={form.faq_bullets || []}
                onChange={(v) => updateField('faq_bullets', v)}
                placeholder="Ej: ¿Sirve para exterior? Sí, es resistente al agua."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">No prometer (cosas que la IA no debe decir)</Label>
              <EditableList
                items={form.do_not_say || []}
                onChange={(v) => updateField('do_not_say', v)}
                placeholder="Ej: No prometer envío en 24hs"
              />
            </div>
          </TabsContent>

          {/* Tab 3 — Variantes */}
          <TabsContent value="variantes" className="mt-4">
            <VariantsTable
              productId={product.id}
              companyId={product.company_id}
              variants={variants}
              onRefresh={fetchVariants}
            />
          </TabsContent>

          {/* Tab 4 — Políticas */}
          <TabsContent value="politicas" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs">Envíos</Label>
              <Textarea
                value={form.shipping_notes || ''}
                onChange={(e) => updateField('shipping_notes', e.target.value || null)}
                placeholder="Tiempos de envío, cobertura, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Devoluciones</Label>
              <Textarea
                value={form.returns_notes || ''}
                onChange={(e) => updateField('returns_notes', e.target.value || null)}
                placeholder="Política de cambios y devoluciones"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Garantía</Label>
              <Textarea
                value={form.warranty_notes || ''}
                onChange={(e) => updateField('warranty_notes', e.target.value || null)}
                placeholder="Condiciones de garantía"
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Tab 5 — Actividad */}
          <TabsContent value="actividad" className="mt-4">
            <AuditTimeline
              entityType="product"
              entityId={product.id}
              companyId={product.company_id}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
