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
  note: string | null;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  commesse: {
    nome_commessa: string;
    cliente_commessa: string;
  } | null;
}

interface MobileDataContextType {
  dipendente: Dipendente | null;
  rapportini: Rapportino[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const MobileDataContext = createContext<MobileDataContextType | undefined>(undefined);

export function MobileDataProvider({ children }: { children: ReactNode }) {
  const [dipendente, setDipendente] = useState<Dipendente | null>(null);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
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
          note,
          stato,
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
    loading,
    refreshData
  }), [dipendente, rapportini, loading, refreshData]);

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
