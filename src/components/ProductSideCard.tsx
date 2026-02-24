import { useState, useEffect } from 'react';
import { ExternalLink, Package, Tag, Truck, Shield, Layers, DollarSign, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface Props {
  meliItemId: string | undefined | null;
  fallbackTitle?: string | null;
  fallbackPrice?: number | null;
  fallbackPermalink?: string | null;
}

const ProductSideCard = ({ meliItemId, fallbackTitle, fallbackPrice, fallbackPermalink }: Props) => {
  const [item, setItem] = useState<MeliItem | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!meliItemId) return;
    setLoading(true);
    setItem(null);
    setDescription(null);

    supabase.functions.invoke('meli-item-proxy', {
      body: { item_id: meliItemId },
    }).then(({ data, error }) => {
      if (!error && data?.item) {
        setItem(data.item);
        setDescription(data.description ?? null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [meliItemId]);

  // Hide on mobile
  if (isMobile) return null;
  if (!meliItemId) return null;

  if (loading) {
    return (
      <div className="w-72 shrink-0 border-l border-border/50 flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fallback from DB when API fails
  if (!item) {
    if (!fallbackTitle) return null;
    return (
      <div className="w-72 shrink-0 border-l border-border/50 bg-muted/20 h-full overflow-auto">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{fallbackTitle}</h3>
            {fallbackPrice && (
              <p className="text-lg font-bold text-foreground">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(fallbackPrice)}
              </p>
            )}
          </div>
          <Separator />
          <p className="text-[11px] text-muted-foreground">
            No se pudo cargar información adicional del producto.
          </p>
          {fallbackPermalink && (
            <a href={fallbackPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" />
              Ver publicación en MeLi
            </a>
          )}
        </div>
      </div>
    );
  }

  const mainPic = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url;
  const relevantAttrs = (item.attributes ?? [])
    .filter(a => a.value_name && !['ITEM_CONDITION', 'GTIN', 'SELLER_SKU', 'MPN'].includes(a.id))
    .slice(0, 10);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(price);
  };

  return (
    <div className="w-72 shrink-0 border-l border-border/50 bg-muted/20 h-full overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Product Image */}
          {mainPic && (
            <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
              <img
                src={mainPic}
                alt={item.title}
                className="w-full h-48 object-contain bg-white"
                loading="lazy"
              />
            </div>
          )}

          {/* Title & Price */}
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">
              {item.title}
            </h3>
            <p className="text-lg font-bold text-foreground">
              {formatPrice(item.price, item.currency_id)}
            </p>
          </div>

          {/* Quick Stats */}
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

          {/* Variations */}
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

          {/* Attributes */}
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

          {/* Description */}
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

          {/* Link */}
          <Separator />
          <a
            href={item.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Ver publicación en MeLi
          </a>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductSideCard;
