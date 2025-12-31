'use client';

import { useMemo, memo, useCallback } from 'react';
import { useMobileData } from '@/contexts/MobileDataContext';
import { Clock, CheckCircle, Calendar, TrendingUp, Bell, MapPin, Building2, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

const NotificationButton = memo(() => (
  <button
    className="relative"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }}
  >
    <Bell className="text-white" style={{ width: '18px', height: '18px' }} strokeWidth={2.5} />
    <div
      style={{
        position: 'absolute',
        top: '0',
        right: '0',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: '#ef4444',
        border: '2px solid white'
      }}
    />
  </button>
));

NotificationButton.displayName = 'NotificationButton';

const UserAvatar = memo(({ nome, cognome }: { nome?: string; cognome?: string }) => (
  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-3 border-white/30 shadow-lg">
    {nome?.[0]}{cognome?.[0]}
  </div>
));

UserAvatar.displayName = 'UserAvatar';

const TimbratureCard = memo(() => {
  const currentDate = useMemo(() =>
    new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    []
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
      <div className="flex gap-5 mb-5">
        <div className="w-28 flex-shrink-0">
          <div className="w-28 h-full rounded-2xl bg-gray-200 flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-20" />
            <MapPin className="w-10 h-10 text-emerald-600 relative z-10" />
            <p className="absolute bottom-2 text-[10px] font-medium text-emerald-700">Mappa</p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[10px] text-gray-500 leading-tight">COM-2024-001</p>
            <p className="text-sm font-bold text-gray-900 leading-tight">Ristrutturazione Villa</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900">08:00</span>
              <span className="text-gray-400">-</span>
              <span className="font-semibold text-gray-900">17:00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">{currentDate}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-900">Rossi Mario S.r.l.</p>
          </div>

          <div>
            <p className="text-xs text-gray-700 leading-tight">
              Via Roma, 45 · 70121 Bari (BA)
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Note</p>
            <p className="text-xs text-gray-600 italic leading-tight">Portare attrezzatura completa</p>
          </div>
        </div>
      </div>

      <button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
        <Clock className="w-4 h-4" />
        TIMBRA INGRESSO
      </button>
    </div>
  );
});

TimbratureCard.displayName = 'TimbratureCard';

const PendingRapportiniCard = memo(({ count }: { count: number }) => (
  <Card className="p-4 border-2 border-amber-100 bg-white">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-amber-100">
        <Calendar className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">Rapportini in attesa</p>
        <p className="text-xl font-bold text-gray-900">{count}</p>
      </div>
      <Link
        href="/mobile/presenze"
        prefetch={true}
        className="text-sm font-medium text-amber-600 hover:text-amber-700"
      >
        Vedi →
      </Link>
    </div>
  </Card>
));

PendingRapportiniCard.displayName = 'PendingRapportiniCard';

export default function MobileHomePage() {
  const { dipendente, rapportini } = useMobileData();

  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const rapportiniMese = rapportini.filter(r => {
      const date = new Date(r.data_rapportino);
      return date >= firstDayOfMonth && date <= lastDayOfMonth;
    });

    const oreMese = rapportiniMese.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0);
    const rapportiniPending = rapportini.filter(r => r.stato === 'da_approvare').length;

    const today = new Date();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);

    const rapportiniSettimana = rapportini.filter(r => {
      const date = new Date(r.data_rapportino);
      return date >= firstDayOfWeek;
    });

    const oreSettimana = rapportiniSettimana.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0);

    return {
      oreMese,
      rapportiniPending,
      oreSettimana,
    };
  }, [rapportini]);

  return (
    <div className="space-y-6">
      <div className="bg-emerald-600 px-6 py-12 text-white">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <UserAvatar nome={dipendente?.nome} cognome={dipendente?.cognome} />
            <div>
              <h1 className="text-xl font-bold">
                Bentornato, {dipendente?.nome}
              </h1>
            </div>
          </div>

          <NotificationButton />
        </div>
      </div>

      <div className="relative z-10" style={{ marginTop: '-60px', paddingLeft: '16px', paddingRight: '16px' }}>
        <TimbratureCard />
      </div>

      <div className="px-4 space-y-6">
        {stats.rapportiniPending > 0 && (
          <PendingRapportiniCard count={stats.rapportiniPending} />
        )}
      </div>
    </div>
  );
}
