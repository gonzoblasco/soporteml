import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-init';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  message: z.string().trim().min(1, 'El mensaje es obligatorio').max(1000),
});

const ContactForm = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side rate limiting: 1 submission per 60 seconds
    const RATE_LIMIT_KEY = 'contact_form_last_submit';
    const RATE_LIMIT_MS = 60 * 1000;
    const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < RATE_LIMIT_MS) {
      toast.error('Por favor esperá un minuto antes de enviar otra consulta.');
      return;
    }

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('contact_inquiries' as any).insert(result.data as any);
    setLoading(false);

    if (error) {
      toast.error('Error al enviar la consulta. Intentá de nuevo.');
      return;
    }

    localStorage.setItem('contact_form_last_submit', Date.now().toString());
    toast.success('¡Consulta enviada! Te responderemos a la brevedad.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="contact-name">Nombre</Label>
        <Input
          id="contact-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Tu nombre"
          maxLength={100}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="tu@email.com"
          maxLength={255}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="contact-message">Mensaje</Label>
        <Textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="¿En qué podemos ayudarte?"
          maxLength={1000}
          rows={4}
        />
        {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full glow-primary">
        {loading ? 'Enviando...' : 'Enviar consulta'}
        <Send className="ml-1 w-4 h-4" />
      </Button>
    </form>
  );
};

export default ContactForm;
