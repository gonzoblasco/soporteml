import type { Database } from '@/integrations/supabase/types';

export type QuestionCategory = Database['public']['Enums']['question_category'];

const categoryStyles: Record<string, string> = {
  Precio: 'bg-badge-precio/15 text-badge-precio',
  Stock: 'bg-badge-stock/15 text-badge-stock',
  'Técnico': 'bg-badge-tecnico/15 text-badge-tecnico',
  'Envío': 'bg-badge-envio/15 text-badge-envio',
  'Garantía': 'bg-badge-garantia/15 text-badge-garantia',
};

const CategoryBadge = ({ category }: { category: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryStyles[category] ?? 'bg-muted text-muted-foreground'}`}>
    {category}
  </span>
);

export default CategoryBadge;
