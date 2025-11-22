-- Add icon field to custom_roles table
-- This allows custom roles to have a visual icon (User, Shield, Crown, etc.)

-- Step 1: Add column without constraint
ALTER TABLE custom_roles
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'User';

-- Step 2: Update existing system roles with appropriate icons
UPDATE custom_roles
SET icon = CASE
  WHEN system_role_key = 'owner' THEN 'Crown'
  WHEN system_role_key = 'admin' THEN 'Shield'
  WHEN system_role_key = 'admin_readonly' THEN 'Eye'
  WHEN system_role_key = 'dipendente' THEN 'User'
  ELSE 'User'
END
WHERE icon IS NULL OR icon NOT IN ('User', 'Shield', 'Crown', 'Eye', 'Briefcase', 'Wrench', 'HardHat', 'Truck', 'Settings', 'FileText', 'Users');

-- Step 3: Ensure all NULL values are set to 'User'
UPDATE custom_roles
SET icon = 'User'
WHERE icon IS NULL;

-- Step 4: Now add check constraint to ensure valid icon values
ALTER TABLE custom_roles
  ADD CONSTRAINT icon_valid CHECK (
    icon IN ('User', 'Shield', 'Crown', 'Eye', 'Briefcase', 'Wrench', 'HardHat', 'Truck', 'Settings', 'FileText', 'Users')
  );

-- Comment
COMMENT ON COLUMN custom_roles.icon IS 'Icon name from Lucide icons (User, Shield, Crown, Eye, Briefcase, Wrench, HardHat, Truck, Settings, FileText, Users)';
