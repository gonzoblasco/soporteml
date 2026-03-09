import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Inbox, Bot, BarChart3, Users } from 'lucide-react';

const MockupTabs = () => (
  <Tabs defaultValue="inbox" className="w-full">
    <TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto mb-6">
      <TabsTrigger value="inbox" className="gap-1.5 text-xs sm:text-sm"><Inbox className="w-4 h-4" /> Bandeja</TabsTrigger>
      <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm"><Bot className="w-4 h-4" /> Copiloto</TabsTrigger>
      <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm"><Users className="w-4 h-4" /> Equipo</TabsTrigger>
      <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" /> Métricas</TabsTrigger>
    </TabsList>

    <TabsContent value="inbox">
      <div className="glass-panel rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Preguntas pendientes</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">12 sin responder</span>
            <span className="text-xs text-muted-foreground">Empresa: TechStore</span>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { cat: 'Precio', q: '¿Hacen descuento por 3 unidades?', buyer: 'comprador_123', time: 'Hace 2 min', status: 'pending', priority: true },
            { cat: 'Envío', q: '¿Llega antes del viernes a Córdoba?', buyer: 'maria_cba', time: 'Hace 5 min', status: 'pending', priority: false },
            { cat: 'Técnico', q: '¿Es compatible con iPhone 15?', buyer: 'tech_buyer', time: 'Hace 12 min', status: 'answered', priority: false },
            { cat: 'Garantía', q: '¿Tiene garantía oficial de 12 meses?', buyer: 'juan_bsas', time: 'Hace 18 min', status: 'answered', priority: false },
            { cat: 'Stock', q: '¿Tienen stock del color negro?', buyer: 'user_456', time: 'Hace 25 min', status: 'pending', priority: true },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-md bg-card p-3 border ${item.priority ? 'border-warning/50 bg-warning/5' : 'border-border/30'}`}>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.cat}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{item.q}</span>
                <span className="text-xs text-muted-foreground">{item.buyer} · {item.time}</span>
              </div>
              {item.priority && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning shrink-0">Prioritaria</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {item.status === 'pending' ? 'Pendiente' : 'Respondida'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </TabsContent>

    <TabsContent value="ai">
      <div className="glass-panel rounded-xl p-4 sm:p-6">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Precio</span>
              <span className="text-xs text-muted-foreground">comprador_123 · Hace 2 min</span>
            </div>
            <p className="text-sm font-medium">¿Hacen descuento por 3 unidades?</p>
            <p className="text-xs text-muted-foreground mt-1">Producto: Funda iPhone 15 Pro Max Silicona — $12.500</p>
          </div>
          <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Sugerencia del Copiloto</span>
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">95% confianza</span>
            </div>
            <p className="text-sm">¡Hola! Gracias por tu interés. Por el momento el precio publicado es el mejor que podemos ofrecerte. Sin embargo, si comprás 3 unidades, el envío es gratis a todo el país. ¡Esperamos tu compra!</p>
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Contexto usado:</span> Catálogo del producto, política de envíos, historial de respuestas similares.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">Publicar respuesta</div>
            <div className="h-9 px-4 rounded-md border border-input bg-background flex items-center justify-center text-sm cursor-pointer hover:bg-muted transition-colors">Editar</div>
            <div className="h-9 px-4 rounded-md border border-input bg-background flex items-center justify-center text-sm cursor-pointer hover:bg-muted transition-colors">Descartar</div>
          </div>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="team">
      <div className="glass-panel rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Equipo de TechStore</span>
          <span className="text-xs text-muted-foreground">3 miembros activos</span>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Martín García', role: 'Admin', email: 'martin@techstore.com', status: 'online', answered: 45 },
            { name: 'Lucía Fernández', role: 'Agente', email: 'lucia@techstore.com', status: 'online', answered: 32 },
            { name: 'Diego Rodríguez', role: 'Agente', email: 'diego@techstore.com', status: 'offline', answered: 28 },
          ].map((member, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md bg-card p-3 border border-border/30">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${member.status === 'online' ? 'bg-success' : 'bg-muted'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{member.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${member.role === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {member.role}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{member.email}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{member.answered}</div>
                <div className="text-[10px] text-muted-foreground">resp. hoy</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Código de invitación: <code className="px-1.5 py-0.5 rounded bg-muted font-mono">TECH-2024</code></span>
            <span className="text-primary cursor-pointer hover:underline">Copiar enlace</span>
          </div>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="analytics">
      <div className="glass-panel rounded-xl p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Respondidas hoy', value: '135' },
            { label: 'Tiempo promedio', value: '< 2 min' },
            { label: 'Precisión IA', value: '95%' },
            { label: 'Autopilot', value: '48' },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
              <div className="text-lg font-bold text-primary">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Preguntas por categoría</p>
          {[
            { cat: 'Precio', pct: 35, color: 'bg-primary' },
            { cat: 'Envío', pct: 28, color: 'bg-primary/80' },
            { cat: 'Técnico', pct: 18, color: 'bg-primary/60' },
            { cat: 'Stock', pct: 12, color: 'bg-primary/40' },
            { cat: 'Garantía', pct: 7, color: 'bg-primary/20' },
          ].map((c) => (
            <div key={c.cat} className="flex items-center gap-3">
              <span className="text-xs w-16">{c.cat}</span>
              <div className="flex-1 h-2 rounded-full bg-muted">
                <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Empresa: TechStore</span>
            <span className="text-primary cursor-pointer hover:underline">Ver reporte completo →</span>
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
);

export default MockupTabs;
