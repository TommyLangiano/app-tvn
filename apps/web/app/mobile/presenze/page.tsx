'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, XCircle, Plus } from 'lucide-react';
import Link from 'next/link';

interface Rapportino {
  id: string;
  data_rapportino: string;
  ore_lavorate: number;
  note: string | null;
  stato: 'approvato' | 'richiesto' | 'rifiutato';
  commesse: {
    nome_commessa: string;
    cliente_commessa: string;
  } | null;
}

export default function MobilePresenzePage() {
  const [loading, setLoading] = useState(true);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [filter, setFilter] = useState<'tutti' | 'approvato' | 'richiesto' | 'rifiutato'>('tutti');

  useEffect(() => {
    loadRapportini();
  }, []);

  const loadRapportini = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get dipendente
      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!dipendente) return;

      // Get rapportini
      const { data } = await supabase
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
        .eq('dipendente_id', dipendente.id)
        .order('data_rapportino', { ascending: false })
        .limit(50);

      // Map data to correct format (Supabase returns commesse as array, we need object)
      const mappedData: Rapportino[] = (data || []).map((item: any) => ({
        ...item,
        commesse: Array.isArray(item.commesse) ? item.commesse[0] : item.commesse,
      }));

      setRapportini(mappedData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading rapportini:', error);
      setLoading(false);
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'approvato':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'richiesto':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'rifiutato':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatoBadge = (stato: string) => {
    const styles = {
      approvato: 'bg-green-100 text-green-700 border-green-200',
      richiesto: 'bg-amber-100 text-amber-700 border-amber-200',
      rifiutato: 'bg-red-100 text-red-700 border-red-200',
    };

    const labels = {
      approvato: 'Approvato',
      richiesto: 'In attesa',
      rifiutato: 'Rifiutato',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[stato as keyof typeof styles]}`}>
        {labels[stato as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const filteredRapportini = filter === 'tutti'
    ? rapportini
    : rapportini.filter(r => r.stato === filter);

  const stats = {
    totale: rapportini.length,
    approvati: rapportini.filter(r => r.stato === 'approvato').length,
    richiesti: rapportini.filter(r => r.stato === 'richiesto').length,
    rifiutati: rapportini.filter(r => r.stato === 'rifiutato').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presenze</h1>
          <p className="text-sm text-gray-500 mt-1">Storico dei tuoi rapportini</p>
        </div>
        <Link href="/mobile/presenze/nuovo">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 border-2 border-gray-200">
          <p className="text-xs text-gray-500">Totale</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totale}</p>
        </Card>
        <Card className="p-3 border-2 border-green-200 bg-green-50/50">
          <p className="text-xs text-green-700">Approvati</p>
          <p className="text-2xl font-bold text-green-900">{stats.approvati}</p>
        </Card>
        {stats.richiesti > 0 && (
          <Card className="p-3 border-2 border-amber-200 bg-amber-50/50">
            <p className="text-xs text-amber-700">In attesa</p>
            <p className="text-2xl font-bold text-amber-900">{stats.richiesti}</p>
          </Card>
        )}
        {stats.rifiutati > 0 && (
          <Card className="p-3 border-2 border-red-200 bg-red-50/50">
            <p className="text-xs text-red-700">Rifiutati</p>
            <p className="text-2xl font-bold text-red-900">{stats.rifiutati}</p>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('tutti')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'tutti'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tutti ({stats.totale})
        </button>
        <button
          onClick={() => setFilter('approvato')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'approvato'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Approvati ({stats.approvati})
        </button>
        {stats.richiesti > 0 && (
          <button
            onClick={() => setFilter('richiesto')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'richiesto'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In attesa ({stats.richiesti})
          </button>
        )}
        {stats.rifiutati > 0 && (
          <button
            onClick={() => setFilter('rifiutato')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'rifiutato'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rifiutati ({stats.rifiutati})
          </button>
        )}
      </div>

      {/* Rapportini List */}
      <div className="space-y-3 pb-4">
        {filteredRapportini.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Nessun rapportino trovato</p>
          </Card>
        ) : (
          filteredRapportini.map((rapportino) => (
            <Card key={rapportino.id} className="p-4 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatoIcon(rapportino.stato)}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(rapportino.data_rapportino)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rapportino.commesse?.nome_commessa || 'Commessa non disponibile'}
                    </p>
                  </div>
                </div>
                {getStatoBadge(rapportino.stato)}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-lg font-bold text-gray-900">
                    {rapportino.ore_lavorate}h
                  </span>
                </div>
                {rapportino.note && (
                  <p className="text-xs text-gray-500 max-w-[200px] truncate">
                    {rapportino.note}
                  </p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
