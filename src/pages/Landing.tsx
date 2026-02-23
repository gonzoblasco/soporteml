import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, BarChart3, Link2, Inbox, Bot, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const features = [
  {
    icon: Sparkles,
    title: 'Respuestas con IA',
    desc: 'Generá respuestas inteligentes al instante. La IA analiza cada pregunta y sugiere la mejor respuesta según tu producto.',
  },
  {
    icon: AlertTriangle,
    title: 'Bandeja prioritaria',
    desc: 'Las preguntas que necesitan atención humana se destacan automáticamente para que no pierdas ninguna venta.',
  },
  {
    icon: BarChart3,
    title: 'Analítica en tiempo real',
    desc: 'Visualizá métricas clave: tiempo de respuesta, categorías más frecuentes y rendimiento del equipo.',
  },
];

const steps = [
  { icon: Link2, title: 'Conectá MeLi', desc: 'Vinculá tu cuenta de Mercado Libre en un clic.' },
  { icon: Inbox, title: 'Recibí preguntas', desc: 'Todas las preguntas llegan a tu bandeja organizada.' },
  { icon: Bot, title: 'Respondé con IA', desc: 'Revisá la sugerencia, editala si querés y publicá.' },
];

const Landing = () => {
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Registrarse</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
          >
            Gestioná las preguntas de{' '}
            <span className="text-gradient">Mercado Libre</span> con IA
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Respondé más rápido, vendé más. SoporteML clasifica, prioriza y sugiere respuestas automáticas para todas las preguntas de tus publicaciones.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/login">
                Empezar gratis <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            variants={fadeUp}
            className="mt-16 glass-panel rounded-xl p-4 sm:p-6 max-w-3xl mx-auto"
          >
            <div className="rounded-lg bg-muted/50 border border-border/50 p-4 space-y-3">
              {[
                { cat: 'Precio', q: '¿Hacen descuento por 3 unidades?', status: 'pending' },
                { cat: 'Envío', q: '¿Llega antes del viernes a Córdoba?', status: 'pending' },
                { cat: 'Técnico', q: '¿Es compatible con iPhone 15?', status: 'answered' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md bg-card p-3 border border-border/30"
                >
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.cat}
                  </span>
                  <span className="text-sm truncate flex-1">{item.q}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'pending'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {item.status === 'pending' ? 'Pendiente' : 'Respondida'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12">
            Todo lo que necesitás
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="glass-panel rounded-xl p-6 text-center"
              >
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

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/30">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12">
            ¿Cómo funciona?
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold mb-4">
                  {i + 1}
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-4">
            Dejá que la IA trabaje por vos
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-8">
            Empezá a responder preguntas en minutos. Sin tarjeta de crédito.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/login">
                Comenzar ahora <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} SoporteML. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
