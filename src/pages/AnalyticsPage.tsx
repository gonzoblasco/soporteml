import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/EmptyState';
import { BarChart3, Download, TrendingUp, TrendingDown, Bot, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type Period = 7 | 30 | 90;

interface AnalyticsData {
  total_questions: number;
  auto_answered: number;
  human_escalated: number;
  pending: number;
  avg_confidence: number;
  auto_resolution_rate: number;
  delta_total: number | null;
  delta_auto_rate: number | null;
  daily_volume: Array<{ date: string; total: number; auto: number; human: number }> | null;
  by_category: Array<{ category: string; count: number }> | null;
  top_products: Array<{ product_id: string; title: string; questions: number; auto_rate: number }> | null;
  top_buyers: Array<{ buyer_nickname: string; questions: number }> | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Envío: '#378ADD',
  Garantía: '#0F6E56',
  Técnico: '#534AB7',
  Precio: '#BA7517',
  Stock: '#888888',
  Otro: '#888888',
};

const formatShortDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '');
  } catch {
    return iso;
  }
};

const confidenceColor = (pct: number) => {
  if (pct >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 65) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const autoRateColor = (pct: number) => {
  if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const KpiCard = ({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  valueClass,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
  delta?: number | null;
  valueClass?: string;
}) => (
  <Card className="p-4 bg-secondary/40 border-[0.5px] shadow-none">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
    <div className={`text-2xl font-semibold tabular-nums ${valueClass ?? 'text-foreground'}`}>{value}</div>
    <div className="flex items-center gap-2 mt-1.5 min-h-[18px]">
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {delta != null && (
        <span
          className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
            delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
          }`}
        >
          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {delta > 0 ? '+' : ''}
          {delta}%
        </span>
      )}
    </div>
  </Card>
);

const AnalyticsPage = () => {
  const { currentCompanyId } = useAuth();
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_company_analytics', {
        _company_id: currentCompanyId,
        _days: period,
      });
      if (error) throw error;
      setData(result as unknown as AnalyticsData);
    } catch (e: any) {
      console.error('[analytics] rpc failed', e);
      toast.error('No se pudieron cargar las métricas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentCompanyId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCsv = async () => {
    if (!currentCompanyId) return;
    setExporting(true);
    try {
      const since = new Date(Date.now() - period * 86400 * 1000).toISOString();
      const { data: rows, error } = await supabase
        .from('questions')
        .select('created_at, buyer_nickname, ai_category, status, ai_confidence')
        .eq('company_id', currentCompanyId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10000);
      if (error) throw error;

      const header = ['fecha', 'comprador', 'categoria', 'estado', 'confianza_ia'];
      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [header.join(',')];
      for (const r of rows ?? []) {
        lines.push(
          [
            new Date(r.created_at).toISOString(),
            r.buyer_nickname ?? '',
            r.ai_category ?? '',
            r.status ?? '',
            r.ai_confidence ?? '',
          ]
            .map(escape)
            .join(','),
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${period}d-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${rows?.length ?? 0} preguntas`);
    } catch (e: any) {
      console.error('[analytics] export failed', e);
      toast.error('No se pudo exportar el CSV');
    } finally {
      setExporting(false);
    }
  };

  const dailyChartData = useMemo(() => {
    if (!data?.daily_volume) return [];
    return data.daily_volume.map((d) => ({
      date: formatShortDate(d.date),
      auto: d.auto ?? 0,
      human: d.human ?? 0,
      otros: Math.max(0, (d.total ?? 0) - (d.auto ?? 0) - (d.human ?? 0)),
    }));
  }, [data]);

  const categoryChartData = useMemo(() => {
    if (!data?.by_category) return [];
    const total = data.by_category.reduce((s, c) => s + c.count, 0) || 1;
    return data.by_category.map((c) => ({
      name: c.category,
      value: c.count,
      pct: Math.round((c.count / total) * 100),
      fill: CATEGORY_COLORS[c.category] ?? '#888888',
    }));
  }, [data]);

  const isEmpty = !loading && (!data || data.total_questions === 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-3">7 días</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-3">30 días</TabsTrigger>
              <TabsTrigger value="90" className="text-xs px-3">90 días</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || isEmpty}
            className="h-8 gap-2 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[220px] rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </>
        ) : isEmpty ? (
          <EmptyState
            icon={BarChart3}
            title="Sin datos en este período"
            description="Todavía no hay preguntas registradas en el rango seleccionado. Probá con un período más amplio."
            actionLabel="Ver últimos 90 días"
            onAction={() => setPeriod(90)}
          />
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Total preguntas"
                value={data.total_questions}
                icon={Sparkles}
                delta={data.delta_total}
              />
              <KpiCard
                label="Auto-resueltas"
                value={data.auto_answered}
                icon={Bot}
                hint={`${data.auto_resolution_rate}% del total`}
                delta={data.delta_auto_rate}
              />
              <KpiCard
                label="Confianza IA"
                value={`${Math.round(Number(data.avg_confidence) * 100)}%`}
                icon={Sparkles}
                valueClass={confidenceColor(Number(data.avg_confidence) * 100)}
              />
              <KpiCard label="Pendientes" value={data.pending} icon={Clock} />
            </div>

            {/* Daily volume */}
            <Card className="p-4 border-[0.5px] shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Volumen diario</h2>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Auto</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Humano</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-muted-foreground/40" /> Resto</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={dailyChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip
                      contentStyle={{
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    />
                    <Bar dataKey="auto" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="human" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="otros" stackId="a" fill="hsl(var(--muted-foreground) / 0.4)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category + Top products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="p-4 border-[0.5px] shadow-none">
                <h2 className="text-sm font-semibold text-foreground mb-3">Distribución por categoría</h2>
                {categoryChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">Sin datos categorizados</p>
                ) : (
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {categoryChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="middle"
                          align="right"
                          layout="vertical"
                          iconType="circle"
                          formatter={(value, entry: any) => (
                            <span className="text-xs text-foreground">
                              {value} <span className="text-muted-foreground">({entry.payload.pct}%)</span>
                            </span>
                          )}
                        />
                        <RTooltip
                          contentStyle={{
                            background: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className="p-4 border-[0.5px] shadow-none">
                <h2 className="text-sm font-semibold text-foreground mb-3">Top productos</h2>
                {!data.top_products || data.top_products.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">Sin productos consultados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-[11px]">Producto</TableHead>
                        <TableHead className="h-8 text-[11px] text-right w-20">Consultas</TableHead>
                        <TableHead className="h-8 text-[11px] text-right w-16">Auto%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_products.map((p) => (
                        <TableRow key={p.product_id}>
                          <TableCell className="py-2 text-xs text-foreground truncate max-w-0">
                            <span className="block truncate">{p.title}</span>
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right tabular-nums">{p.questions}</TableCell>
                          <TableCell className={`py-2 text-xs text-right tabular-nums font-medium ${autoRateColor(Number(p.auto_rate))}`}>
                            {p.auto_rate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            {/* Top buyers */}
            <Card className="p-4 border-[0.5px] shadow-none">
              <h2 className="text-sm font-semibold text-foreground mb-3">Top compradores</h2>
              {!data.top_buyers || data.top_buyers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Sin compradores activos</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-[11px]">Comprador</TableHead>
                      <TableHead className="h-8 text-[11px] text-right w-24">Consultas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_buyers.map((b, i) => (
                      <TableRow key={`${b.buyer_nickname}-${i}`}>
                        <TableCell className="py-2 text-xs text-foreground">{b.buyer_nickname}</TableCell>
                        <TableCell className="py-2 text-xs text-right tabular-nums">{b.questions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            {/* Footer hint */}
            {data.human_escalated > 0 && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {data.human_escalated} consultas requirieron intervención humana en este período.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AnalyticsPage;
