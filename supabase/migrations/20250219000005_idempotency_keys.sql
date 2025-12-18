-- Tabella per idempotency keys
-- Previene duplicazione su double-click/retry nelle API critiche

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Indice per lookup veloce
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_keys_key_endpoint
ON idempotency_keys (key, endpoint);

-- Indice per cleanup automatico
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
ON idempotency_keys (expires_at);

-- Auto-cleanup delle chiavi expire (esegui tramite cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commenti
COMMENT ON TABLE idempotency_keys IS
'Cache per idempotency keys. Previene duplicazione su retry.
Le chiavi scadono dopo 24h e vengono auto-cleanup.';

COMMENT ON FUNCTION cleanup_expired_idempotency_keys IS
'Cleanup automatico chiavi scadute. Eseguire tramite cron job giornaliero.';
