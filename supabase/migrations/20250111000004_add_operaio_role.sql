-- Add 'operaio' role to tenant_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'operaio'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tenant_role'
    )
  ) THEN
    ALTER TYPE tenant_role ADD VALUE 'operaio';
  END IF;
END$$;

-- Note: Now we have: 'admin', 'member', 'operaio'
-- admin = full access to everything including creating users
-- member = standard user (legacy, might be unused)
-- operaio = worker/employee with limited access (can only see their own rapportini)
