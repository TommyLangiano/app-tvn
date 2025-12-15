-- Fix Security Issues from Supabase Linter
-- This migration addresses:
-- 1. RLS not enabled on 'subscriptions' table
-- 2. RLS not enabled on 'plans' table
-- 3. SECURITY DEFINER on 'tenant_plan' view
-- 4. SECURITY DEFINER on 'riepilogo_economico_commessa' view (implicit from CREATE VIEW)

-- ============================================
-- 1. Enable RLS on subscriptions table
-- ============================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
-- Users can only see subscriptions for their own tenants
CREATE POLICY "Users can view subscriptions in their tenant"
  ON public.subscriptions FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Only service role can insert/update/delete subscriptions (Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 2. Enable RLS on plans table
-- ============================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plans
-- Plans are read-only for all authenticated users
CREATE POLICY "Authenticated users can view plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can manage plans
CREATE POLICY "Service role can manage plans"
  ON public.plans FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 3. Fix tenant_plan view - Remove SECURITY DEFINER
-- ============================================
-- Drop the existing view
DROP VIEW IF EXISTS public.tenant_plan;

-- Recreate without SECURITY DEFINER (default is SECURITY INVOKER)
CREATE VIEW public.tenant_plan AS
SELECT tenant_id, plan_id
FROM public.subscriptions s
WHERE (s.status = 'trialing' AND now() < s.trial_end)
   OR (s.status IN ('active', 'past_due', 'incomplete') AND COALESCE(s.current_period_end, now()) >= now());

-- Grant permissions
GRANT SELECT ON public.tenant_plan TO authenticated;

-- ============================================
-- 4. Fix riepilogo_economico_commessa view
-- ============================================
-- The view is already created without explicit SECURITY DEFINER
-- But we need to ensure it uses SECURITY INVOKER
DROP VIEW IF EXISTS public.riepilogo_economico_commessa;

CREATE VIEW public.riepilogo_economico_commessa
WITH (security_invoker = true) AS
WITH ricavi AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as ricavi_imponibile,
    COALESCE(SUM(importo_iva), 0) as ricavi_iva,
    COALESCE(SUM(importo_totale), 0) as ricavi_totali,
    COUNT(*) as numero_ricavi
  FROM fatture_attive
  GROUP BY commessa_id
),
costi_fatture AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as costi_imponibile,
    COALESCE(SUM(importo_iva), 0) as costi_iva,
    COALESCE(SUM(importo_totale), 0) as costi_totali,
    COUNT(*) as numero_fatture_passive
  FROM fatture_passive
  GROUP BY commessa_id
),
costi_scontrini AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_totale), 0) as scontrini_totali,
    COUNT(*) as numero_scontrini
  FROM scontrini
  GROUP BY commessa_id
),
all_commesse AS (
  SELECT DISTINCT commessa_id FROM fatture_attive
  UNION
  SELECT DISTINCT commessa_id FROM fatture_passive
  UNION
  SELECT DISTINCT commessa_id FROM scontrini
)
SELECT
  ac.commessa_id,
  -- Ricavi
  COALESCE(r.ricavi_imponibile, 0) as ricavi_imponibile,
  COALESCE(r.ricavi_iva, 0) as ricavi_iva,
  COALESCE(r.ricavi_totali, 0) as ricavi_totali,
  -- Costi (fatture passive hanno imponibile e IVA, scontrini solo totale)
  COALESCE(cf.costi_imponibile, 0) as costi_imponibile,
  COALESCE(cf.costi_iva, 0) as costi_iva,
  COALESCE(cf.costi_totali, 0) + COALESCE(cs.scontrini_totali, 0) as costi_totali,
  -- Margini calcolati
  COALESCE(r.ricavi_imponibile, 0) - COALESCE(cf.costi_imponibile, 0) as margine_lordo,
  COALESCE(r.ricavi_iva, 0) - COALESCE(cf.costi_iva, 0) as saldo_iva,
  -- Conteggi
  COALESCE(r.ricavi_totali, 0) + COALESCE(cf.costi_totali, 0) + COALESCE(cs.scontrini_totali, 0) as totale_movimenti,
  COALESCE(r.numero_ricavi, 0) as numero_ricavi,
  COALESCE(cf.numero_fatture_passive, 0) + COALESCE(cs.numero_scontrini, 0) as numero_costi
FROM all_commesse ac
LEFT JOIN ricavi r ON ac.commessa_id = r.commessa_id
LEFT JOIN costi_fatture cf ON ac.commessa_id = cf.commessa_id
LEFT JOIN costi_scontrini cs ON ac.commessa_id = cs.commessa_id;

-- Grant permissions
GRANT SELECT ON public.riepilogo_economico_commessa TO authenticated;

-- ============================================
-- 5. Update is_tenant_active function
-- ============================================
-- Keep SECURITY DEFINER but add a comment explaining why it's needed
-- (It needs to read subscriptions table regardless of RLS)
COMMENT ON FUNCTION public.is_tenant_active(UUID) IS
  'Uses SECURITY DEFINER to check subscription status bypassing RLS. This is safe because it only returns a boolean and does not expose subscription data.';
