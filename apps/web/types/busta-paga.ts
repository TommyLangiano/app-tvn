export interface BustaPaga {
  id: string;
  tenant_id: string;
  dipendente_id: string;
  mese: number;
  anno: number;
  importo_totale: number;
  ore_totali: number;
  costo_orario: number;
  note: string | null;
  allegato_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;

  // Relations
  dipendenti?: {
    nome: string;
    cognome: string;
    matricola?: string;
  };
  dettaglio?: BustaPagaDettaglio[];
}

export interface BustaPagaDettaglio {
  id: string;
  busta_paga_id: string;
  tenant_id: string;
  commessa_id: string;
  ore_commessa: number;
  importo_commessa: number;
  created_at: string;

  // Relations
  commesse?: {
    nome_commessa: string;
    codice_commessa?: string;
  };
}

export interface CalcoloBustaPaga {
  dipendente_id: string;
  mese: number;
  anno: number;
  ore_totali: number;
  suddivisione_commesse: {
    commessa_id: string;
    nome_commessa: string;
    codice_commessa?: string;
    ore: number;
  }[];
}
