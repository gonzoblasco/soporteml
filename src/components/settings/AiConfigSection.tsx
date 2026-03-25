import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AiConfigSection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [aiTone, setAiTone] = useState('profesional');
  const [aiInstructions, setAiInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    supabase
      .from('company_settings')
      .select('ai_tone, ai_custom_instructions')
      .eq('company_id', currentCompanyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAiTone(data.ai_tone || 'profesional');
          setAiInstructions(data.ai_custom_instructions || '');
        }
        setLoading(false);
      });
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setSaving(true);

    const payload = {
      company_id: currentCompanyId,
      ai_tone: aiTone,
      ai_custom_instructions: aiInstructions.trim() || null,
    };

    const { error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'company_id' });

    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Configuración de IA actualizada.' }
    );
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Configuración de IA</CardTitle>
        </div>
        <CardDescription>Personalizá cómo responde la IA a las preguntas de compradores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tono de respuestas</Label>
          <Select value={aiTone} onValueChange={setAiTone}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profesional">Profesional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aiInstructions">Instrucciones adicionales</Label>
          <Textarea
            id="aiInstructions"
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value.slice(0, 500))}
            placeholder="Ej: Siempre mencionar que hacemos envío gratis en CABA. No ofrecer descuentos."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{aiInstructions.length}/500 caracteres</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AiConfigSection;
