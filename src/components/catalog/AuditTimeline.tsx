import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-init';
import { Loader2, Clock, FileEdit, Archive, RotateCcw, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  entityType: string;
  entityId: string;
  companyId: string;
}

const actionIcons: Record<string, typeof FileEdit> = {
  create: PlusCircle,
  update: FileEdit,
  archive: Archive,
  restore: RotateCcw,
};

const actionLabels: Record<string, string> = {
  create: 'creó',
  update: 'editó',
  archive: 'archivó',
  restore: 'restauró',
};

export function AuditTimeline({ entityType, entityId, companyId }: Props) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      const entries = (data ?? []) as unknown as AuditEntry[];
      setLogs(entries);

      // Fetch actor names
      const actorIds = [...new Set(entries.map((e) => e.actor_user_id))];
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', actorIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.id] = p.full_name || 'Usuario'; });
        setProfiles(map);
      }

      setLoading(false);
    };
    if (entityId) fetch();
  }, [entityType, entityId, companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Clock className="w-5 h-5 mx-auto mb-2 opacity-40" />
        Sin actividad registrada aún.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const Icon = actionIcons[log.action] || FileEdit;
        const label = actionLabels[log.action] || log.action;
        const actorName = profiles[log.actor_user_id] || 'Usuario';
        const changedFields = log.action === 'update' && log.after_snapshot
          ? Object.keys(log.after_snapshot).filter((k) => !['updated_at', 'updated_by'].includes(k))
          : [];

        return (
          <div key={log.id} className="flex gap-3 text-sm">
            <div className="mt-0.5">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <Icon className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground">
                <span className="font-medium">{actorName}</span>{' '}
                <span className="text-muted-foreground">{label} esta ficha</span>
              </p>
              {changedFields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Campos: {changedFields.join(', ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
