import { useState, useEffect } from 'react';
import { ExternalLink, Package, Tag, Truck, Shield, Layers, DollarSign, AlertTriangle, Settings, Sparkles, BookOpen, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { CompletenessIndicator } from '@/components/catalog/CompletenessIndicator';
import { ProductFormDrawer, type NewProductParams } from '@/components/catalog/ProductFormDrawer';

interface MeliItem {
  title: string;
  price: number;
  currency_id: string;
  condition: string;
  available_quantity: number;
  sold_quantity: number;
  pictures: Array<{ url: string; secure_url: string }>;
  permalink: string;
  warranty: string | null;
  shipping: { free_shipping: boolean };
  attributes: Array<{ id: string; name: string; value_name: string | null }>;
  variations: Array<{
    available_quantity: number;
    attribute_combinations: Array<{ name: string; value_name: string }>;
  }>;
}

interface CrmProduct {
  id: string;
  support_summary: string | null;
  key_points: string[];
  faq_bullets: string[];
  do_not_say: string[];
  shipping_notes: string | null;
  returns_notes: string | null;
  warranty_notes: string | null;
  status: string;
  source: string;
  sku: string | null;
  external_id: string | null;
}

interface Props {
  meliItemId: string | undefined | null;
  productId?: string | null;
  fallbackTitle?: string | null;
  fallbackPrice?: number | null;
  fallbackPermalink?: string | null;
}

const ProductSideCard = ({ meliItemId, productId, fallbackTitle, fallbackPrice, fallbackPermalink }: Props) => {
  const [item, setItem] = useState<MeliItem | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [crmProduct, setCrmProduct] = useState<CrmProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [drawerNewParams, setDrawerNewParams] = useState<NewProductParams | null>(null);
  const [drawerDefaultTab, setDrawerDefaultTab] = useState<string | undefined>();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!meliItemId) return;
    setLoading(true);
    setItem(null);
    setDescription(null);
    setError(false);

    supabase.functions.invoke('meli-item-proxy', {
      body: { item_id: meliItemId },
    }).then(({ data, error: err }) => {
      if (!err && data?.item) {
        setItem(data.item);
        setDescription(data.description ?? null);
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [meliItemId]);

  // Fetch CRM product data
  useEffect(() => {
    setCrmProduct(null);
    if (productId) {
      supabase
        .from('products')
        .select('id, support_summary, key_points, faq_bullets, do_not_say, shipping_notes, returns_notes, warranty_notes, status, source, sku, external_id')
        .eq('id', productId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCrmProduct({
              ...data,
              key_points: (data.key_points ?? []) as string[],
              faq_bullets: (data.faq_bullets ?? []) as string[],
              do_not_say: (data.do_not_say ?? []) as string[],
            });
          }
        });
    }
  }, [productId]);

  const openDrawerEdit = (tab?: string) => {
    setDrawerProductId(productId || crmProduct?.id || null);
    setDrawerNewParams(null);
    setDrawerDefaultTab(tab);
    setDrawerOpen(true);
  };

  const openDrawerCreate = () => {
    setDrawerProductId(null);
    setDrawerNewParams({
      meli_item_id: meliItemId || undefined,
      title: fallbackTitle || undefined,
      permalink: fallbackPermalink || undefined,
    });
    setDrawerDefaultTab(undefined);
    setDrawerOpen(true);
  };

  // Count missing CRM fields
  const countMissingFields = (p: CrmProduct) => {
    let missing = 0;
    if (!p.support_summary) missing++;
    if (!p.key_points?.length) missing++;
    if (!p.shipping_notes) missing++;
    if (!p.returns_notes) missing++;
    if (!p.warranty_notes) missing++;
    return missing;
  };

  if (isMobile) return null;
  if (!meliItemId) return null;

  if (loading) {
    return (
      <div className="w-72 shrink-0 border-l border-border/50 bg-muted/20">
        <div className="p-4 space-y-4">
          <Skeleton className="w-full h-48 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="w-72 shrink-0 border-l border-border/50 bg-muted/20">
        <div className="p-4 space-y-4">
          {fallbackTitle && (
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{fallbackTitle}</h3>
              {fallbackPrice && (
                <p className="text-lg font-bold text-foreground">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(fallbackPrice)}
                </p>
              )}
            </div>
          )}

          {/* CRM CTA even in fallback state */}
          {crmProduct ? (
            <CrmKnowledgeSection crm={crmProduct} onEdit={openDrawerEdit} countMissing={countMissingFields} />
          ) : meliItemId ? (
            <CreateCrmCta onClick={openDrawerCreate} />
          ) : null}

          {error && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">No pudimos cargar los detalles</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Puede deberse a una conexión en curso o a la sincronización.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {fallbackPermalink && (
            <>
              <Separator />
              <a href={fallbackPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" />
                Ver publicación en MeLi
              </a>
            </>
          )}
        </div>
        <ProductFormDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          productId={drawerProductId}
          newProductParams={drawerNewParams}
          defaultTab={drawerDefaultTab}
        />
      </div>
    );
  }

  const mainPic = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url;
  const relevantAttrs = (item.attributes ?? [])
    .filter(a => a.value_name && !['ITEM_CONDITION', 'GTIN', 'SELLER_SKU', 'MPN'].includes(a.id))
    .slice(0, 10);

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(price);

  return (
    <div className="w-72 shrink-0 border-l border-border/50 bg-muted/20">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {mainPic && (
            <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
              <img src={mainPic} alt={item.title} className="w-full h-48 object-contain bg-white" loading="lazy" />
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{item.title}</h3>
            <p className="text-lg font-bold text-foreground">{formatPrice(item.price, item.currency_id)}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Package className="w-3 h-3" />
              {item.condition === 'new' ? 'Nuevo' : 'Usado'}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Layers className="w-3 h-3" />
              Stock: {item.available_quantity}
            </Badge>
            {item.sold_quantity > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <DollarSign className="w-3 h-3" />
                {item.sold_quantity} vendidos
              </Badge>
            )}
            {item.shipping?.free_shipping && (
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/30">
                <Truck className="w-3 h-3" />
                Envío gratis
              </Badge>
            )}
            {item.warranty && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Shield className="w-3 h-3" />
                {item.warranty}
              </Badge>
            )}
          </div>

          {/* CRM Knowledge Section */}
          {crmProduct ? (
            <CrmKnowledgeSection crm={crmProduct} onEdit={openDrawerEdit} countMissing={countMissingFields} />
          ) : meliItemId ? (
            <CreateCrmCta onClick={openDrawerCreate} />
          ) : null}

          {item.variations?.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Variantes</p>
                <div className="space-y-1">
                  {item.variations.slice(0, 8).map((v, i) => {
                    const label = v.attribute_combinations?.map(a => a.value_name).join(' / ') || `Variante ${i + 1}`;
                    return (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground truncate mr-2">{label}</span>
                        <span className="text-foreground shrink-0">({v.available_quantity})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {relevantAttrs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Atributos
                </p>
                <div className="space-y-1">
                  {relevantAttrs.map((attr, i) => (
                    <div key={i} className="flex items-start justify-between text-[11px] gap-2">
                      <span className="text-muted-foreground">{attr.name}</span>
                      <span className="text-foreground text-right font-medium">{attr.value_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {description && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Descripción</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-[12]">
                  {description}
                </p>
              </div>
            </>
          )}

          <Separator />
          <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" />
            Ver publicación en MeLi
          </a>
        </div>
      </ScrollArea>
      <ProductFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        productId={drawerProductId}
        newProductParams={drawerNewParams}
        defaultTab={drawerDefaultTab}
      />
    </div>
  );
};

// Sub-components

function CrmKnowledgeSection({ crm, onEdit, countMissing }: { crm: CrmProduct; onEdit: (tab?: string) => void; countMissing: (p: CrmProduct) => number }) {
  const missing = countMissing(crm);

  return (
    <>
      <Separator />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Conocimiento CRM</span>
          </div>
          <CompletenessIndicator product={crm as any} />
        </div>

        {crm.support_summary && (
          <p className="text-[11px] text-foreground leading-relaxed line-clamp-3">
            {crm.support_summary}
          </p>
        )}

        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {crm.key_points?.length > 0 && <span>{crm.key_points.length} puntos clave</span>}
          {crm.faq_bullets?.length > 0 && <span>· {crm.faq_bullets.length} FAQ</span>}
        </div>

        {missing > 0 ? (
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-[11px] h-7" onClick={() => onEdit('conocimiento')}>
            <Pencil className="w-3 h-3" />
            Completar ficha ({missing} campos)
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-[11px] h-7" onClick={() => onEdit()}>
            <Pencil className="w-3 h-3" />
            Editar ficha CRM
          </Button>
        )}
      </div>
    </>
  );
}

function CreateCrmCta({ onClick }: { onClick: () => void }) {
  return (
    <>
      <Separator />
      <Button variant="outline" size="sm" className="w-full gap-1.5 text-[11px]" onClick={onClick}>
        <Sparkles className="w-3 h-3 text-primary" />
        Crear ficha CRM
      </Button>
    </>
  );
}

export default ProductSideCard;
