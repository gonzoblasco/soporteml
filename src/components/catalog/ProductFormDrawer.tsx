import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { ProductForm } from './ProductForm';
import { logAuditEntry } from '@/lib/auditLog';
import { toast } from 'sonner';

export interface NewProductParams {
  meli_item_id?: string;
  title?: string;
  permalink?: string;
  external_id?: string;
  source?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
  newProductParams?: NewProductParams | null;
  defaultTab?: string;
}

type Product = Parameters<typeof ProductForm>[0]['product'];

export function ProductFormDrawer({ open, onOpenChange, productId, newProductParams, defaultTab }: Props) {
  const isMobile = useIsMobile();
  const { user, companyId } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (productId) {
      fetchProduct(productId);
    } else if (newProductParams && companyId) {
      createDraftProduct();
    }
  }, [open, productId]);

  const fetchProduct = async (id: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setProduct({
        ...data,
        key_points: (data.key_points ?? []) as string[],
        faq_bullets: (data.faq_bullets ?? []) as string[],
        do_not_say: (data.do_not_say ?? []) as string[],
      } as Product);
    }
    setLoading(false);
  };

  const createDraftProduct = async () => {
    if (!companyId || !user) return;
    setLoading(true);
    const insertData: Record<string, unknown> = {
      company_id: companyId,
      title: newProductParams?.title || 'Nuevo producto',
      source: newProductParams?.source || 'meli',
      meli_item_id: newProductParams?.meli_item_id || null,
      external_id: newProductParams?.external_id || newProductParams?.meli_item_id || null,
      permalink: newProductParams?.permalink || null,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from('products')
      .insert([insertData as any])
      .select()
      .single();

    if (error) {
      toast.error('Error al crear producto: ' + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      await logAuditEntry({
        companyId,
        actorUserId: user.id,
        entityType: 'product',
        entityId: data.id,
        action: 'create',
        before: null,
        after: { title: data.title, source: data.source },
      });
      setProduct({
        ...data,
        key_points: (data.key_points ?? []) as string[],
        faq_bullets: (data.faq_bullets ?? []) as string[],
        do_not_say: (data.do_not_say ?? []) as string[],
      } as Product);
      toast.success('Ficha CRM creada');
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    if (product) fetchProduct(product.id);
  };

  const content = loading ? (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Cargando ficha…
    </div>
  ) : product ? (
    <ProductForm
      product={product}
      onRefresh={handleRefresh}
      onClose={() => onOpenChange(false)}
      defaultTab={defaultTab}
    />
  ) : (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      No se encontró el producto.
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Ficha CRM</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[560px] sm:max-w-[560px] p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Ficha CRM</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
