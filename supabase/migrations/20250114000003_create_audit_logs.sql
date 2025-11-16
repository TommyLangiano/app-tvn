-- Create audit_logs table for tracking sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'user_created',
    'user_updated',
    'user_deleted',
    'user_status_changed',
    'user_role_changed',
    'login_success',
    'login_failed',
    'password_reset_requested',
    'password_changed',
    'file_uploaded',
    'file_deleted',
    'tenant_created',
    'tenant_updated',
    'sensitive_data_accessed',
    'permission_changed'
  )),

  -- Metadata
  resource_type TEXT, -- 'user', 'commessa', 'fattura', etc.
  resource_id TEXT, -- ID of the affected resource
  old_values JSONB, -- Previous state (for updates)
  new_values JSONB, -- New state (for creates/updates)

  -- Request details
  ip_address TEXT,
  user_agent TEXT,

  -- Additional info
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admin/owner can view audit logs
CREATE POLICY "Admin and owners can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Only system can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create function to log events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_tenant_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    event_type,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    notes
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
