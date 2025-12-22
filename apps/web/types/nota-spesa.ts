export type StatoNotaSpesa = 'bozza' | 'da_approvare' | 'approvato' | 'rifiutato';

export interface AllegatoNotaSpesa {
  nome_file: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  url?: string;
}

export interface NotaSpesa {
  id: string;
  tenant_id: string;
  commessa_id: string;
  dipendente_id: string;
  numero_nota: string;

  // Dati nota spesa
  data_nota: string;
  importo: number;
  categoria: string; // UUID riferimento a categorie_note_spesa.id
  descrizione?: string;

  // Allegati
  allegati: AllegatoNotaSpesa[];

  // Stati e approvazione
  stato: StatoNotaSpesa;
  approvato_da?: string;
  approvato_il?: string;
  rifiutato_da?: string;
  rifiutato_il?: string;
  motivo_rifiuto?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string;

  // Joined data
  commesse?: {
    titolo: string;
    slug: string;
  };
  dipendenti?: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
  categorie_note_spesa?: {
    id: string;
    nome: string;
    colore: string;
    icona: string;
  };
}

export interface NotaSpesaFormData {
  commessa_id: string;
  data_nota: string;
  importo: string;
  categoria: string;
  descrizione?: string;
  allegati?: File[];
}

export interface CategoriaNotaSpesa {
  id: string;
  tenant_id: string;
  nome: string;
  descrizione?: string;
  colore: string;
  icona: string;
  importo_massimo?: number;
  richiede_allegato: boolean;
  attiva: boolean;
  ordinamento: number;
  created_at: string;
  updated_at: string;
}

export interface NotaSpesaAzione {
  id: string;
  nota_spesa_id: string;
  azione: 'creata' | 'modificata' | 'sottomessa' | 'approvata' | 'rifiutata' | 'eliminata';
  eseguita_da: string;
  stato_precedente?: StatoNotaSpesa;
  stato_nuovo?: StatoNotaSpesa;
  dettagli?: Record<string, unknown>;
  created_at: string;

  // Joined data
  utente?: {
    nome: string;
    cognome: string;
    email: string;
  };
}
