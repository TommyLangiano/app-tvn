'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Edit, Archive, Trash2, ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Commessa } from '@/types/commessa';
import type { RiepilogoEconomico, FatturaAttiva, FatturaPassiva, Scontrino } from '@/types/fattura';
import { EconomiaRiepilogo } from '@/components/features/commesse/EconomiaRiepilogo';
import { FatturaAttivaForm } from '@/components/features/commesse/FatturaAttivaForm';
import { CostoForm } from '@/components/features/commesse/CostoForm';
import { DeleteCommessaModal } from '@/components/features/commesse/DeleteCommessaModal';
import { ArchiveCommessaModal } from '@/components/features/commesse/ArchiveCommessaModal';

export default function CommessaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;

  const [loading, setLoading] = useState(true);
  const [commessa, setCommessa] = useState<Commessa | null>(null);
  const [riepilogo, setRiepilogo] = useState<RiepilogoEconomico | null>(null);
  const [fatture, setFatture] = useState<FatturaAttiva[]>([]);
  const [fatturePassive, setFatturePassive] = useState<FatturaPassiva[]>([]);
  const [scontrini, setScontrini] = useState<Scontrino[]>([]);
  const [showFatturaForm, setShowFatturaForm] = useState(false);
  const [showCostoForm, setShowCostoForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    loadCommessaData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadCommessaData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      if (!slug) {
        setLoading(false);
        return;
      }

      // Load commessa by slug
      const { data: commessaData, error: commessaError } = await supabase
        .from('commesse')
        .select('*')
        .eq('slug', slug)
        .single();

      if (commessaError) throw commessaError;
      setCommessa(commessaData);

      // Load riepilogo economico
      const { data: riepilogoData } = await supabase
        .from('riepilogo_economico_commessa')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .single();

      setRiepilogo(riepilogoData || {
        commessa_id: commessaData.id,
        ricavi_imponibile: 0,
        ricavi_iva: 0,
        ricavi_totali: 0,
        costi_imponibile: 0,
        costi_iva: 0,
        costi_totali: 0,
        margine_lordo: 0,
        saldo_iva: 0,
        totale_movimenti: 0,
        numero_ricavi: 0,
        numero_costi: 0,
      });

      // Load fatture attive (ricavi)
      const { data: fattureData, error: fattureError } = await supabase
        .from('fatture_attive')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .order('data_emissione', { ascending: false });

      if (fattureError) throw fattureError;
      setFatture(fattureData || []);

      // Load fatture passive (costi - fatture)
      const { data: fatturePassiveData } = await supabase
        .from('fatture_passive')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .order('data_emissione', { ascending: false });

      setFatturePassive(fatturePassiveData || []);

      // Load scontrini (costi - scontrini)
      const { data: scontriniData } = await supabase
        .from('scontrini')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .order('data_emissione', { ascending: false });

      setScontrini(scontriniData || []);

    } catch {

      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowFatturaForm(false);
    setShowCostoForm(false);
    loadCommessaData(); // Reload data
  };

  const handleDeleteCommessa = async () => {
    try {
      const supabase = createClient();

      if (!commessa) return;

      const { error } = await supabase
        .from('commesse')
        .delete()
        .eq('id', commessa.id);

      if (error) throw error;

      toast.success('Commessa eliminata con successo');
      router.push('/commesse');
    } catch {

      toast.error('Errore durante l\'eliminazione della commessa');
    }
  };

  const handleArchiveCommessa = async () => {
    // TODO: Implementare la logica di archiviazione
    // Per ora mostriamo solo un messaggio
    toast.info('Funzionalità di archiviazione in sviluppo');
    setShowArchiveModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!commessa) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Commessa non trovata</p>
        <Button onClick={() => router.push('/commesse')}>Torna alle commesse</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {/* Back Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-auto w-auto border-2 border-border rounded-xl px-4 sm:px-6 py-3 sm:py-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex-1">
          <Breadcrumb pageName={commessa.nome_commessa} />
        </div>
      </div>

      {/* Card Riepilogo Commessa */}
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Info Principali - Sinistra */}
          <div className="flex-1">
            {/* Codice - Nome - Indirizzo sulla stessa riga */}
            <div className="flex flex-wrap items-center gap-2">
              {commessa.codice_commessa && (
                <>
                  <span className="text-xl sm:text-2xl font-bold">
                    {commessa.codice_commessa}
                  </span>
                  <span className="text-muted-foreground">-</span>
                </>
              )}
              <h2 className="text-xl sm:text-2xl font-bold">{commessa.nome_commessa}</h2>

              {/* Indirizzo */}
              {(commessa.via || commessa.citta || commessa.provincia || commessa.cap) && (
                <>
                  <span className="text-muted-foreground">-</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <span className="break-words">
                        {[
                          commessa.via && `${commessa.via}${commessa.numero_civico ? ' ' + commessa.numero_civico : ''}`,
                          commessa.cap && commessa.citta ? `${commessa.cap} ${commessa.citta}` : commessa.citta,
                          commessa.provincia
                        ].filter(Boolean).join(', ')}
                      </span>
                      {commessa.citta && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([
                            commessa.via && `${commessa.via}${commessa.numero_civico ? ' ' + commessa.numero_civico : ''}`,
                            commessa.cap && commessa.citta ? `${commessa.cap} ${commessa.citta}` : commessa.citta,
                            commessa.provincia
                          ].filter(Boolean).join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date e Azioni - Destra */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date con freccia */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {commessa.data_inizio
                  ? new Date(commessa.data_inizio).toLocaleDateString('it-IT')
                  : '-'
                }
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {commessa.data_fine_prevista
                  ? new Date(commessa.data_fine_prevista).toLocaleDateString('it-IT')
                  : '-'
                }
              </span>
            </div>

            {/* Pulsanti Azioni */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push(`/commesse/${slug}/modifica`)}
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-2 sm:px-3 shrink-0"
              >
                <Edit className="h-3 w-3" />
                <span className="text-xs">Modifica</span>
              </Button>
              <Button
                onClick={() => setShowArchiveModal(true)}
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 px-2 sm:px-3 shrink-0"
              >
                <Archive className="h-3 w-3" />
                <span className="text-xs">Archivia</span>
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-2 border-red-600 text-red-600 hover:bg-red-50 px-2 sm:px-3 shrink-0"
              >
                <Trash2 className="h-3 w-3" />
                <span className="text-xs">Elimina</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Dettagli Commessa - Griglia su tutta la riga */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className={`grid gap-x-6 gap-y-3 text-sm ${
            commessa.tipologia_cliente === 'Pubblico'
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {/* Cliente */}
            <div>
              <p className="text-muted-foreground mb-1">Cliente</p>
              <p className="font-medium">{commessa.cliente_commessa || '—'}</p>
            </div>

            {/* Tipologia Cliente */}
            <div>
              <p className="text-muted-foreground mb-1">Tipologia Cliente</p>
              <p className="font-medium capitalize">{commessa.tipologia_cliente || '—'}</p>
            </div>

            {/* Tipologia Commessa */}
            <div>
              <p className="text-muted-foreground mb-1">Tipologia Commessa</p>
              <p className="font-medium capitalize">{commessa.tipologia_commessa || '—'}</p>
            </div>

            {/* Importo Commessa */}
            <div>
              <p className="text-muted-foreground mb-1">Importo Commessa</p>
              <p className="font-medium">
                {commessa.importo_commessa
                  ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(commessa.importo_commessa)
                  : '—'
                }
              </p>
            </div>

            {/* CIG e CUP - Solo per cliente pubblico */}
            {commessa.tipologia_cliente === 'Pubblico' && (
              <>
                <div>
                  <p className="text-muted-foreground mb-1">CIG</p>
                  <p className="font-medium font-mono text-xs">{commessa.cig || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">CUP</p>
                  <p className="font-medium font-mono text-xs">{commessa.cup || '—'}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Descrizione - Card espandibile */}
        {commessa.descrizione && (
          <div className="mt-4">
            <div className="rounded-lg border-2 border-border bg-background">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="w-full flex items-center justify-between px-4 py-2 text-left"
              >
                <span className="font-medium text-sm">Descrizione</span>
                <div className="p-1 hover:bg-muted/50 rounded transition-colors">
                  {showDescription ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              {showDescription && (
                <div className="px-4 pb-3 pt-1">
                  <p className="text-sm text-foreground break-words">{commessa.descrizione}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Riepilogo Economico */}
      <EconomiaRiepilogo
        riepilogo={riepilogo}
        fatture={fatture}
        fatturePassive={fatturePassive}
        scontrini={scontrini}
        onNuovoRicavo={() => setShowFatturaForm(true)}
        onNuovoCosto={() => setShowCostoForm(true)}
        onVisualizzaTutto={() => router.push(`/commesse/${slug}/movimenti`)}
      />

      {/* Form Modal Fattura Attiva */}
      {showFatturaForm && commessa && (
        <FatturaAttivaForm
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          clientePrecompilato={commessa.cliente_commessa}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowFatturaForm(false)}
        />
      )}

      {/* Form Modal Costo */}
      {showCostoForm && commessa && (
        <CostoForm
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowCostoForm(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && commessa && (
        <DeleteCommessaModal
          commessaNome={commessa.nome_commessa}
          onConfirm={handleDeleteCommessa}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && commessa && (
        <ArchiveCommessaModal
          commessaNome={commessa.nome_commessa}
          onConfirm={handleArchiveCommessa}
          onCancel={() => setShowArchiveModal(false)}
        />
      )}
    </div>
  );
}
