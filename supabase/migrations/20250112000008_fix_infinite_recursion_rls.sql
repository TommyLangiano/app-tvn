-- Fix infinite recursion in user_tenants RLS policy
-- Use a helper function with SECURITY DEFINER to break the recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view tenant memberships" ON public.user_tenants;

-- Create a security definer function to check if user is admin/owner in tenant
-- This runs with elevated privileges and doesn't trigger RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_in_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('admin', 'owner')
  );
END;
$$;

-- Create new policy that uses the helper function
CREATE POLICY "Users can view tenant memberships"
  ON public.user_tenants
  FOR SELECT
  USING (
    -- User can see their own memberships
    user_id = auth.uid()
    OR
    -- Or user is admin/owner in the same tenant (using helper function)
    public.is_admin_in_tenant(tenant_id)
  );
