-- Stored procedure to create a tenant with initial trial subscription
CREATE OR REPLACE FUNCTION public.create_tenant(
  p_name TEXT,
  p_plan TEXT DEFAULT 'base'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_trial_days INT;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate plan exists
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = p_plan) THEN
    RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END IF;

  -- 1. Create tenant
  INSERT INTO public.tenants (name, created_by)
  VALUES (p_name, v_user_id)
  RETURNING id INTO v_tenant_id;

  -- 2. Add user as owner of the tenant
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, 'owner');

  -- 3. Get trial days from plan
  SELECT trial_days INTO v_trial_days
  FROM public.plans
  WHERE id = p_plan;

  -- 4. Create trial subscription
  INSERT INTO public.subscriptions (
    tenant_id,
    plan_id,
    status,
    trial_start,
    trial_end
  )
  VALUES (
    v_tenant_id,
    p_plan,
    'trialing',
    now(),
    now() + (v_trial_days || ' days')::INTERVAL
  );

  -- 5. Return tenant ID
  RETURN v_tenant_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tenant(TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_tenant(TEXT, TEXT) IS
'Creates a new tenant with the calling user as owner and starts a trial subscription. Returns the tenant ID.';
