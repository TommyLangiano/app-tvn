-- Create commesse_team table
CREATE TABLE IF NOT EXISTS public.commesse_team (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commessa_id uuid NOT NULL,
  dipendente_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT commesse_team_pkey PRIMARY KEY (id),
  CONSTRAINT commesse_team_commessa_id_fkey FOREIGN KEY (commessa_id) REFERENCES public.commesse(id) ON DELETE CASCADE,
  CONSTRAINT commesse_team_dipendente_id_fkey FOREIGN KEY (dipendente_id) REFERENCES public.dipendenti(id) ON DELETE CASCADE,
  CONSTRAINT commesse_team_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT commesse_team_unique UNIQUE (commessa_id, dipendente_id)
);

-- Enable RLS
ALTER TABLE public.commesse_team ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view team from their tenant"
  ON public.commesse_team
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert team for their tenant"
  ON public.commesse_team
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete team from their tenant"
  ON public.commesse_team
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_commesse_team_commessa_id ON public.commesse_team(commessa_id);
CREATE INDEX idx_commesse_team_dipendente_id ON public.commesse_team(dipendente_id);
CREATE INDEX idx_commesse_team_tenant_id ON public.commesse_team(tenant_id);
