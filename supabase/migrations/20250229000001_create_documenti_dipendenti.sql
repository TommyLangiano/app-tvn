-- Create table for dipendenti documents
CREATE TABLE IF NOT EXISTS public.documenti_dipendenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dipendente_id UUID NOT NULL REFERENCES public.dipendenti(id) ON DELETE CASCADE,

  -- Document info
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('patente', 'patentino', 'certificato', 'contratto', 'documento_identita', 'altro')),
  nome_documento TEXT NOT NULL,
  descrizione TEXT,

  -- File storage
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,

  -- Metadata
  data_rilascio DATE,
  data_scadenza DATE,
  numero_documento TEXT,
  ente_rilascio TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Indexes
  CONSTRAINT documenti_dipendenti_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT documenti_dipendenti_dipendente_fk FOREIGN KEY (dipendente_id) REFERENCES public.dipendenti(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_documenti_dipendenti_tenant ON public.documenti_dipendenti(tenant_id);
CREATE INDEX idx_documenti_dipendenti_dipendente ON public.documenti_dipendenti(dipendente_id);
CREATE INDEX idx_documenti_dipendenti_tipo ON public.documenti_dipendenti(tipo_documento);
CREATE INDEX idx_documenti_dipendenti_scadenza ON public.documenti_dipendenti(data_scadenza) WHERE data_scadenza IS NOT NULL;

-- Enable RLS
ALTER TABLE public.documenti_dipendenti ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents for their tenant"
  ON public.documenti_dipendenti
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their tenant"
  ON public.documenti_dipendenti
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents for their tenant"
  ON public.documenti_dipendenti
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents for their tenant"
  ON public.documenti_dipendenti
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_documenti_dipendenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_documenti_dipendenti_updated_at
  BEFORE UPDATE ON public.documenti_dipendenti
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documenti_dipendenti_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documenti_dipendenti TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
