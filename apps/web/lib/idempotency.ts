import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Idempotency helper per prevenire duplicazione su retry/double-click
 *
 * Usage:
 * const idempotencyKey = request.headers.get('idempotency-key');
 * if (idempotencyKey) {
 *   const cached = await checkIdempotency(idempotencyKey, 'POST /api/users/create', body);
 *   if (cached) return cached;
 * }
 */

export async function checkIdempotency(
  key: string,
  endpoint: string,
  requestBody: any,
  tenantId?: string
): Promise<NextResponse | null> {
  const supabase = await createClient();

  // Hash del request body per verificare che sia identico
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex');

  // Cerca chiave esistente
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('response, status_code, request_hash, expires_at')
    .eq('key', key)
    .eq('endpoint', endpoint)
    .single();

  if (existing) {
    // Verifica non scaduta
    if (new Date(existing.expires_at) < new Date()) {
      // Scaduta, trattala come nuova richiesta
      return null;
    }

    // Verifica che il request body sia identico
    if (existing.request_hash !== requestHash) {
      // Stessa chiave ma body diverso = errore
      return NextResponse.json(
        {
          error: 'Idempotency key conflict: same key with different request body',
        },
        { status: 422 }
      );
    }

    // Ritorna response cachata
    return NextResponse.json(existing.response, { status: existing.status_code });
  }

  return null;
}

export async function storeIdempotencyResult(
  key: string,
  endpoint: string,
  requestBody: any,
  response: any,
  statusCode: number,
  tenantId?: string
): Promise<void> {
  const supabase = await createClient();

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex');

  await supabase.from('idempotency_keys').insert({
    key,
    endpoint,
    request_hash: requestHash,
    response,
    status_code: statusCode,
    tenant_id: tenantId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  });
}
