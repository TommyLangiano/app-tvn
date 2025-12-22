export type TipologiaCliente = 'Privato' | 'Pubblico';
export type TipologiaCommessa = 'Appalto' | 'ATI' | 'Sub Appalto' | 'Sub Affidamento';

export interface Commessa {
  id: string;
  slug: string;
  tenant_id: string;
  created_by: string;

  // Required fields
  tipologia_cliente: TipologiaCliente;
  tipologia_commessa: TipologiaCommessa;
  nome_commessa: string;
  cliente_commessa: string;

  // Optional fields
  cliente_nome_completo?: string; // Populated from clienti table join
  codice_commessa?: string;
  importo_commessa?: number;
  budget_commessa?: number;
  costo_materiali?: number;
  cig?: string; // Required for Pubblico
  cup?: string; // Required for Pubblico
  citta?: string;
  provincia?: string;
  cap?: string;
  via?: string;
  numero_civico?: string;
  data_inizio?: string;
  data_fine_prevista?: string;
  descrizione?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CommessaFormData {
  tipologia_cliente: TipologiaCliente;
  tipologia_commessa: TipologiaCommessa;
  nome_commessa: string;
  cliente_commessa: string;
  codice_commessa?: string;
  importo_commessa?: number;
  budget_commessa?: number;
  costo_materiali?: number;
  cig?: string; // Required for Pubblico
  cup?: string; // Required for Pubblico
  citta?: string;
  provincia?: string;
  cap?: string;
  via?: string;
  numero_civico?: string;
  data_inizio?: string;
  data_fine_prevista?: string;
  descrizione?: string;
}
