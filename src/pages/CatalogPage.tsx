import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { ProductList } from '@/components/catalog/ProductList';
import { ProductForm } from '@/components/catalog/ProductForm';
import { logAuditEntry } from '@/lib/auditLog';
import { toast } from 'sonner';
import { Loader2, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { usePagination } from '@/hooks/usePagination';

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
  updated_at: string;
  meli_cache_fetched_at: string | null;
  meli_cache: Record<string, unknown> | null;
  price: number | null;
  meli_category_name: string | null;
}

const PAGE_SIZE = 50;

const CatalogPage = () => {
  const { user, currentCompanyId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('product'));
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);

  const pag = usePagination(totalCount, PAGE_SIZE);

  const fetchProducts = useCallback(async () => {
    if (!currentCompanyId) return;
    const { data, count } = await supabase
      .from('products')
      .select('id, company_id, title, meli_item_id, sku, permalink, status, source, external_id, external_url, support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say, updated_at, meli_cache_fetched_at, meli_cache, price, meli_category_name', { count: 'exact' })
      .eq('company_id', currentCompanyId)
      .order('updated_at', { ascending: false })
      .range(pag.from, pag.to);

    setProducts((data ?? []) as unknown as Product[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [currentCompanyId, pag.from, pag.to]);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('catalog-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProducts]);

  // Handle deep link ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true' && currentCompanyId) {
      handleNew();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, currentCompanyId]);

  const handleNew = async () => {
    if (!currentCompanyId || !user) return;

    const title = searchParams.get('title') || 'Nuevo producto';
    const meliItemId = searchParams.get('meli_item_id') || null;
    const permalink = searchParams.get('permalink') || null;

    const insert: Record<string, unknown> = {
      company_id: currentCompanyId,
      title,
      source: meliItemId ? 'meli' : 'manual',
      meli_item_id: meliItemId,
      external_id: meliItemId,
      permalink,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(insert as any)
      .select('id')
      .single();

    if (error) {
      toast.error('Error al crear producto');
      return;
    }

    await logAuditEntry({
      companyId: currentCompanyId,
      actorUserId: user.id,
      entityType: 'product',
      entityId: (data as any).id,
      action: 'create',
      after: { title },
    });

    toast.success('Producto creado');
    setSelectedId((data as any).id);
    setShowForm(true);
    fetchProducts();
  };

  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setShowForm(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    if (showForm && selectedProduct) {
      return (
        <div className="h-full flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>← Volver</Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProductForm product={selectedProduct} onRefresh={fetchProducts} onClose={() => setShowForm(false)} />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full">
        <ProductList products={products} selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} pagination={pag} totalCount={totalCount} />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-80 shrink-0 border-r border-border">
        <ProductList products={products} selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} pagination={pag} totalCount={totalCount} />
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedProduct ? (
          <ProductForm product={selectedProduct} onRefresh={fetchProducts} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <Package className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              Seleccioná un producto de la lista o creá uno nuevo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPage;
