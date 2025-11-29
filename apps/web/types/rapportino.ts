export interface Rapportino {
  id: string;
  tenant_id: string;
  user_id?: string; // Opzionale: presente solo se il dipendente ha un account
  dipendente_id?: string; // Opzionale: presente solo se il dipendente non ha un account
  user_name?: string;
  user_email?: string;
  commessa_id: string;
  data_rapportino: string;
  ore_lavorate: number;
  tempo_pausa?: number;
  orario_inizio?: string;
  orario_fine?: string;
  note?: string;
  allegato_url?: string;
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
}

export interface RapportinoFormData {
  user_id: string;
  commessa_id: string;
  data_rapportino: string;
  ore_lavorate: string;
  tempo_pausa?: string;
  orario_inizio?: string;
  orario_fine?: string;
  note?: string;
}
