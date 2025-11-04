-- Rollback to simple, working RLS policy
-- The trick: use a SECURITY DEFINER function that runs WITHOUT RLS

-- Drop all the problematic policies and functions
DROP POLICY IF EXISTS "Users can view tenant memberships" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can view all tenant memberships" ON public.user_tenants;
DROP FUNCTION IF EXISTS public.is_admin_in_tenant(UUID);

-- Create a helper function that checks admin status WITHOUT triggering RLS
-- SECURITY DEFINER means it runs with the privileges of the function owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_admin_in_any_tenant()
RETURNS TABLE(tenant_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ut.tenant_id
  FROM public.user_tenants ut
  WHERE ut.user_id = auth.uid()
    AND ut.role IN ('admin', 'owner');
$$;

-- Simple policy: users see their own records OR records from tenants where they're admin
CREATE POLICY "Users can view relevant tenant memberships"
  ON public.user_tenants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    tenant_id IN (SELECT public.user_is_admin_in_any_tenant())
  );
