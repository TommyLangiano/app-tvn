-- Enable Row Level Security on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT projects if they are members of the tenant and tenant is active
CREATE POLICY "Users can view projects in their active tenants"
  ON public.projects
  FOR SELECT
  USING (
    public.is_member_of(tenant_id)
    AND public.is_tenant_active(tenant_id)
  );

-- Policy: Users can INSERT projects if they are members of the tenant and tenant is active
CREATE POLICY "Users can create projects in their active tenants"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    public.is_member_of(tenant_id)
    AND public.is_tenant_active(tenant_id)
  );

-- Policy: Owners and admins can UPDATE projects in their active tenants
CREATE POLICY "Owners and admins can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    public.has_role(tenant_id, ARRAY['owner', 'admin'])
    AND public.is_tenant_active(tenant_id)
  )
  WITH CHECK (
    public.has_role(tenant_id, ARRAY['owner', 'admin'])
    AND public.is_tenant_active(tenant_id)
  );

-- Policy: Only owners can DELETE projects in their active tenants
CREATE POLICY "Only owners can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    public.has_role(tenant_id, ARRAY['owner'])
    AND public.is_tenant_active(tenant_id)
  );
