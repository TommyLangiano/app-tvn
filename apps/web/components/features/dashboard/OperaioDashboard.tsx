/**
 * Operaio Dashboard Component
 *
 * Simple dashboard for operaio users showing their own rapportini
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Clock, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

interface RapportinoBasic {
  id: string;
  data_rapportino: string;
  ore_lavorate: number;
  commessa_id: string;
  note?: string;
}

interface DashboardStats {
  oreOggi: number;
  oreSettimana: number;
  oreMese: number;
}

export function OperaioDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [rapportini, setRapportini] = useState<RapportinoBasic[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ oreOggi: 0, oreSettimana: 0, oreMese: 0 });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get user's rapportini
      const { data: rapportiniData } = await supabase
        .from('rapportini')
        .select('id, data_rapportino, ore_lavorate, commessa_id, note')
        .eq('user_id', userId)
        .order('data_rapportino', { ascending: false })
        .limit(10);

      if (rapportiniData) {
        setRapportini(rapportiniData);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date();
        monthStart.setDate(1);

        const oreOggi = rapportiniData
          .filter(r => r.data_rapportino === today)
          .reduce((sum, r) => sum + Number(r.ore_lavorate), 0);

        const oreSettimana = rapportiniData
          .filter(r => new Date(r.data_rapportino) >= weekStart)
          .reduce((sum, r) => sum + Number(r.ore_lavorate), 0);

        const oreMese = rapportiniData
          .filter(r => new Date(r.data_rapportino) >= monthStart)
          .reduce((sum, r) => sum + Number(r.ore_lavorate), 0);

        setStats({ oreOggi, oreSettimana, oreMese });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userId, loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold">Ciao, {userName}! 👋</h1>
        <p className="mt-2 text-blue-100">Benvenuto nella tua dashboard operativa</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ore Oggi</p>
              <p className="text-3xl font-bold mt-2">{stats.oreOggi}h</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ore Settimana</p>
              <p className="text-3xl font-bold mt-2">{stats.oreSettimana}h</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((stats.oreSettimana / 40) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.oreSettimana / 40) * 100)}% di 40h
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ore Mese</p>
              <p className="text-3xl font-bold mt-2">{stats.oreMese}h</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link href="/rapportini/nuovo" className="flex-1">
          <Button className="w-full h-auto py-4 gap-2 border-2">
            <Plus className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Nuovo Rapportino</div>
              <div className="text-xs opacity-80">Registra ore di lavoro</div>
            </div>
          </Button>
        </Link>
      </div>

      {/* Recent Rapportini */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rapportini Recenti</h2>
          <Link href="/rapportini">
            <Button variant="outline" size="sm" className="border-2">
              Vedi Tutti
            </Button>
          </Link>
        </div>

        {rapportini.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun rapportino ancora</p>
            <p className="text-sm mt-1">Inizia registrando le tue ore di lavoro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rapportini.map((rapportino) => (
              <Link
                key={rapportino.id}
                href={`/rapportini/${rapportino.id}`}
                className="block p-4 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    {rapportino.note && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {rapportino.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{rapportino.ore_lavorate}h</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
