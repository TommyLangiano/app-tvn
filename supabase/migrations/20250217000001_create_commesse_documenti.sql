-- Create commesse_documenti table
CREATE TABLE IF NOT EXISTS public.commesse_documenti (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commessa_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  nome_file text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT commesse_documenti_pkey PRIMARY KEY (id),
  CONSTRAINT commesse_documenti_commessa_id_fkey FOREIGN KEY (commessa_id) REFERENCES public.commesse(id) ON DELETE CASCADE,
  CONSTRAINT commesse_documenti_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT commesse_documenti_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.commesse_documenti ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view documents from their tenant"
  ON public.commesse_documenti
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their tenant"
  ON public.commesse_documenti
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents from their tenant"
  ON public.commesse_documenti
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_commesse_documenti_commessa_id ON public.commesse_documenti(commessa_id);
CREATE INDEX idx_commesse_documenti_tenant_id ON public.commesse_documenti(tenant_id);
