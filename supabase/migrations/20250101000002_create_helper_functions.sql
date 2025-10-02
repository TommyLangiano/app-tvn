-- Function to check if user is a member of a tenant
CREATE OR REPLACE FUNCTION public.is_member_of(t UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = t
  );
$$;

-- Function to check if user has specific role(s) in a tenant
CREATE OR REPLACE FUNCTION public.has_role(t UUID, roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = auth.uid()
      AND tenant_id = t
      AND role::TEXT = ANY(roles)
  );
$$;
