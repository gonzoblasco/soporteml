import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare, Clock, AlertTriangle, Package, Users, ArrowRight, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORY_COLORS: Record<string, string> = {
  Precio: 'hsl(200, 80%, 45%)',
  Stock: 'hsl(150, 60%, 35%)',
  Técnico: 'hsl(280, 60%, 50%)',
  Envío: 'hsl(25, 85%, 45%)',
  Garantía: 'hsl(340, 65%, 45%)',
};

type RankingMode = 'products' | 'buyers';

interface RecentQuestion {
  id: string;
  question_text: string;
  buyer_nickname: string | null;
  requires_human: boolean;
  created_at: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([]);
  const [agentData, setAgentData] = useState<{ name: string; answered: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingMode, setRankingMode] = useState<RankingMode>('products');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [{ data: qs }, { data: recent }] = await Promise.all([
        supabase
          .from('questions')
          .select('ai_category, status, answered_by, answered_at, created_at, product_id, buyer_nickname, buyer_id, products(title)'),
        supabase
          .from('questions')
          .select('id, question_text, buyer_nickname, requires_human, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (recent) setRecentQuestions(recent);

      if (qs) {
        setQuestions(qs);

        const answered = qs.filter((q: any) => q.status === 'published' && q.answered_by);
        const agentMap: Record<string, number> = {};
        answered.forEach((q: any) => {
          agentMap[q.answered_by] = (agentMap[q.answered_by] || 0) + 1;
        });

        const agentIds = Object.keys(agentMap);
        if (agentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', agentIds);
          const nameMap: Record<string, string> = {};
          profiles?.forEach((p) => {
            nameMap[p.id] = p.full_name ?? p.id.slice(0, 8);
          });
          setAgentData(
            Object.entries(agentMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([id, count]) => ({ name: nameMap[id] ?? id.slice(0, 8), answered: count }))
          );
        }
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Derived data ---
  const today = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    const answeredToday = questions.filter(
      (q) => q.status === 'published' && q.answered_at?.slice(0, 10) === today
    ).length;

    const pending = questions.filter((q) => q.status === 'pending').length;

    const withTimes = questions.filter((q) => q.status === 'published' && q.answered_at && q.created_at);
    let avgMinutes = 0;
    if (withTimes.length > 0) {
      const totalMs = withTimes.reduce((sum: number, q: any) => {
        return sum + (new Date(q.answered_at).getTime() - new Date(q.created_at).getTime());
      }, 0);
      avgMinutes = Math.round(totalMs / withTimes.length / 60000);
    }
    const avgLabel = avgMinutes < 1 ? '< 1 min' : avgMinutes < 60 ? `${avgMinutes} min` : `${Math.round(avgMinutes / 60)}h`;

    return { answeredToday, pending, avgLabel };
  }, [questions, today]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    questions.forEach((q: any) => {
      const cat = q.ai_category ?? 'Sin categoría';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        fill: CATEGORY_COLORS[name] ?? 'hsl(220, 10%, 50%)',
      }));
  }, [questions]);

  const totalQuestions = useMemo(() => questions.length, [questions]);

  const topProducts = useMemo(() => {
    const prodMap: Record<string, { name: string; count: number }> = {};
    questions.forEach((q: any) => {
      const pid = q.product_id as string;
      if (!pid) return;
      if (!prodMap[pid]) prodMap[pid] = { name: q.products?.title ?? 'Producto', count: 0 };
      prodMap[pid].count += 1;
    });
    return Object.values(prodMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p, i) => ({ rank: i + 1, name: p.name, questions: p.count }));
  }, [questions]);

  const topBuyers = useMemo(() => {
    const buyerMap: Record<string, { name: string; count: number }> = {};
    questions.forEach((q: any) => {
      const key = q.buyer_nickname ?? q.buyer_id;
      if (!key) return;
      if (!buyerMap[key]) buyerMap[key] = { name: key, count: 0 };
      buyerMap[key].count += 1;
    });
    return Object.values(buyerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((b, i) => ({ rank: i + 1, name: b.name, questions: b.count }));
  }, [questions]);

  const rankingData = rankingMode === 'products' ? topProducts : topBuyers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de rendimiento del equipo</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Respondidas hoy', value: String(kpis.answeredToday), icon: MessageSquare },
          { label: 'Tiempo promedio', value: kpis.avgLabel, icon: Clock },
          { label: 'Pendientes', value: String(kpis.pending), icon: AlertTriangle },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="text-center p-4 rounded-lg bg-muted/50 border border-border/30">
              <kpi.icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <div className="text-2xl font-bold text-primary">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {categoryData.length === 0 && agentData.length === 0 && recentQuestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay datos suficientes todavía.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          {categoryData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Consultas por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {categoryData.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                        {c.name} ({c.value})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Category Progress Bars */}
          {categoryData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Distribución por Categoría</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryData.map((c) => {
                    const pct = totalQuestions > 0 ? Math.round((c.value / totalQuestions) * 100) : 0;
                    return (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="text-xs w-20 text-muted-foreground truncate">{c.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: c.fill }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity Widget */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Actividad reciente</CardTitle>
                  <button
                    onClick={() => navigate('/inbox')}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver todo <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {recentQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No hay consultas pendientes</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentQuestions.map((q) => {
                      const date = new Date(q.created_at);
                      const elapsed = isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true, locale: es });
                      return (
                        <button
                          key={q.id}
                          onClick={() => navigate(q.requires_human ? '/priority' : '/inbox')}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          {q.requires_human ? (
                            <Badge className="shrink-0 border-transparent bg-amber-500 text-white dark:bg-amber-600 px-1.5 py-0.5 text-[10px]">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              Priority
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 border-primary/50 text-primary bg-primary/10 px-1.5 py-0.5 text-[10px]">
                              <Inbox className="w-3 h-3 mr-0.5" />
                              Inbox
                            </Badge>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-foreground">{q.question_text}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {q.buyer_nickname ?? 'Comprador'} · {elapsed}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar Chart */}
          {agentData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rendimiento por Empleado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                        <Bar dataKey="answered" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Ranking: Products or Buyers toggle */}
          {rankingData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {rankingMode === 'products' ? 'Top 5 Productos' : 'Top 5 Compradores'}
                    </CardTitle>
                    <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
                      <button
                        onClick={() => setRankingMode('products')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                          rankingMode === 'products'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        Productos
                      </button>
                      <button
                        onClick={() => setRankingMode('buyers')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                          rankingMode === 'buyers'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        Compradores
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rankingData.map((item) => (
                      <div key={item.rank} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-lg font-bold text-primary w-6 text-center">{item.rank}</span>
                        <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
                        <span className="text-sm font-medium text-muted-foreground">{item.questions} consultas</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
