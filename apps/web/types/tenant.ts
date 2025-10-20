export interface TenantProfile {
  tenant_id: string;
  ragione_sociale?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  forma_giuridica?: 'SRL' | 'SPA' | 'SRLS' | 'SNC' | 'SAS' | 'Ditta Individuale' | 'Altro';
  pec?: string;
  email?: string;
  telefono?: string;
  fax?: string;
  website?: string;
  sede_legale_via?: string;
  sede_legale_civico?: string;
  sede_legale_cap?: string;
  sede_legale_citta?: string;
  sede_legale_provincia?: string;
  sede_legale_nazione?: string;
  iban?: string;
  codice_sdi?: string;
  rea?: string;
  ateco?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantProfileFormData {
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale: string;
  forma_giuridica: string;
  pec: string;
  email: string;
  telefono: string;
  fax: string;
  website: string;
  sede_legale_via: string;
  sede_legale_civico: string;
  sede_legale_cap: string;
  sede_legale_citta: string;
  sede_legale_provincia: string;
  sede_legale_nazione: string;
  iban: string;
  codice_sdi: string;
  rea: string;
  ateco: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'operaio';
  full_name?: string;
  created_at: string;
}

export interface CreateUserFormData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'operaio';
}
