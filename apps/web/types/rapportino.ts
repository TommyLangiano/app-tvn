export interface Rapportino {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  commessa_id: string;
  data_rapportino: string;
  ore_lavorate: number;
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
}

export interface RapportinoFormData {
  user_id: string;
  commessa_id: string;
  data_rapportino: string;
  ore_lavorate: string;
  note?: string;
}
