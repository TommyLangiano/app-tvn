-- Fix RLS policy for user_tenants to allow admins/owners to view all users in their tenant

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own tenant memberships" ON public.user_tenants;

-- Create new policy that allows:
-- 1. Users to see their own memberships
-- 2. Admins/Owners to see all memberships in their tenant
CREATE POLICY "Users can view tenant memberships"
  ON public.user_tenants
  FOR SELECT
  USING (
    -- User can see their own memberships
    user_id = auth.uid()
    OR
    -- Or user is admin/owner in the same tenant
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = user_tenants.tenant_id
        AND ut.role IN ('admin', 'owner')
    )
  );
