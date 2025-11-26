-- Add INSERT policy for tenants table
-- This allows authenticated users to create new tenants during signup

CREATE POLICY "Allow authenticated users to create tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Add INSERT policy for user_tenants table
CREATE POLICY "Allow users to link themselves to tenants"
  ON public.user_tenants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
