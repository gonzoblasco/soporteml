import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Bot, UserCheck, Package, TrendingUp } from 'lucide-react';

interface CompanyMetric {
  company_id: string;
  company_name: string;
  member_count: number;
  total_questions: number;
  pending_questions: number;
  auto_answered: number;
  human_answered: number;
  total_products: number;
  has_meli: boolean;
  last_question_at: string | null;
}

const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) => (
  <Card>
    <CardContent className="flex items-center gap-4 p-4">
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString('es-AR')}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const MetricsTab = () => {
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc('get_admin_company_metrics');
      if (error) {
        console.error('Error fetching metrics:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      setMetrics((data as CompanyMetric[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const totals = metrics.reduce(
    (acc, m) => ({
      questions: acc.questions + m.total_questions,
      auto: acc.auto + m.auto_answered,
      human: acc.human + m.human_answered,
      pending: acc.pending + m.pending_questions,
      products: acc.products + m.total_products,
    }),
    { questions: 0, auto: 0, human: 0, pending: 0, products: 0 }
  );

  const autoRate = totals.questions > 0 ? Math.round((totals.auto / totals.questions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Global summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={MessageSquare} label="Total preguntas" value={totals.questions} sub={`${totals.pending} pendientes`} />
        <StatCard icon={Bot} label="Resp. automáticas" value={totals.auto} sub={`${autoRate}% del total`} />
        <StatCard icon={UserCheck} label="Resp. humanas" value={totals.human} />
        <StatCard icon={Package} label="Productos activos" value={totals.products} />
      </div>

      {/* Per-company table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg">Uso por empresa</CardTitle>
          </div>
          <CardDescription>{metrics.length} empresa{metrics.length !== 1 ? 's' : ''} registrada{metrics.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay datos aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Miembros</TableHead>
                  <TableHead className="text-center">Preguntas</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Auto</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Humanas</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Pendientes</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Productos</TableHead>
                  <TableHead className="text-center">MeLi</TableHead>
                  <TableHead className="hidden lg:table-cell">Última pregunta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map(m => {
                  const rate = m.total_questions > 0 ? Math.round((m.auto_answered / m.total_questions) * 100) : 0;
                  return (
                    <TableRow key={m.company_id}>
                      <TableCell className="font-medium">{m.company_name}</TableCell>
                      <TableCell className="text-center">{m.member_count}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{m.total_questions}</span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {m.auto_answered} <span className="text-muted-foreground ml-0.5">({rate}%)</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">{m.human_answered}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {m.pending_questions > 0 ? (
                          <Badge variant="destructive" className="text-xs">{m.pending_questions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">{m.total_products}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${m.has_meli ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
                        {m.last_question_at
                          ? new Date(m.last_question_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsTab;
