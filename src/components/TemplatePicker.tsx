import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  onSelect: (content: string) => void;
  /** Context to replace variables like {producto}, {nombre} */
  variables?: Record<string, string>;
}

const TemplatePicker = ({ onSelect, variables = {} }: Props) => {
  const { currentCompanyId } = useAuth();
  const [templates, setTemplates] = useState<{ id: string; title: string; category: string; content: string }[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!currentCompanyId || !open) return;
    supabase
      .from('templates')
      .select('id, title, category, content')
      .eq('company_id', currentCompanyId)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setTemplates(data ?? []));
  }, [currentCompanyId, open]);

  const applyVariables = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.split(`{${key}}`).join(value);
    }
    return result;
  };

  const filtered = templates.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <FileText className="w-3.5 h-3.5" />
          Plantillas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[260px]">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {templates.length === 0 ? 'Sin plantillas aún' : 'Sin resultados'}
            </p>
          ) : (
            <div className="p-1">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelect(applyVariables(t.content));
                    setOpen(false);
                  }}
                  className="w-full text-left rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{t.title}</span>
                    <Badge variant="secondary" className="text-[9px] shrink-0">{t.category}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.content}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default TemplatePicker;
