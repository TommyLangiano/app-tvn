-- This migration safely applies all pending changes from previous migrations
-- It uses DO blocks to check for existence before creating

-- ============================================================================
-- FROM 20250112000000: Add new roles to enum
-- ============================================================================

DO $$
BEGIN
  -- Add admin_readonly if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin_readonly'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tenant_role'
    )
  ) THEN
    ALTER TYPE tenant_role ADD VALUE 'admin_readonly';
  END IF;

  -- Add billing_manager if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'billing_manager'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tenant_role'
    )
  ) THEN
    ALTER TYPE tenant_role ADD VALUE 'billing_manager';
  END IF;
END$$;

-- Create function to check if tenant has at least one owner
CREATE OR REPLACE FUNCTION check_tenant_has_owner()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- If we're deleting or updating a role from owner
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN

    -- Count remaining owners for this tenant
    SELECT COUNT(*) INTO owner_count
    FROM user_tenants
    WHERE tenant_id = OLD.tenant_id
    AND role = 'owner'
    AND (TG_OP = 'DELETE' OR user_id != NEW.user_id);

    -- If no owners remain, block the operation
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove last owner from tenant. At least one owner must remain.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce owner constraint
DROP TRIGGER IF EXISTS ensure_tenant_has_owner ON user_tenants;
CREATE TRIGGER ensure_tenant_has_owner
  BEFORE UPDATE OR DELETE ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_has_owner();

-- Create index for role-based queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON user_tenants(role);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_role ON user_tenants(tenant_id, role);

-- ============================================================================
-- FROM 202501120000001: RLS Helper Functions (simplified - just the new ones)
-- ============================================================================

-- Will be created in next migration after user_profiles exists

-- ============================================================================
-- FROM 20250112000002: Create user_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  position TEXT,
  timezone TEXT DEFAULT 'Europe/Rome',
  locale TEXT DEFAULT 'it-IT',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    last_sign_in_at,
    email_confirmed_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.last_sign_in_at,
    NEW.email_confirmed_at
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Sync auth data
CREATE OR REPLACE FUNCTION sync_user_profile_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    email = NEW.email,
    last_sign_in_at = NEW.last_sign_in_at,
    email_confirmed_at = NEW.email_confirmed_at
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at OR
    OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
  )
  EXECUTE FUNCTION sync_user_profile_from_auth();

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_active = (SELECT is_active FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view tenant profiles" ON user_profiles;
CREATE POLICY "Admins can view tenant profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut1
      WHERE ut1.user_id = auth.uid()
      AND ut1.role IN ('admin', 'owner', 'admin_readonly')
      AND ut1.tenant_id IN (
        SELECT tenant_id FROM user_tenants ut2
        WHERE ut2.user_id = user_profiles.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update tenant profiles" ON user_profiles;
CREATE POLICY "Admins can update tenant profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut1
      WHERE ut1.user_id = auth.uid()
      AND ut1.role IN ('admin', 'owner')
      AND ut1.tenant_id IN (
        SELECT tenant_id FROM user_tenants ut2
        WHERE ut2.user_id = user_profiles.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION is_user_active(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_id_param
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_full_name(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  name TEXT;
BEGIN
  SELECT full_name INTO name
  FROM user_profiles
  WHERE user_id = user_id_param;
  RETURN COALESCE(name, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Backfill
INSERT INTO user_profiles (user_id, email, full_name, last_sign_in_at, email_confirmed_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.last_sign_in_at,
  u.email_confirmed_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
);

-- ============================================================================
-- FROM 20250112000003: Update user_tenants
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_tenants' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_tenants' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_tenants' AND column_name = 'scopes'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN scopes JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_tenants' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_tenants_is_active ON user_tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tenants_created_by ON user_tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tenants_scopes ON user_tenants USING gin(scopes);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_tenants_updated_at ON user_tenants;
CREATE TRIGGER user_tenants_updated_at
  BEFORE UPDATE ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tenants_updated_at();

-- Helper functions for user_tenants
CREATE OR REPLACE FUNCTION is_user_active_in_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = user_id_param
    AND ut.tenant_id = tenant_id_param
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Set created_by trigger
CREATE OR REPLACE FUNCTION set_user_tenants_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_created_by ON user_tenants;
CREATE TRIGGER set_created_by
  BEFORE INSERT ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tenants_created_by();

-- Backfill created_by
UPDATE user_tenants ut
SET created_by = t.created_by
FROM tenants t
WHERE ut.tenant_id = t.id
AND ut.created_by IS NULL
AND ut.role = 'owner';

UPDATE user_tenants ut
SET created_by = (
  SELECT user_id
  FROM user_tenants ut2
  WHERE ut2.tenant_id = ut.tenant_id
  AND ut2.role = 'owner'
  LIMIT 1
)
WHERE ut.created_by IS NULL;

-- Update RLS helper functions to respect is_active
CREATE OR REPLACE FUNCTION is_admin_or_owner(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_read_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'admin_readonly')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_write_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role NOT IN ('admin_readonly', 'viewer')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_billing_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'admin_readonly', 'billing_manager')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_write_billing(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'billing_manager')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
