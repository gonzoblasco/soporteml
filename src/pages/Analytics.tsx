import { mockAnalytics } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const Analytics = () => {
  return (
    <div className="p-6 overflow-y-auto h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Resumen de rendimiento del equipo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Consultas por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockAnalytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {mockAnalytics.categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 24%, 10%)',
                        border: '1px solid hsl(220, 18%, 18%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'hsl(210, 20%, 92%)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {mockAnalytics.categoryBreakdown.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                    {c.name} ({c.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rendimiento por Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockAnalytics.agentPerformance} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 24%, 10%)',
                        border: '1px solid hsl(220, 18%, 18%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'hsl(210, 20%, 92%)',
                      }}
                    />
                    <Bar dataKey="answered" fill="hsl(45, 93%, 47%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top 5 Productos más consultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockAnalytics.topProducts.map((p) => (
                  <div
                    key={p.rank}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg font-bold text-primary w-6 text-center">{p.rank}</span>
                    <span className="flex-1 text-sm text-foreground">{p.name}</span>
                    <span className="text-sm font-medium text-muted-foreground">{p.questions} consultas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
