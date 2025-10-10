// Fatture Attive (Ricavi)
export interface FatturaAttiva {
  id: string;
  commessa_id: string;
  tenant_id: string;

  // Dati fattura
  numero_fattura: string;
  cliente: string;
  tipologia: string;
  data_emissione: string;
  data_pagamento: string | null;

  // Importi
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;

  // Pagamento
  modalita_pagamento: string | null;
  stato_pagamento: 'Pagato' | 'Non Pagato';

  // Allegato
  allegato_url: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Fatture Passive (Costi - Fattura)
export interface FatturaPassiva {
  id: string;
  commessa_id: string;
  tenant_id: string;

  // Dati fattura
  numero_fattura: string;
  fornitore: string;
  tipologia: string;
  data_emissione: string;
  data_pagamento: string | null;

  // Importi
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;

  // Pagamento
  modalita_pagamento: string | null;
  banca_emissione: string | null;
  numero_conto: string | null;
  stato_pagamento: 'Pagato' | 'Non Pagato';

  // Allegato
  allegato_url: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Scontrini (Costi - Scontrino)
export interface Scontrino {
  id: string;
  commessa_id: string;
  tenant_id: string;

  // Dati scontrino
  fornitore: string;
  tipologia: string;
  data_emissione: string;

  // Importo
  importo_totale: number;

  // Pagamento (sempre pagato)
  modalita_pagamento: string | null;
  stato_pagamento: 'Pagato';

  // Allegato
  allegato_url: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Tipo unione per tutti i costi
export type Costo = FatturaPassiva | Scontrino;

// Riepilogo Economico (aggiornato)
export interface RiepilogoEconomico {
  commessa_id: string;
  ricavi_imponibile: number;
  ricavi_iva: number;
  ricavi_totali: number;
  costi_imponibile: number;
  costi_iva: number;
  costi_totali: number;
  margine_lordo: number;
  saldo_iva: number;
  totale_movimenti: number;
  numero_ricavi: number;
  numero_costi: number;
}
