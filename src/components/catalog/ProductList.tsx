import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, SlidersHorizontal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompletenessIndicator } from './CompletenessIndicator';
import { PaginationBar } from '@/components/PaginationBar';

interface Product {
  id: string;
  title: string;
  meli_item_id: string | null;
  sku: string | null;
  status: string;
  source: string;
  external_id: string | null;
  support_summary: string | null;
  key_points: string[];
  faq_bullets: string[];
  do_not_say: string[];
  shipping_notes: string | null;
  returns_notes: string | null;
  warranty_notes: string | null;
  updated_at: string;
}

type Filter = 'active' | 'archived' | 'incomplete';
type Sort = 'alpha' | 'updated';

interface PaginationData {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  canPrev: boolean;
  canNext: boolean;
  goNext: () => void;
  goPrev: () => void;
}

interface Props {
  products: Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  pagination?: PaginationData;
  totalCount?: number;
}

export function ProductList({ products, selectedId, onSelect, onNew, pagination, totalCount }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [sort, setSort] = useState<Sort>('updated');

  const filtered = useMemo(() => {
    let list = products;

    // Filter
    if (filter === 'active') list = list.filter((p) => p.status === 'active');
    else if (filter === 'archived') list = list.filter((p) => p.status === 'archived');
    else if (filter === 'incomplete') list = list.filter((p) => p.status === 'active' && !p.support_summary);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.meli_item_id && p.meli_item_id.toLowerCase().includes(q)) ||
          (p.external_id && p.external_id.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sort === 'alpha') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else list = [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return list;
  }, [products, search, filter, sort]);

  const filterChip = (label: string, value: Filter) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
        filter === value
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground flex-1">Productos</h2>
          <Button size="sm" className="gap-1 text-xs" onClick={onNew}>
            <Plus className="w-3 h-3" /> Nuevo
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, SKU o ID..."
            className="pl-8 text-xs h-8"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterChip('Activos', 'active')}
          {filterChip('Archivados', 'archived')}
          {filterChip('Incompletos', 'incomplete')}
          <button
            onClick={() => setSort(sort === 'alpha' ? 'updated' : 'alpha')}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="w-3 h-3" />
            {sort === 'alpha' ? 'A-Z' : 'Recientes'}
          </button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Package className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
            {products.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground mb-1">Sin productos todavía</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Creá tu primer producto para que la IA tenga conocimiento de tu catálogo.
                </p>
                <Button size="sm" variant="outline" className="gap-1" onClick={onNew}>
                  <Plus className="w-3 h-3" /> Crear primer producto
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">Sin resultados</p>
                <Button size="sm" variant="outline" className="gap-1" onClick={onNew}>
                  <Plus className="w-3 h-3" /> Crear nuevo
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                  selectedId === p.id
                    ? 'bg-accent'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${p.status === 'archived' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {p.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.source === 'meli' ? `MeLi: ${p.meli_item_id || p.external_id}` : p.sku ? `SKU: ${p.sku}` : 'Manual'}
                  </p>
                </div>
                <CompletenessIndicator product={p as any} />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
