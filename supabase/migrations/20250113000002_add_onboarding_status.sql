-- Add onboarding status tracking to tenant_profiles
ALTER TABLE tenant_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add settore_attivita field for company sector
ALTER TABLE tenant_profiles
ADD COLUMN IF NOT EXISTS settore_attivita TEXT;

-- Update RLS policies to allow owners to update tenant profiles
DROP POLICY IF EXISTS "Admins can update their tenant profile" ON tenant_profiles;
CREATE POLICY "Owners and admins can update their tenant profile"
  ON tenant_profiles FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert their tenant profile" ON tenant_profiles;
CREATE POLICY "Owners and admins can insert their tenant profile"
  ON tenant_profiles FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Add comment
COMMENT ON COLUMN tenant_profiles.onboarding_completed IS 'Indicates if the tenant has completed the onboarding process';
COMMENT ON COLUMN tenant_profiles.settore_attivita IS 'Company business sector/industry';
