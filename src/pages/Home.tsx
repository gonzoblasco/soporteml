import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, AlertTriangle, ArrowRight, Inbox, XCircle } from 'lucide-react';
import { KpiSkeleton, ChartCardSkeleton } from '@/components/SkeletonCards';
import { Skeleton } from '@/components/ui/skeleton';
import { computeHealth, getHealthUI, type MeliHealthStatus } from '@/lib/meliTokenHealth';

const timeAgoEs = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};

interface RecentQuestion {
  id: string;
  question_text: string;
  buyer_nickname: string | null;
  requires_human: boolean;
  created_at: string;
}

type TokenAlert = MeliHealthStatus;

const Home = () => {
  const navigate = useNavigate();
  const { currentCompanyId } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([]);
  const [agentData, setAgentData] = useState<{ name: string; answered: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenAlert, setTokenAlert] = useState<TokenAlert>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentCompanyId) { setLoading(false); return; }
      setLoading(true);

      const [{ data: qs }, { data: recent }, { data: token }] = await Promise.all([
        supabase
          .from('questions')
          .select('status, answered_by, answered_at, created_at')
          .eq('company_id', currentCompanyId),
        supabase
          .from('questions')
          .select('id, question_text, buyer_nickname, requires_human, created_at')
          .eq('company_id', currentCompanyId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.rpc('get_meli_connection_status', { _company_id: currentCompanyId }),
      ]);

      // Token health check using unified logic
      const health = computeHealth(token?.[0] ?? null);
      setTokenAlert(health.status);

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
  }, [currentCompanyId]);


  // Reset toast guard when company changes so the priority warning re-triggers
  const toastShown = useRef(false);
  useEffect(() => {
    toastShown.current = false;
  }, [currentCompanyId]);

  // Welcome toast for priority questions
  useEffect(() => {
    if (!loading && !toastShown.current) {
      toastShown.current = true;
      const priorityCount = questions.filter((q) => q.status === 'pending' && q.requires_human).length;
      if (priorityCount > 0) {
        toast.warning(`Tenés ${priorityCount} pregunta${priorityCount > 1 ? 's' : ''} urgente${priorityCount > 1 ? 's' : ''} esperando`, {
          action: { label: 'Ver', onClick: () => navigate('/priority') },
        });
      }
    }
  }, [loading, questions, navigate]);

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

  if (loading) {
    return (
      <div className="p-6 overflow-y-auto h-full space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-6 w-32 rounded mb-1" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <KpiSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de rendimiento del equipo</p>
      </div>

      {/* Token Alert Banner */}
      {tokenAlert && tokenAlert !== 'connected' && tokenAlert !== 'disconnected' && (() => {
        const ui = getHealthUI(tokenAlert);
        const colorMap = {
          red: { bg: 'bg-destructive/10 border-destructive/30 hover:bg-destructive/15', text: 'text-destructive', subtext: 'text-destructive/80' },
          amber: { bg: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', subtext: 'text-amber-600/80 dark:text-amber-400/80' },
          green: { bg: '', text: '', subtext: '' },
          muted: { bg: '', text: '', subtext: '' },
        };
        const colors = colorMap[ui.color];
        if (!colors.bg) return null;
        const iconMap = {
          red: <XCircle className="w-5 h-5 text-destructive shrink-0" />,
          amber: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          green: null,
          muted: null,
        };
        return (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${colors.bg}`}
            >
              {iconMap[ui.color]}
              <div>
                <p className={`text-sm font-medium ${colors.text}`}>{ui.label}</p>
                <p className={`text-xs ${colors.subtext}`}>{ui.description}</p>
              </div>
            </button>
          </motion.div>
        );
      })()}

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

      {/* Link to historic analytics */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/analytics')}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver métricas históricas <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {agentData.length === 0 && recentQuestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay datos suficientes todavía.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      const elapsed = isNaN(date.getTime()) ? '' : timeAgoEs(q.created_at);
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
        </div>
      )}
    </div>
  );
};

export default Home;
