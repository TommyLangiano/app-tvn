-- Enable Row Level Security on tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on user_tenants table
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT tenants they are members of
CREATE POLICY "Users can view tenants they belong to"
  ON public.tenants
  FOR SELECT
  USING (public.is_member_of(id));

-- Policy: Users can SELECT their own tenant memberships
CREATE POLICY "Users can view their own tenant memberships"
  ON public.user_tenants
  FOR SELECT
  USING (user_id = auth.uid());
