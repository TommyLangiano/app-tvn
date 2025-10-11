'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, FileText, Clock, User, Briefcase, Calendar } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { NuovoRapportinoModal } from '@/components/features/rapportini/NuovoRapportinoModal';
import type { Rapportino } from '@/types/rapportino';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export default function RapportiniPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuovoModal, setShowNuovoModal] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    loadRapportini();
  }, [currentMonth, currentYear]);

  const loadRapportini = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's tenant
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Get first and last day of current month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);

      const { data, error } = await supabase
        .from('rapportini')
        .select(`
          *,
          commessa:commesse(titolo, slug)
        `)
        .eq('tenant_id', userTenants.tenant_id)
        .gte('data_rapportino', firstDay.toISOString().split('T')[0])
        .lte('data_rapportino', lastDay.toISOString().split('T')[0])
        .order('data_rapportino', { ascending: false });

      if (error) throw error;

      // Fetch user details for each rapportino
      const rapportiniWithUsers = await Promise.all(
        (data || []).map(async (r) => {
          const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
          return {
            ...r,
            user: userData?.user
          };
        })
      );

      setRapportini(rapportiniWithUsers);
    } catch (error) {
      console.error('Error loading rapportini:', error);
      toast.error('Errore nel caricamento dei rapportini');
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days
  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days = [];

    // Add empty days for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Get rapportini for a specific day
  const getRapportiniForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return rapportini.filter(r => r.data_rapportino === dateStr);
  };

  const getUserDisplayName = (rapportino: Rapportino) => {
    if (!rapportino.user) return 'Utente';
    const metadata = rapportino.user.user_metadata;
    return metadata?.full_name || rapportino.user.email?.split('@')[0] || 'Utente';
  };

  const calendarDays = getCalendarDays();
  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() &&
           currentMonth === today.getMonth() &&
           currentYear === today.getFullYear();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb pageName="Rapportini" />

      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {MESI[currentMonth]} {currentYear}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Oggi
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowNuovoModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Rapportino
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b-2 border-border">
          {GIORNI_SETTIMANA.map((giorno) => (
            <div
              key={giorno}
              className="p-3 text-center text-sm font-semibold text-muted-foreground border-r border-border last:border-r-0"
            >
              {giorno}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayRapportini = day ? getRapportiniForDay(day) : [];
            const totalOre = dayRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-border last:border-r-0 p-2 ${
                  !day ? 'bg-muted/30' : ''
                } ${isToday(day) ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-semibold mb-2 ${
                      isToday(day) ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}>
                      {day}
                    </div>

                    {/* Rapportini for this day */}
                    <div className="space-y-1">
                      {dayRapportini.map((rapportino) => (
                        <div
                          key={rapportino.id}
                          className="text-xs bg-background rounded p-1.5 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          title={`${getUserDisplayName(rapportino)} - ${rapportino.commessa?.titolo}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium">
                              {getUserDisplayName(rapportino)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{rapportino.ore_lavorate}h</span>
                          </div>
                        </div>
                      ))}

                      {dayRapportini.length > 0 && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 pt-1 border-t border-border">
                          Tot: {totalOre}h
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista rapportini del mese */}
      <div className="rounded-xl border-2 border-border bg-card">
        <div className="p-6 border-b-2 border-border">
          <h2 className="text-xl font-bold">Tutti i Rapportini del Mese</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {rapportini.length} rapportini trovati
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Caricamento...
          </div>
        ) : rapportini.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nessun rapportino per questo mese
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rapportini.map((rapportino) => (
              <div
                key={rapportino.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {getUserDisplayName(rapportino)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-sm">{rapportino.commessa?.titolo}</span>
                      </div>

                      <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-4 w-4" />
                        <span>{rapportino.ore_lavorate} ore</span>
                      </div>
                    </div>

                    {rapportino.note && (
                      <p className="text-sm text-muted-foreground pl-6">
                        {rapportino.note}
                      </p>
                    )}

                    {rapportino.allegato_url && (
                      <div className="flex items-center gap-2 pl-6">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary">Allegato presente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuovo rapportino */}
      {showNuovoModal && (
        <NuovoRapportinoModal
          onClose={() => setShowNuovoModal(false)}
          onSuccess={() => {
            setShowNuovoModal(false);
            loadRapportini();
          }}
        />
      )}
    </div>
  );
}
