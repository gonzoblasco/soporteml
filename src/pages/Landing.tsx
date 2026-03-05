import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, AlertTriangle, BarChart3, Link2, Inbox, Bot, ArrowRight,
  MessageSquare, Sun, Moon, Clock, History, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import MockupTabs from '@/components/landing/MockupTabs';
import ContactForm from '@/components/landing/ContactForm';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const features = [
  { icon: Sparkles, title: 'Respuestas con IA', desc: 'Generá respuestas inteligentes al instante. La IA analiza cada pregunta y sugiere la mejor respuesta según tu producto.' },
  { icon: AlertTriangle, title: 'Bandeja prioritaria', desc: 'Las preguntas que necesitan atención humana se destacan automáticamente para que no pierdas ninguna venta.' },
  { icon: BarChart3, title: 'Analítica en tiempo real', desc: 'Visualizá métricas clave: tiempo de respuesta, categorías más frecuentes y rendimiento del equipo.' },
  { icon: Link2, title: 'Conexión directa con MeLi', desc: 'Sincronización automática de preguntas. Conectá tu cuenta en un clic y empezá a recibir todo en tu panel.' },
  { icon: Clock, title: 'Auto-respuesta programable', desc: 'Configurá horarios y reglas de respuesta automática. La IA responde por vos fuera del horario laboral.' },
  { icon: History, title: 'Historial completo', desc: 'Todas las preguntas y respuestas organizadas por producto y fecha. Buscá y filtrá cuando necesites.' },
];

const steps = [
  { icon: Link2, title: 'Conectá MeLi', desc: 'Vinculá tu cuenta de Mercado Libre en un clic. La integración es segura y directa con la API oficial.' },
  { icon: Inbox, title: 'Recibí preguntas', desc: 'Todas las preguntas llegan a tu bandeja organizada por categoría, prioridad y producto.' },
  { icon: Bot, title: 'Respondé con IA', desc: 'Revisá la sugerencia de la IA, editala si querés y publicá con un solo clic.' },
];

const Landing = () => {
  const { theme, setTheme } = useTheme();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <span>SoporteML</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Funciones</button>
            <button onClick={() => scrollTo('how')} className="hover:text-foreground transition-colors">Cómo funciona</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-foreground transition-colors">Contacto</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full">
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <motion.div className="max-w-4xl mx-auto text-center" initial="hidden" animate="visible" variants={stagger}>
          <motion.p variants={fadeUp} className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
            Solución exclusiva para vendedores profesionales
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Gestioná las preguntas de{' '}
            <span className="text-gradient">Mercado Libre</span> con IA
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Respondé más rápido, vendé más. SoporteML clasifica, prioriza y sugiere respuestas automáticas para todas las preguntas de tus publicaciones.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/signup">
                Empezar gratis <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
            <Button size="lg" variant="ghost" onClick={() => scrollTo('contact')}>
              Solicitar información
            </Button>
          </motion.div>

          {/* Mini stats bar */}
          <motion.div variants={fadeUp} className="mt-12 flex justify-center gap-6 sm:gap-10 text-center">
            {[
              { value: '147', label: 'preguntas hoy' },
              { value: '92%', label: 'respondidas' },
              { value: '< 3 min', label: 'promedio' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <AnimatedCounter end={10000} prefix="+" label="preguntas gestionadas" />
          <AnimatedCounter end={2} prefix="< " suffix=" min" label="respuesta promedio" />
          <AnimatedCounter end={95} suffix="%" label="precisión IA" />
          <AnimatedCounter end={50} prefix="+" label="vendedores profesionales" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <motion.div className="max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            Todo lo que necesitás
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Herramientas diseñadas para que dediques menos tiempo a responder preguntas y más tiempo a vender.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="glass-panel rounded-xl p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Mockups */}
      <section className="py-20 px-4 bg-muted/30">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">
            Así se ve tu panel
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Explorá las vistas principales: bandeja, respuesta con IA y analytics.
          </motion.p>
          <motion.div variants={fadeUp}>
            <MockupTabs />
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12">
            ¿Cómo funciona?
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-[3.25rem] left-[16.67%] right-[16.67%] h-px border-t-2 border-dashed border-primary/30" />
            {steps.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} className="text-center relative">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold mb-4 relative z-10">
                  {i + 1}
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 px-4 bg-muted/30">
        <motion.div className="max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl font-bold mb-4">¿Querés saber más?</h2>
              <p className="text-muted-foreground mb-6">
                Contanos sobre tu negocio y te mostramos cómo SoporteML puede ayudarte a responder más rápido y vender más en Mercado Libre.
              </p>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Configuración inicial en menos de 5 minutos</span>
                </div>
                <div className="flex items-start gap-3">
                  <Bot className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>IA entrenada para responder preguntas de productos</span>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Métricas y reportes para optimizar tu atención</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-6">
              <ContactForm />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} SoporteML. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <button onClick={() => scrollTo('contact')} className="hover:text-foreground transition-colors">Contacto</button>
            <Link to="/login" className="hover:text-foreground transition-colors">Acceder</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
