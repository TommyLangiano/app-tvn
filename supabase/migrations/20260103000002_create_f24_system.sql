-- Tabella principale F24
-- Contiene i dati del modello F24 mensile per azienda
CREATE TABLE public.f24 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,

  -- Dati F24
  importo_f24 numeric NOT NULL CHECK (importo_f24 > 0),
  mese integer NOT NULL CHECK (mese >= 1 AND mese <= 12),
  anno integer NOT NULL CHECK (anno >= 2000 AND anno <= 2100),

  -- Calcoli automatici
  totale_ore_decimali numeric NOT NULL CHECK (totale_ore_decimali > 0),
  numero_dipendenti integer NOT NULL CHECK (numero_dipendenti > 0),
  valore_orario numeric NOT NULL CHECK (valore_orario > 0),

  -- Metadata
  note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,

  CONSTRAINT f24_pkey PRIMARY KEY (id),
  CONSTRAINT f24_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT f24_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Un solo F24 per mese/anno per azienda
  CONSTRAINT f24_unique_mese_anno_tenant UNIQUE (tenant_id, mese, anno)
);

-- Tabella dettaglio ripartizione F24 per commessa
-- Contiene la ripartizione dell'F24 tra le varie commesse
CREATE TABLE public.f24_dettaglio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  f24_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  commessa_id uuid NOT NULL,

  -- Dati ripartizione
  ore_commessa numeric NOT NULL CHECK (ore_commessa > 0),
  numero_dipendenti_commessa integer NOT NULL CHECK (numero_dipendenti_commessa > 0),
  valore_f24_commessa numeric NOT NULL CHECK (valore_f24_commessa > 0),

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT f24_dettaglio_pkey PRIMARY KEY (id),
  CONSTRAINT f24_dettaglio_f24_id_fkey FOREIGN KEY (f24_id) REFERENCES public.f24(id) ON DELETE CASCADE,
  CONSTRAINT f24_dettaglio_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT f24_dettaglio_commessa_id_fkey FOREIGN KEY (commessa_id) REFERENCES public.commesse(id) ON DELETE CASCADE,

  -- Una sola ripartizione per commessa per F24
  CONSTRAINT f24_dettaglio_unique_f24_commessa UNIQUE (f24_id, commessa_id)
);

-- Indici per performance
CREATE INDEX idx_f24_tenant_mese_anno ON public.f24(tenant_id, anno DESC, mese DESC);
CREATE INDEX idx_f24_dettaglio_f24_id ON public.f24_dettaglio(f24_id);
CREATE INDEX idx_f24_dettaglio_commessa_id ON public.f24_dettaglio(commessa_id);

-- Enable RLS
ALTER TABLE public.f24 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f24_dettaglio ENABLE ROW LEVEL SECURITY;

-- RLS Policies per f24
CREATE POLICY "Users can view F24 of their tenant"
  ON public.f24 FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert F24 in their tenant"
  ON public.f24 FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update F24 of their tenant"
  ON public.f24 FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete F24 of their tenant"
  ON public.f24 FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- RLS Policies per f24_dettaglio
CREATE POLICY "Users can view F24 details of their tenant"
  ON public.f24_dettaglio FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert F24 details in their tenant"
  ON public.f24_dettaglio FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update F24 details of their tenant"
  ON public.f24_dettaglio FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete F24 details of their tenant"
  ON public.f24_dettaglio FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Commenti per documentazione
COMMENT ON TABLE public.f24 IS 'Tabella per la gestione dei modelli F24 mensili per azienda';
COMMENT ON TABLE public.f24_dettaglio IS 'Dettaglio ripartizione F24 tra le commesse in base alle ore lavorate';
COMMENT ON COLUMN public.f24.valore_orario IS 'Valore orario calcolato: importo_f24 / totale_ore_decimali';
COMMENT ON COLUMN public.f24_dettaglio.valore_f24_commessa IS 'Valore F24 per commessa: ore_commessa * valore_orario';
