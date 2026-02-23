import type { QuestionCategory } from '@/types/question';

const categoryStyles: Record<QuestionCategory, string> = {
  Precio: 'bg-badge-precio/15 text-badge-precio',
  Stock: 'bg-badge-stock/15 text-badge-stock',
  Técnico: 'bg-badge-tecnico/15 text-badge-tecnico',
  Envío: 'bg-badge-envio/15 text-badge-envio',
  Garantía: 'bg-badge-garantia/15 text-badge-garantia',
};

const CategoryBadge = ({ category }: { category: string | null }) => {
  const key = category as QuestionCategory;
  const style = categoryStyles[key] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${style}`}>
      {category ?? 'Sin categoría'}
    </span>
  );
};

export default CategoryBadge;
