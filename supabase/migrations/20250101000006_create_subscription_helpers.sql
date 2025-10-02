-- Function to check if tenant has an active subscription
CREATE OR REPLACE FUNCTION public.is_tenant_active(t UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.subscriptions s
    WHERE s.tenant_id = t
      AND (
        (s.status = 'trialing' AND now() < s.trial_end)
        OR (s.status IN ('active', 'past_due', 'incomplete') AND COALESCE(s.current_period_end, now()) >= now())
      )
  );
$$;

-- View to get current active plan for each tenant
CREATE VIEW public.tenant_plan AS
SELECT tenant_id, plan_id
FROM public.subscriptions s
WHERE (s.status = 'trialing' AND now() < s.trial_end)
   OR (s.status IN ('active', 'past_due', 'incomplete') AND COALESCE(s.current_period_end, now()) >= now());

-- Grant permissions on the view
GRANT SELECT ON public.tenant_plan TO authenticated;
