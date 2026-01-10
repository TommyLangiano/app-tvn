'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { FatturaPassiva } from '@/types/fattura';
import type { NotaSpesa } from '@/types/nota-spesa';
import { ConfermaNotaSpesaModal } from '@/components/features/note-spesa/ConfermaNotaSpesaModal';
import { InfoNotaSpesaModal } from '@/components/features/note-spesa/InfoNotaSpesaModal';
import { FatturaDetailSheet } from '@/components/features/fatture/FatturaDetailSheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

interface Commessa {
  id: string;
  nome_commessa: string;
  codice_commessa: string;
  slug: string;
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [fatturePassive, setFatturePassive] = useState<FatturaPassiva[]>([]);
  const [noteSpeseDaApprovare, setNoteSpeseDaApprovare] = useState<NotaSpesa[]>([]);
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [modalTipo, setModalTipo] = useState<'approva' | 'rifiuta' | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedFattura, setSelectedFattura] = useState<FatturaPassiva | null>(null);
  const [isFatturaSheetOpen, setIsFatturaSheetOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();

      // Get tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!userTenants || userTenants.length === 0) return;

      const tid = userTenants[0].tenant_id;
      setTenantId(tid);

      // Load commesse
      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, nome_commessa, codice_commessa, slug')
        .eq('tenant_id', tid)
        .order('nome_commessa', { ascending: true });

      if (commesseData) {
        setCommesse(commesseData);
      }

      // Load fatture passive
      const { data: fattureData } = await supabase
        .from('fatture_passive')
        .select(`
          *,
          commesse (
            id,
            nome_commessa,
            codice_commessa,
            slug
          )
        `)
        .eq('tenant_id', tid)
        .eq('stato_pagamento', 'Non Pagato')
        .order('scadenza_pagamento', { ascending: true });

      if (fattureData) {
        setFatturePassive(fattureData as any);
      }

      // Load note spesa da approvare
      const { data: noteData } = await supabase
        .from('note_spesa')
        .select(`
          *,
          dipendenti (
            id,
            nome,
            cognome,
            email
          ),
          commesse (
            id,
            nome_commessa,
            codice_commessa,
            slug
          ),
          categorie_note_spesa (
            id,
            nome,
            codice,
            colore,
            icona
          )
        `)
        .eq('tenant_id', tid)
        .eq('stato', 'da_approvare')
        .order('data_nota', { ascending: false });

      if (noteData) {
        setNoteSpeseDaApprovare(noteData as any);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleApprova = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('approva');
  };

  const handleRifiuta = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('rifiuta');
  };

  const handleConfirmAzione = async (motivo?: string) => {
    if (!selectedNotaSpesa || !modalTipo) return;

    try {
      const supabase = createClient();
      const nuovoStato = modalTipo === 'approva' ? 'approvato' : 'rifiutato';

      const { error } = await supabase
        .from('note_spesa')
        .update({ stato: nuovoStato })
        .eq('id', selectedNotaSpesa.id);

      if (error) throw error;

      toast.success(
        modalTipo === 'approva'
          ? 'Nota spesa approvata con successo'
          : 'Nota spesa rifiutata'
      );

      setModalTipo(null);
      setSelectedNotaSpesa(null);
      loadData();
    } catch (error) {
      console.error('Error updating nota spesa:', error);
      toast.error('Errore durante l\'operazione');
    }
  };

  const handleOpenDettaglio = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setIsSheetOpen(true);
  };

  const getUserDisplayName = (notaSpesa: NotaSpesa) => {
    const dipendente = notaSpesa.dipendenti;
    if (dipendente) {
      return `${dipendente.nome} ${dipendente.cognome}`;
    }
    return 'N/A';
  };

  // Filtra fatture in scadenza
  const fattureInScadenzaFiltrate = useMemo(() => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const setteGiorniDopo = new Date(oggi);
    setteGiorniDopo.setDate(setteGiorniDopo.getDate() + 7);

    const fattureFiltrate = fatturePassive.filter(f => {
      if (!f.scadenza_pagamento) return false;
      const scadenza = new Date(f.scadenza_pagamento);
      scadenza.setHours(0, 0, 0, 0);
      return scadenza <= setteGiorniDopo;
    });

    return fattureFiltrate.sort((a, b) => {
      const scadenzaA = new Date(a.scadenza_pagamento!);
      const scadenzaB = new Date(b.scadenza_pagamento!);
      scadenzaA.setHours(0, 0, 0, 0);
      scadenzaB.setHours(0, 0, 0, 0);
      return scadenzaA.getTime() - scadenzaB.getTime();
    });
  }, [fatturePassive]);

  // Filtra note spesa da approvare
  const noteFiltrate = useMemo(() => {
    return noteSpeseDaApprovare.sort((a, b) => {
      const dataA = new Date(a.data_nota);
      const dataB = new Date(b.data_nota);
      return dataB.getTime() - dataA.getTime();
    });
  }, [noteSpeseDaApprovare]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Fatture in Scadenza */}
      <div className="rounded-xl border-2 border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Fatture in Scadenza</h3>
          <Link
            href="/fatture?tab=passive&stato=Non%20Pagato&sort=scadenza_asc"
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Visualizza tutto
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {fattureInScadenzaFiltrate.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna fattura in scadenza
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-border">
                <th className="px-4 py-6 text-left text-sm font-semibold">N. Fattura</th>
                <th className="px-4 py-6 text-left text-sm font-semibold">Fornitore</th>
                <th className="px-4 py-6 text-left text-sm font-semibold">Commessa</th>
                <th className="px-4 py-6 text-right text-sm font-semibold">Importo</th>
                <th className="px-4 py-6 text-right text-sm font-semibold">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {fattureInScadenzaFiltrate.map((fattura) => {
                const scadenza = new Date(fattura.scadenza_pagamento!);
                scadenza.setHours(0, 0, 0, 0);
                const oggi = new Date();
                oggi.setHours(0, 0, 0, 0);
                const giorniMancanti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <tr
                    key={fattura.id}
                    onClick={() => {
                      setSelectedFattura(fattura);
                      setIsFatturaSheetOpen(true);
                    }}
                    className="border-b border-border last:border-0 hover:bg-green-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{fattura.numero_fattura}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fattura.fornitore}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {fattura.commesse ? (
                        <span>{fattura.commesse.nome_commessa}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      {formatCurrency(fattura.importo_totale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-muted-foreground mb-1">
                        {format(scadenza, 'd MMM yyyy', { locale: it })}
                      </div>
                      <div className={`text-xs font-medium ${
                        giorniMancanti < 0
                          ? 'text-red-600'
                          : giorniMancanti === 0
                          ? 'text-red-600'
                          : giorniMancanti === 1
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`}>
                        {giorniMancanti < 0
                          ? `Scaduta da ${Math.abs(giorniMancanti)} giorni`
                          : giorniMancanti === 0
                          ? 'Scade oggi'
                          : giorniMancanti === 1
                          ? 'Scade domani'
                          : `Scade tra ${giorniMancanti} giorni`}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Card Note Spesa da Approvare */}
      <div className="rounded-xl border-2 border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Note Spesa da Approvare</h3>
          <Link
            href="/note-spesa?stato=da_approvare"
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Visualizza tutto
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {noteFiltrate.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna nota spesa da approvare
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-border">
                <th className="px-4 py-6 text-left text-sm font-semibold">Dipendente</th>
                <th className="px-4 py-6 text-left text-sm font-semibold">Commessa</th>
                <th className="px-4 py-6 text-left text-sm font-semibold">Descrizione</th>
                <th className="px-4 py-6 text-right text-sm font-semibold">Importo</th>
                <th className="px-4 py-6 text-right text-sm font-semibold">Data</th>
                <th className="px-4 py-6 text-center text-sm font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {noteFiltrate.map((nota) => {
                const dataNota = new Date(nota.data_nota);

                return (
                  <tr
                    key={nota.id}
                    onClick={() => handleOpenDettaglio(nota)}
                    className="border-b border-border last:border-0 hover:bg-green-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {getUserDisplayName(nota)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {nota.commesse ? (
                        <span>{nota.commesse.nome_commessa}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {nota.descrizione}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      {formatCurrency(nota.importo)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-muted-foreground">
                        {format(dataNota, 'd MMM yyyy', { locale: it })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprova(nota);
                          }}
                          className="inline-flex items-center justify-center bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-400 rounded-md p-2.5 transition-all group"
                          title="Approva"
                        >
                          <CheckCircle className="h-5 w-5 text-green-600 group-hover:text-green-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRifiuta(nota);
                          }}
                          className="inline-flex items-center justify-center bg-red-50 border-2 border-red-300 hover:bg-red-100 hover:border-red-400 rounded-md p-2.5 transition-all group"
                          title="Rifiuta"
                        >
                          <XCircle className="h-5 w-5 text-red-600 group-hover:text-red-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modali */}
      {selectedNotaSpesa && modalTipo && (
        <ConfermaNotaSpesaModal
          onClose={() => {
            setModalTipo(null);
            setSelectedNotaSpesa(null);
          }}
          onConfirm={handleConfirmAzione}
          tipo={modalTipo}
          notaSpesa={selectedNotaSpesa}
        />
      )}

      {selectedNotaSpesa && isSheetOpen && (
        <InfoNotaSpesaModal
          isOpen={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) setSelectedNotaSpesa(null);
          }}
          onUpdate={loadData}
          notaSpesa={selectedNotaSpesa}
        />
      )}

      {selectedFattura && isFatturaSheetOpen && (
        <Sheet open={isFatturaSheetOpen} onOpenChange={(open) => {
          setIsFatturaSheetOpen(open);
          if (!open) setSelectedFattura(null);
        }}>
          <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" hideClose={true}>
            <FatturaDetailSheet
              fattura={selectedFattura}
              onClose={() => {
                setIsFatturaSheetOpen(false);
                setSelectedFattura(null);
              }}
              onUpdate={loadData}
              onDelete={async () => {
                const supabase = createClient();
                try {
                  // Elimina allegato se presente
                  if (selectedFattura.allegato_url) {
                    await supabase.storage
                      .from('app-storage')
                      .remove([selectedFattura.allegato_url]);
                  }

                  // Elimina fattura
                  const { error } = await supabase
                    .from('fatture_passive')
                    .delete()
                    .eq('id', selectedFattura.id);

                  if (error) throw error;

                  toast.success('Fattura eliminata con successo');
                  setIsFatturaSheetOpen(false);
                  setSelectedFattura(null);
                  loadData();
                } catch (error) {
                  console.error('Error deleting fattura:', error);
                  toast.error('Errore durante l\'eliminazione della fattura');
                }
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
