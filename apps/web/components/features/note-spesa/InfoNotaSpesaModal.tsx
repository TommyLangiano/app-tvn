'use client';

import { useState, useEffect } from 'react';
import { User, Briefcase, Calendar, Tag, Euro, FileText, Paperclip, Eye, X, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/lib/utils/storage';
import type { NotaSpesa, NotaSpesaAzione } from '@/types/nota-spesa';
import { EditNotaSpesaModal } from '@/components/features/note-spesa/EditNotaSpesaModal';

interface InfoNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function InfoNotaSpesaModal({ notaSpesa, onClose, onUpdate, onDelete }: InfoNotaSpesaModalProps) {
  const [azioni, setAzioni] = useState<NotaSpesaAzione[]>([]);
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAzioni, setLoadingAzioni] = useState(true);

  useEffect(() => {
    loadAzioni();
    loadAllegatoUrl();
  }, [notaSpesa.id]);

  const loadAzioni = async () => {
    try {
      setLoadingAzioni(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('note_spesa_azioni')
        .select(`
          *,
          utente:dipendenti!note_spesa_azioni_eseguita_da_fkey (
            nome,
            cognome,
            email
          )
        `)
        .eq('nota_spesa_id', notaSpesa.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAzioni(data);
      }
    } catch (error) {
      console.error('Error loading azioni:', error);
    } finally {
      setLoadingAzioni(false);
    }
  };

  const loadAllegatoUrl = async () => {
    if (!notaSpesa.allegati || notaSpesa.allegati.length === 0) return;

    // Prendi solo il primo allegato
    const allegato = notaSpesa.allegati[0];
    const url = await getSignedUrl(allegato.file_path);
    if (url) {
      setAllegatoUrl(url);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleOpenAllegato = () => {
    if (allegatoUrl) {
      window.open(allegatoUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatoBadgeClasses = (stato: string) => {
    switch (stato) {
      case 'approvato':
        return 'bg-green-100 text-green-700';
      case 'da_approvare':
        return 'bg-yellow-100 text-yellow-700';
      case 'rifiutato':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatoLabel = (stato: string) => {
    switch (stato) {
      case 'approvato':
        return 'Approvato';
      case 'da_approvare':
        return 'Da Approvare';
      case 'rifiutato':
        return 'Rifiutato';
      case 'bozza':
        return 'Bozza';
      default:
        return stato;
    }
  };

  const getAzioneIcon = (azione: string) => {
    switch (azione) {
      case 'creata':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'modificata':
        return <Edit className="h-5 w-5 text-orange-600" />;
      case 'sottomessa':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approvata':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rifiutata':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'eliminata':
        return <Trash2 className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAzioneLabel = (azione: string) => {
    switch (azione) {
      case 'creata':
        return 'Nota spesa creata';
      case 'modificata':
        return 'Nota spesa modificata';
      case 'sottomessa':
        return 'Sottomessa per approvazione';
      case 'approvata':
        return 'Nota spesa approvata';
      case 'rifiutata':
        return 'Nota spesa rifiutata';
      case 'eliminata':
        return 'Nota spesa eliminata';
      default:
        return azione;
    }
  };

  const categoria = notaSpesa.categorie_note_spesa;

  return (
    <>
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          {/* Header sticky */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
            <SheetTitle className="text-2xl font-bold">
              Nota Spesa {notaSpesa.numero_nota}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {onDelete && notaSpesa.stato !== 'approvato' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onClose();
                    setTimeout(() => onDelete(), 200);
                  }}
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              )}
              {(notaSpesa.stato === 'bozza' || notaSpesa.stato === 'da_approvare' || notaSpesa.stato === 'rifiutato') && (
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                  <Edit className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Contenuto scrollabile */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Info Generali */}
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <h3 className="text-lg font-semibold">Info Generali</h3>
                <div className="space-y-3">
                  {/* Dipendente */}
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Dipendente</p>
                      <p className="text-base font-medium">
                        {notaSpesa.dipendenti
                          ? `${notaSpesa.dipendenti.cognome} ${notaSpesa.dipendenti.nome}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Commessa */}
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Commessa</p>
                      <p className="text-base font-medium">
                        {notaSpesa.commesse?.titolo || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Data */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="text-base font-medium">
                        {formatDate(notaSpesa.data_nota)}
                      </p>
                    </div>
                  </div>

                  {/* Categoria */}
                  {categoria && (
                    <div className="flex items-start gap-3">
                      <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Categoria</p>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-medium bg-primary/10 text-primary">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoria.colore }}
                          />
                          {categoria.nome}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stato */}
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Stato</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium ${getStatoBadgeClasses(
                          notaSpesa.stato
                        )}`}
                      >
                        {getStatoLabel(notaSpesa.stato)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dettagli Economici */}
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <h3 className="text-lg font-semibold">Dettagli Economici</h3>
                <div className="space-y-3">
                  {/* Importo */}
                  <div className="flex items-start gap-3">
                    <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Importo</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(notaSpesa.importo)}
                      </p>
                    </div>
                  </div>

                  {/* Descrizione */}
                  {notaSpesa.descrizione && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Descrizione</p>
                        <p className="text-base font-medium whitespace-pre-wrap">
                          {notaSpesa.descrizione}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Allegato */}
              {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Allegato</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Paperclip className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Nome file</p>
                        <p className="text-base font-medium">
                          {notaSpesa.allegati[0].nome_file}
                        </p>
                      </div>
                    </div>
                    {allegatoUrl && (
                      <Button
                        onClick={handleOpenAllegato}
                        variant="outline"
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Eye className="h-4 w-4" />
                        Visualizza Allegato
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Cronologia Azioni */}
              {azioni.length > 0 && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Cronologia Azioni</h3>
                  {loadingAzioni ? (
                    <p className="text-sm text-muted-foreground">Caricamento...</p>
                  ) : (
                    <div className="space-y-4">
                      {azioni.map((azione) => (
                        <div key={azione.id} className="flex items-start gap-3">
                          {getAzioneIcon(azione.azione)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {getAzioneLabel(azione.azione)}
                            </p>
                            {azione.utente && (
                              <p className="text-xs text-muted-foreground">
                                {azione.utente.nome} {azione.utente.cognome}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(azione.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      {isEditing && (
        <EditNotaSpesaModal
          notaSpesa={notaSpesa}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            onUpdate();
            onClose();
          }}
        />
      )}
    </>
  );
}
