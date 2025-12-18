import { createClient } from '@supabase/supabase-js';

export type AuditEventType =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_status_changed'
  | 'user_role_changed'
  | 'login_success'
  | 'login_failed'
  | 'password_reset_requested'
  | 'password_changed'
  | 'file_uploaded'
  | 'file_deleted'
  | 'tenant_created'
  | 'tenant_updated'
  | 'sensitive_data_accessed'
  | 'permission_changed';

interface AuditLogParams {
  tenantId: string;
  userId?: string;
  eventType: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

/**
 * 🔒 SECURITY #56: Rimuove PII da oldValues/newValues prima del logging
 */
function sanitizePII(values: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!values) return undefined;

  const sanitized = { ...values };
  const piiFields = ['email', 'phone', 'full_name', 'first_name', 'last_name', 'password', 'token', 'api_key'];

  for (const field of piiFields) {
    if (field in sanitized) {
      // Sostituisci PII con hash o placeholder
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(params: AuditLogParams): Promise<string | null> {
  try {
    // Create admin client inside function to avoid build-time issues
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 🔒 SECURITY #56: Sanitizza PII da oldValues/newValues
    const sanitizedOldValues = sanitizePII(params.oldValues);
    const sanitizedNewValues = sanitizePII(params.newValues);

    const { data, error } = await supabaseAdmin.rpc('log_audit_event', {
      p_tenant_id: params.tenantId,
      p_user_id: params.userId || null,
      p_event_type: params.eventType,
      p_resource_type: params.resourceType || null,
      p_resource_id: params.resourceId || null,
      p_old_values: sanitizedOldValues ? JSON.stringify(sanitizedOldValues) : null,
      p_new_values: sanitizedNewValues ? JSON.stringify(sanitizedNewValues) : null,
      p_ip_address: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error('[Audit] Failed to log event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Audit] Exception logging event:', error);
    return null;
  }
}

/**
 * 🔒 SECURITY #70: Sanitizza User-Agent per prevenire XSS se loggato/visualizzato
 */
function sanitizeUserAgent(userAgent: string): string {
  if (!userAgent || userAgent === 'unknown') return 'unknown';

  // Rimuovi caratteri HTML/script pericolosi
  return userAgent
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 500); // Limit length to prevent DoS
}

/**
 * Helper to extract request metadata
 */
export function getRequestMetadata(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const rawUserAgent = request.headers.get('user-agent') || 'unknown';

  // 🔒 SECURITY #70: Sanitizza User-Agent prima di loggare
  const userAgent = sanitizeUserAgent(rawUserAgent);

  return { ipAddress, userAgent };
}
