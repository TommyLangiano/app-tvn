-- Create user_profiles table for extended user information
-- This table has a 1:1 relationship with auth.users

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  -- Primary key: references auth.users
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Information
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- Professional Information
  position TEXT, -- Business role (e.g., "Tecnico", "Contabile", "Project Manager")

  -- Localization
  timezone TEXT DEFAULT 'Europe/Rome',
  locale TEXT DEFAULT 'it-IT',

  -- Additional Info
  notes TEXT, -- Internal notes about the user

  -- Status
  is_active BOOLEAN DEFAULT true, -- Soft disable for the entire application

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata (read from auth.users)
  -- These are populated via trigger/function and kept in sync
  email TEXT, -- Denormalized for quick access
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ============================================================================
-- AUTO-CREATE PROFILE ON USER CREATION
-- ============================================================================

-- Function to automatically create profile when auth user is created
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SYNC AUTH DATA TO PROFILE
-- ============================================================================

-- Function to sync auth.users data to profile on update
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

-- Trigger on auth.users to sync data
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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (except is_active)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Prevent users from changing their own is_active status
    AND is_active = (SELECT is_active FROM user_profiles WHERE user_id = auth.uid())
  );

-- Admins can view all profiles in their tenant
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

-- Admins can update profiles in their tenant (including is_active)
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

-- Admins can insert profiles (though this should happen via trigger)
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is active
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

-- Function to get user full name
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

-- ============================================================================
-- BACKFILL EXISTING USERS
-- ============================================================================

-- Create profiles for any existing users that don't have one
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
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Extended user profile information. 1:1 with auth.users';
COMMENT ON COLUMN user_profiles.user_id IS 'Foreign key to auth.users.id';
COMMENT ON COLUMN user_profiles.position IS 'Business/professional role (e.g., Tecnico, Contabile)';
COMMENT ON COLUMN user_profiles.is_active IS 'Soft disable flag for the entire application';
COMMENT ON COLUMN user_profiles.notes IS 'Internal notes about the user (visible to admins only)';
COMMENT ON FUNCTION is_user_active IS 'Check if a user is active in the system';
COMMENT ON FUNCTION get_user_full_name IS 'Get user full name from profile';
