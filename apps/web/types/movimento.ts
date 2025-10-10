export type TipoMovimento = 'ricavo' | 'costo';

export interface Movimento {
  id: string;
  commessa_id: string;
  tenant_id: string;

  // Tipo movimento
  tipo: TipoMovimento;

  // Dati economici
  descrizione: string;
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;

  // Metadati
  data_movimento: string;
  categoria?: string;
  note?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface MovimentoFormData {
  tipo: TipoMovimento;
  descrizione: string;
  importo_imponibile: number;
  aliquota_iva: number;
  data_movimento: string;
  categoria?: string;
  note?: string;
}

export interface RiepilogoEconomico {
  commessa_id: string;

  // Ricavi
  ricavi_imponibile: number;
  ricavi_iva: number;
  ricavi_totali: number;

  // Costi
  costi_imponibile: number;
  costi_iva: number;
  costi_totali: number;

  // Margini
  margine_lordo: number;
  saldo_iva: number;

  // Conteggi
  totale_movimenti: number;
  numero_ricavi: number;
  numero_costi: number;
}
