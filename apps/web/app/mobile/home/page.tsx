'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function MobileHomePage() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    nome: string;
    cognome: string;
    avatar_url: string | null;
  } | null>(null);
  const [stats, setStats] = useState({
    oreMese: 0,
    rapportiniPending: 0,
    oreSettimana: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get dipendente data
      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('nome, cognome, avatar_url, id')
        .eq('user_id', user.id)
        .single();

      if (dipendente) {
        setUserData(dipendente);

        // Get stats for current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Ore totali del mese
        const { data: rapportiniMese } = await supabase
          .from('rapportini')
          .select('ore_lavorate')
          .eq('dipendente_id', dipendente.id)
          .gte('data_rapportino', firstDayOfMonth.toISOString().split('T')[0])
          .lte('data_rapportino', lastDayOfMonth.toISOString().split('T')[0]);

        const oreMese = rapportiniMese?.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0) || 0;

        // Rapportini in attesa di approvazione
        const { data: rapportiniPending } = await supabase
          .from('rapportini')
          .select('id')
          .eq('dipendente_id', dipendente.id)
          .eq('stato', 'richiesto');

        // Ore settimana corrente
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lunedì

        const { data: rapportiniSettimana } = await supabase
          .from('rapportini')
          .select('ore_lavorate')
          .eq('dipendente_id', dipendente.id)
          .gte('data_rapportino', firstDayOfWeek.toISOString().split('T')[0]);

        const oreSettimana = rapportiniSettimana?.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0) || 0;

        setStats({
          oreMese,
          rapportiniPending: rapportiniPending?.length || 0,
          oreSettimana,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          {userData?.avatar_url ? (
            <img
              src={userData.avatar_url}
              alt="Avatar"
              className="w-16 h-16 rounded-full border-2 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {userData?.nome?.[0]}{userData?.cognome?.[0]}
            </div>
          )}
          <div>
            <p className="text-sm text-emerald-100">Benvenuto,</p>
            <h1 className="text-2xl font-bold">
              {userData?.nome} {userData?.cognome}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Ore Settimana */}
        <Card className="p-4 border-2 border-emerald-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Questa settimana</p>
              <p className="text-2xl font-bold text-gray-900">{stats.oreSettimana}h</p>
            </div>
          </div>
        </Card>

        {/* Ore Mese */}
        <Card className="p-4 border-2 border-blue-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Questo mese</p>
              <p className="text-2xl font-bold text-gray-900">{stats.oreMese}h</p>
            </div>
          </div>
        </Card>

        {/* Rapportini Pending */}
        {stats.rapportiniPending > 0 && (
          <Card className="p-4 border-2 border-amber-100 bg-white col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Rapportini in attesa</p>
                <p className="text-xl font-bold text-gray-900">{stats.rapportiniPending}</p>
              </div>
              <Link
                href="/mobile/presenze"
                className="text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                Vedi →
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Azioni Rapide</h2>

        <Link href="/mobile/rapportini">
          <Card className="p-4 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-100">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Inserisci Ore</p>
                  <p className="text-sm text-gray-500">Registra le tue ore di lavoro</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Card>
        </Link>

        <Link href="/mobile/presenze">
          <Card className="p-4 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Storico Presenze</p>
                  <p className="text-sm text-gray-500">Visualizza i tuoi rapportini</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
