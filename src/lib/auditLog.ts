import { supabase } from '@/integrations/supabase/client';

/**
 * Reusable audit log helper — logs entity changes via direct insert.
 * For CRM entities: product, product_variant, etc.
 */
export async function logAuditEntry({
  companyId,
  actorUserId,
  entityType,
  entityId,
  action,
  before,
  after,
}: {
  companyId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'archive' | 'restore';
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    // Use edge function to insert (service role) since users don't have INSERT on audit_logs
    const { error } = await supabase.functions.invoke('audit-log', {
      body: { company_id: companyId, entity_type: entityType, entity_id: entityId, action, before_snapshot: before ?? null, after_snapshot: after ?? null },
    });

    if (error) {
      console.error('Audit log error:', error);
      throw new Error(`Audit log failed: ${error.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Audit log error:', err);
    throw err; // Re-throw to ensure calling code knows audit failed
  }
}
