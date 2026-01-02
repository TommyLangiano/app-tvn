-- Tabella principale buste paga
CREATE TABLE public.buste_paga (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  dipendente_id uuid NOT NULL,
  mese integer NOT NULL CHECK (mese >= 1 AND mese <= 12),
  anno integer NOT NULL CHECK (anno >= 2000 AND anno <= 2100),
  importo_totale numeric NOT NULL CHECK (importo_totale >= 0),
  ore_totali numeric NOT NULL DEFAULT 0 CHECK (ore_totali >= 0),
  costo_orario numeric NOT NULL DEFAULT 0 CHECK (costo_orario >= 0),
  note text,
  allegato_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,

  CONSTRAINT buste_paga_pkey PRIMARY KEY (id),
  CONSTRAINT buste_paga_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT buste_paga_dipendente_id_fkey FOREIGN KEY (dipendente_id) REFERENCES public.dipendenti(id) ON DELETE CASCADE,
  CONSTRAINT buste_paga_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Vincolo di unicità: un dipendente può avere solo una busta paga per mese/anno
  CONSTRAINT buste_paga_dipendente_mese_anno_unique UNIQUE (tenant_id, dipendente_id, mese, anno)
);

-- Tabella dettaglio suddivisione per commessa
CREATE TABLE public.buste_paga_dettaglio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  busta_paga_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  commessa_id uuid NOT NULL,
  ore_commessa numeric NOT NULL CHECK (ore_commessa >= 0),
  importo_commessa numeric NOT NULL CHECK (importo_commessa >= 0),
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT buste_paga_dettaglio_pkey PRIMARY KEY (id),
  CONSTRAINT buste_paga_dettaglio_busta_paga_id_fkey FOREIGN KEY (busta_paga_id) REFERENCES public.buste_paga(id) ON DELETE CASCADE,
  CONSTRAINT buste_paga_dettaglio_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT buste_paga_dettaglio_commessa_id_fkey FOREIGN KEY (commessa_id) REFERENCES public.commesse(id) ON DELETE CASCADE,
  -- Vincolo di unicità: una busta paga può avere solo un dettaglio per commessa
  CONSTRAINT buste_paga_dettaglio_busta_commessa_unique UNIQUE (busta_paga_id, commessa_id)
);

-- Indici per performance
CREATE INDEX idx_buste_paga_tenant_id ON public.buste_paga(tenant_id);
CREATE INDEX idx_buste_paga_dipendente_id ON public.buste_paga(dipendente_id);
CREATE INDEX idx_buste_paga_mese_anno ON public.buste_paga(mese, anno);
CREATE INDEX idx_buste_paga_dettaglio_busta_paga_id ON public.buste_paga_dettaglio(busta_paga_id);
CREATE INDEX idx_buste_paga_dettaglio_commessa_id ON public.buste_paga_dettaglio(commessa_id);

-- Row Level Security (RLS)
ALTER TABLE public.buste_paga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buste_paga_dettaglio ENABLE ROW LEVEL SECURITY;

-- Policy per buste_paga: gli utenti possono vedere solo le buste del loro tenant
CREATE POLICY "Users can view buste paga of their tenant"
  ON public.buste_paga
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert buste paga in their tenant"
  ON public.buste_paga
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update buste paga in their tenant"
  ON public.buste_paga
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete buste paga in their tenant"
  ON public.buste_paga
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy per buste_paga_dettaglio
CREATE POLICY "Users can view buste paga dettaglio of their tenant"
  ON public.buste_paga_dettaglio
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert buste paga dettaglio in their tenant"
  ON public.buste_paga_dettaglio
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update buste paga dettaglio in their tenant"
  ON public.buste_paga_dettaglio
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete buste paga dettaglio in their tenant"
  ON public.buste_paga_dettaglio
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_buste_paga_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_buste_paga_updated_at_trigger
  BEFORE UPDATE ON public.buste_paga
  FOR EACH ROW
  EXECUTE FUNCTION update_buste_paga_updated_at();
