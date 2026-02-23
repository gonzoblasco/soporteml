import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Precio: 'hsl(200, 80%, 45%)',
  Stock: 'hsl(150, 60%, 35%)',
  Técnico: 'hsl(280, 60%, 50%)',
  Envío: 'hsl(25, 85%, 45%)',
  Garantía: 'hsl(340, 65%, 45%)',
};

const Analytics = () => {
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [agentData, setAgentData] = useState<{ name: string; answered: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ rank: number; name: string; questions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // All questions for this company (RLS handles scoping)
      const { data: questions } = await supabase
        .from('questions')
        .select('ai_category, status, answered_by, product_id, products(title)');

      if (questions) {
        // Category breakdown
        const catMap: Record<string, number> = {};
        questions.forEach((q: any) => {
          const cat = q.ai_category ?? 'Sin categoría';
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        setCategoryData(
          Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({
              name,
              value,
              fill: CATEGORY_COLORS[name] ?? 'hsl(220, 10%, 50%)',
            }))
        );

        // Agent performance (answered questions)
        const answered = questions.filter((q: any) => q.status === 'published' && q.answered_by);
        const agentMap: Record<string, number> = {};
        answered.forEach((q: any) => {
          const id = q.answered_by as string;
          agentMap[id] = (agentMap[id] || 0) + 1;
        });

        // Fetch agent names
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

        // Top products
        const prodMap: Record<string, { name: string; count: number }> = {};
        questions.forEach((q: any) => {
          const pid = q.product_id as string;
          if (!pid) return;
          if (!prodMap[pid]) {
            prodMap[pid] = { name: q.products?.title ?? 'Producto', count: 0 };
          }
          prodMap[pid].count += 1;
        });
        setTopProducts(
          Object.values(prodMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((p, i) => ({ rank: i + 1, name: p.name, questions: p.count }))
        );
      }

      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Resumen de rendimiento del equipo</p>
      </div>

      {categoryData.length === 0 && agentData.length === 0 && topProducts.length === 0 ? (
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

          {/* Top Products */}
          {topProducts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Top 5 Productos más consultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topProducts.map((p) => (
                      <div key={p.rank} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-lg font-bold text-primary w-6 text-center">{p.rank}</span>
                        <span className="flex-1 text-sm text-foreground">{p.name}</span>
                        <span className="text-sm font-medium text-muted-foreground">{p.questions} consultas</span>
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

export default Analytics;
