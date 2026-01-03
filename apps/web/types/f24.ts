export interface F24 {
  id: string;
  tenant_id: string;
  importo_f24: number;
  mese: number;
  anno: number;
  totale_ore_decimali: number;
  numero_dipendenti: number;
  valore_orario: number;
  note?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface F24Dettaglio {
  id: string;
  f24_id: string;
  tenant_id: string;
  commessa_id: string;
  ore_commessa: number;
  numero_dipendenti_commessa: number;
  valore_f24_commessa: number;
  created_at: string;
  commesse?: {
    id: string;
    nome_commessa: string;
    cliente_commessa: string;
    titolo?: string;
  };
}

export interface F24FormData {
  importo_f24: number;
  mese: number;
  anno: number;
  note?: string;
}
