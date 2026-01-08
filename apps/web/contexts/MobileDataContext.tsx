'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  user_id: string;
}

interface Rapportino {
  id: string;
  data_rapportino: string;
  ore_lavorate: number;
  tempo_pausa?: number;
  orario_inizio?: string;
  orario_fine?: string;
  note: string | null;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  created_at?: string;
  approvato_da?: string;
  approvato_il?: string;
  rifiutato_da?: string;
  rifiutato_il?: string;
  motivo_rifiuto?: string;
  modificato_da?: string;
  modificato_il?: string;
  commesse: {
    nome_commessa: string;
    cliente_commessa: string;
  } | null;
}

interface NotaSpesa {
  id: string;
  data_nota: string;
  importo: number;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  descrizione: string | null;
  numero_nota: string;
  categorie_note_spesa: {
    nome: string;
    colore: string;
  } | null;
  commesse: {
    nome_commessa: string;
  } | null;
  allegati?: any[];
}

interface MobileDataContextType {
  dipendente: Dipendente | null;
  rapportini: Rapportino[];
  noteSpese: NotaSpesa[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const MobileDataContext = createContext<MobileDataContextType | undefined>(undefined);

export function MobileDataProvider({ children }: { children: ReactNode }) {
  const [dipendente, setDipendente] = useState<Dipendente | null>(null);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [noteSpese, setNoteSpese] = useState<NotaSpesa[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get dipendente
      const { data: dipendenteData } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome, user_id')
        .eq('user_id', user.id)
        .single();

      setDipendente(dipendenteData);

      if (!dipendenteData) {
        setLoading(false);
        return;
      }

      // Get all rapportini for current year
      const currentYear = new Date().getFullYear();
      const firstDay = new Date(currentYear, 0, 1);
      const lastDay = new Date(currentYear, 11, 31);

      const { data: rapportiniData } = await supabase
        .from('rapportini')
        .select(`
          id,
          data_rapportino,
          ore_lavorate,
          tempo_pausa,
          orario_inizio,
          orario_fine,
          note,
          stato,
          created_at,
          approvato_da,
          approvato_il,
          rifiutato_da,
          rifiutato_il,
          motivo_rifiuto,
          modificato_da,
          modificato_il,
          commesse!inner (
            nome_commessa,
            cliente_commessa
          )
        `)
        .eq('dipendente_id', dipendenteData.id)
        .gte('data_rapportino', firstDay.toISOString().split('T')[0])
        .lte('data_rapportino', lastDay.toISOString().split('T')[0])
        .order('data_rapportino', { ascending: false });

      // Map data to correct format
      const mappedData: Rapportino[] = (rapportiniData || []).map((item: any) => ({
        ...item,
        commesse: Array.isArray(item.commesse) ? item.commesse[0] : item.commesse,
      }));

      setRapportini(mappedData);

      // Get all note spese for current year
      const { data: noteSpesaData } = await supabase
        .from('note_spesa')
        .select(`
          *,
          categorie_note_spesa!inner (
            nome,
            colore
          ),
          commesse!inner (
            nome_commessa
          )
        `)
        .eq('dipendente_id', dipendenteData.id)
        .gte('data_nota', firstDay.toISOString().split('T')[0])
        .lte('data_nota', lastDay.toISOString().split('T')[0])
        .order('data_nota', { ascending: false });

      // Map note spese data
      const mappedNoteSpese: NotaSpesa[] = (noteSpesaData || []).map((item: any) => ({
        ...item,
        categorie_note_spesa: Array.isArray(item.categorie_note_spesa) ? item.categorie_note_spesa[0] : item.categorie_note_spesa,
        commesse: Array.isArray(item.commesse) ? item.commesse[0] : item.commesse,
      }));

      setNoteSpese(mappedNoteSpese);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    dipendente,
    rapportini,
    noteSpese,
    loading,
    refreshData
  }), [dipendente, rapportini, noteSpese, loading, refreshData]);

  return (
    <MobileDataContext.Provider value={contextValue}>
      {children}
    </MobileDataContext.Provider>
  );
}

export function useMobileData() {
  const context = useContext(MobileDataContext);
  if (context === undefined) {
    throw new Error('useMobileData must be used within a MobileDataProvider');
  }
  return context;
}
