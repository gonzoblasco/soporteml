import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProductList } from '@/components/catalog/ProductList';
import { ProductForm } from '@/components/catalog/ProductForm';
import { logAuditEntry } from '@/lib/auditLog';
import { toast } from 'sonner';
import { Loader2, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

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

const CatalogPage = () => {
  const { user, companyId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('product'));
  const isMobile = useIsMobile();
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('products')
      .select('id, company_id, title, meli_item_id, sku, permalink, status, source, external_id, external_url, support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say, updated_at, meli_cache_fetched_at, meli_cache, price, meli_category_name')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    setProducts((data ?? []) as unknown as Product[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchProducts();

    // Realtime subscription
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
    if (searchParams.get('new') === 'true' && companyId) {
      handleNew();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, companyId]);

  const handleNew = async () => {
    if (!companyId || !user) return;

    const title = searchParams.get('title') || 'Nuevo producto';
    const meliItemId = searchParams.get('meli_item_id') || null;
    const permalink = searchParams.get('permalink') || null;

    const insert: Record<string, unknown> = {
      company_id: companyId,
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
      companyId,
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

  // Mobile: toggle between list and form
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

  // Mobile layout
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
        <ProductList products={products} selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />
      </div>
    );
  }

  // Desktop split view
  return (
    <div className="h-full flex">
      <div className="w-80 shrink-0 border-r border-border">
        <ProductList products={products} selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />
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
