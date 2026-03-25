import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Save, Zap, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAYS_OF_WEEK = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miércoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sábado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
];

type AutoReplyMode = 'off' | 'always' | 'outside_business_hours';

interface BusinessHours {
  days: string[];
  start_time: string;
  end_time: string;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
  start_time: '09:00',
  end_time: '18:00',
};

const AutoReplySection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AutoReplyMode>('off');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [exclusionRules, setExclusionRules] = useState('');
  const [autopilotAfterHours, setAutopilotAfterHours] = useState(false);
  const [autopilotInHours, setAutopilotInHours] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('auto_reply_enabled, auto_reply_exclusion_rules, auto_reply_mode, business_hours, features_autopilot_after_hours, features_autopilot_in_hours, autopilot_confidence_threshold')
        .eq('company_id', currentCompanyId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        if (d.auto_reply_mode && d.auto_reply_mode !== 'off') {
          setMode(d.auto_reply_mode as AutoReplyMode);
        } else if (d.auto_reply_enabled) {
          setMode('always');
        }
        if (d.business_hours) {
          setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...d.business_hours });
        }
        setExclusionRules(d.auto_reply_exclusion_rules ?? '');
        setAutopilotAfterHours(d.features_autopilot_after_hours ?? false);
        setAutopilotInHours(d.features_autopilot_in_hours ?? false);
        setConfidenceThreshold(d.autopilot_confidence_threshold ?? 0.85);
      }
      setLoading(false);
    })();
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        company_id: currentCompanyId,
        auto_reply_enabled: mode !== 'off',
        auto_reply_mode: mode,
        business_hours: businessHours,
        auto_reply_exclusion_rules: exclusionRules || null,
        features_autopilot_after_hours: autopilotAfterHours,
        features_autopilot_in_hours: autopilotInHours,
        autopilot_confidence_threshold: confidenceThreshold,
      } as any, { onConflict: 'company_id' });

    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Configuración de auto-respuesta actualizada.' }
    );
    setSaving(false);
  };

  const toggleDay = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  if (loading) return null;

  const isActive = mode !== 'off';

  const getActiveChip = () => {
    if (autopilotInHours && autopilotAfterHours) return { label: 'Auto siempre', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    if (autopilotAfterHours) return { label: 'Auto fuera de horario', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    if (isActive) return { label: 'Solo sugiere', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    return null;
  };
  const chip = getActiveChip();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Autopilot & Auto-Respuesta</CardTitle>
              <CardDescription>Configurá cómo responde la IA automáticamente</CardDescription>
            </div>
          </div>
          {chip && (
            <Badge variant="outline" className={`text-xs ${chip.color}`}>
              {chip.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bot className="w-4 h-4" />
            Autopilot
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ap-after" className="text-sm">Fuera de horario comercial</Label>
              <p className="text-xs text-muted-foreground">La IA responde automáticamente cuando estás cerrado.</p>
            </div>
            <Switch id="ap-after" checked={autopilotAfterHours} onCheckedChange={setAutopilotAfterHours} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ap-in" className="text-sm">En horario comercial</Label>
              <p className="text-xs text-muted-foreground">La IA responde automáticamente incluso cuando estás abierto (solo si confidence es alta).</p>
            </div>
            <Switch id="ap-in" checked={autopilotInHours} onCheckedChange={setAutopilotInHours} />
          </div>
          
          {(autopilotAfterHours || autopilotInHours) && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Umbral de confianza</Label>
                <span className="text-sm font-mono text-foreground">{confidenceThreshold.toFixed(2)}</span>
              </div>
              <Slider
                value={[confidenceThreshold]}
                onValueChange={([v]) => setConfidenceThreshold(v)}
                min={0.5}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Solo se publican automáticamente respuestas con confidence ≥ {confidenceThreshold.toFixed(2)}. Valores más altos = más conservador.
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm">Modo legacy (compatibilidad)</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as AutoReplyMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Desactivada</SelectItem>
              <SelectItem value="always">Siempre activa (24/7)</SelectItem>
              <SelectItem value="outside_business_hours">Solo fuera del horario comercial</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {mode === 'off' && 'Las respuestas nunca se publican automáticamente por modo legacy.'}
            {mode === 'always' && 'La IA responde automáticamente a todas las preguntas (sin evaluación de confidence).'}
            {mode === 'outside_business_hours' && 'La IA responde solo fuera del horario (sin evaluación de confidence).'}
          </p>
        </div>

        {(mode === 'outside_business_hours' || autopilotAfterHours) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Horario comercial</Label>
              <p className="text-xs text-muted-foreground">
                Definí tu horario de atención. El autopilot fuera de horario funciona FUERA de este horario.
              </p>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      businessHours.days.includes(key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="time"
                    value={businessHours.start_time}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-28"
                  />
                </div>
                <span className="text-muted-foreground mt-5">—</span>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="time"
                    value={businessHours.end_time}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-28"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {(isActive || autopilotAfterHours || autopilotInHours) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Reglas de exclusión</Label>
              <p className="text-xs text-muted-foreground">
                Describí en texto libre qué tipo de consultas NO deben responderse automáticamente.
              </p>
              <Textarea
                value={exclusionRules}
                onChange={(e) => setExclusionRules(e.target.value)}
                placeholder="Ej: Toda consulta sobre compra, venta, negociación o trueque de vehículos y motos debe ser revisada por un humano."
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3 flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                La IA analizará cada pregunta y decidirá si requiere intervención humana. Las que coincidan con estas reglas o no superen el umbral de confianza aparecerán en el <strong>Priority Inbox</strong>.
              </p>
            </div>
          </>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutoReplySection;
