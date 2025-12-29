export type TipoDocumento = 'patente' | 'patentino' | 'certificato' | 'contratto' | 'documento_identita' | 'altro';

export interface DocumentoDipendente {
  id: string;
  tenant_id: string;
  dipendente_id: string;

  // Document info
  tipo_documento: TipoDocumento;
  nome_documento: string;
  descrizione?: string;

  // File storage
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;

  // Metadata
  data_rilascio?: string;
  data_scadenza?: string;
  numero_documento?: string;
  ente_rilascio?: string;

  // Timestamps
  created_at?: string;
  created_by?: string;
  updated_at?: string;
}

export const TIPI_DOCUMENTO: Record<TipoDocumento, string> = {
  patente: 'Patente di Guida',
  patentino: 'Patentino / Certificazione',
  certificato: 'Certificato',
  contratto: 'Contratto',
  documento_identita: 'Documento d\'Identità',
  altro: 'Altro Documento'
};
