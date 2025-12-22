'use client';

import { useState, useEffect } from 'react';
import { Receipt, Edit, Trash2, FileText, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { getSignedUrl } from '@/lib/utils/storage';
import type { NotaSpesa, NotaSpesaAzione } from '@/types/nota-spesa';
import { EditNotaSpesaModal } from '@/components/features/note-spesa/EditNotaSpesaModal';
import { ApprovazioneNotaSpesaModal } from '@/components/features/note-spesa/ApprovazioneNotaSpesaModal';

interface InfoNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function InfoNotaSpesaModal({ notaSpesa, onClose, onUpdate, onDelete }: InfoNotaSpesaModalProps) {
  const [azioni, setAzioni] = useState<NotaSpesaAzione[]>([]);
  const [allegatoUrls, setAllegatoUrls] = useState<Map<string, string>>(new Map());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovazioneModal, setShowApprovazioneModal] = useState(false);
  const [isApprovatore, setIsApprovatore] = useState(false);

  useEffect(() => {
    loadAzioni();
    loadAllegatiUrls();
    checkApprovatorePermissions();
  }, [notaSpesa.id]);

  const loadAzioni = async () => {
    try {
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
    }
  };

  const loadAllegatiUrls = async () => {
    if (!notaSpesa.allegati || notaSpesa.allegati.length === 0) return;

    const urls = new Map<string, string>();
    for (const allegato of notaSpesa.allegati) {
      const url = await getSignedUrl(allegato.file_path);
      if (url) {
        urls.set(allegato.file_path, url);
      }
    }
    setAllegatoUrls(urls);
  };

  const checkApprovatorePermissions = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userTenants?.role === 'admin') {
        setIsApprovatore(true);
        return;
      }

      // Check if user is approvatore for this commessa
      const { data: dipendenteData } = await supabase
        .from('dipendenti')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!dipendenteData) return;

      const { data: impostazioniData } = await supabase
        .from('commesse_impostazioni_approvazione')
        .select('approvatori')
        .eq('commessa_id', notaSpesa.commessa_id)
        .single();

      if (impostazioniData?.approvatori?.includes(dipendenteData.id)) {
        setIsApprovatore(true);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const getUserDisplayName = () => {
    if (notaSpesa.dipendenti) {
      return `${notaSpesa.dipendenti.nome} ${notaSpesa.dipendenti.cognome}`;
    }
    return 'Utente';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadAllegato = async (allegato: any) => {
    const url = allegatoUrls.get(allegato.file_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = allegato.nome_file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error('Impossibile scaricare il file');
    }
  };

  const getAzioneIcon = (azione: string) => {
    switch (azione) {
      case 'creata':
        return <Receipt className="h-4 w-4 text-blue-500" />;
      case 'modificata':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'sottomessa':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approvata':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rifiutata':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'eliminata':
        return <Trash2 className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAzioneLabel = (azione: string) => {
    switch (azione) {
      case 'creata': return 'Nota spesa creata';
      case 'modificata': return 'Nota spesa modificata';
      case 'sottomessa': return 'Sottomessa per approvazione';
      case 'approvata': return 'Nota spesa approvata';
      case 'rifiutata': return 'Nota spesa rifiutata';
      case 'eliminata': return 'Nota spesa eliminata';
      default: return azione;
    }
  };

  const canEdit = notaSpesa.stato === 'bozza' || notaSpesa.stato === 'da_approvare' || notaSpesa.stato === 'rifiutato';
  const canApprove = isApprovatore && notaSpesa.stato === 'da_approvare';

  return (
    <>
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          {/* Header fisso */}
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Receipt className="h-6 w-6 text-primary flex-shrink-0" />
                <SheetTitle className="text-2xl font-bold truncate">
                  {notaSpesa.numero_nota}
                </SheetTitle>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                  notaSpesa.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                  notaSpesa.stato === 'da_approvare' ? 'bg-yellow-100 text-yellow-700' :
                  notaSpesa.stato === 'rifiutato' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {notaSpesa.stato === 'approvato' ? 'Approvata' :
                   notaSpesa.stato === 'da_approvare' ? 'Da Approvare' :
                   notaSpesa.stato === 'rifiutato' ? 'Rifiutata' :
                   'Bozza'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {canApprove && (
                  <Button
                    onClick={() => setShowApprovazioneModal(true)}
                    variant="default"
                    size="sm"
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approva/Rifiuta
                  </Button>
                )}
                {canEdit && (
                  <Button
                    onClick={() => setShowEditModal(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Modifica
                  </Button>
                )}
                {onDelete && notaSpesa.stato !== 'approvato' && (
                  <Button
                    onClick={() => {
                      onClose();
                      setTimeout(() => onDelete(), 200);
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Contenuto scrollabile */}
          <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
            <div className="space-y-6">
              {/* Informazioni Generali */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informazioni Generali</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dipendente</p>
                    <p className="font-semibold">{getUserDisplayName()}</p>
                    {notaSpesa.dipendenti?.email && (
                      <p className="text-xs text-muted-foreground mt-1">{notaSpesa.dipendenti.email}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Data Nota</p>
                    <p className="font-semibold">{formatDate(notaSpesa.data_nota)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Commessa</p>
                    <p className="font-semibold">{notaSpesa.commesse?.titolo || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Categoria</p>
                    <p className="font-semibold">{notaSpesa.categoria}</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Importo</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(notaSpesa.importo)}</p>
                  </div>
                </div>
              </div>

              {/* Descrizione */}
              {notaSpesa.descrizione && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Descrizione</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{notaSpesa.descrizione}</p>
                  </div>
                </div>
              )}

              {/* Allegati */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Allegati</h3>
                {notaSpesa.allegati && notaSpesa.allegati.length > 0 ? (
                  <div className="space-y-2">
                    {notaSpesa.allegati.map((allegato, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {allegato.nome_file}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(allegato.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDownloadAllegato(allegato)}
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-shrink-0"
                        >
                          <Download className="h-4 w-4" />
                          Scarica
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun allegato</p>
                )}
              </div>

              {/* Cronologia Approvazione */}
              {(notaSpesa.approvato_da || notaSpesa.rifiutato_da) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Cronologia Approvazione</h3>
                  <div className="space-y-3">
                    {notaSpesa.approvato_da && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">
                            Approvata
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {notaSpesa.approvato_il && formatDateTime(notaSpesa.approvato_il)}
                          </p>
                        </div>
                      </div>
                    )}

                    {notaSpesa.rifiutato_da && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">
                            Rifiutata
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            {notaSpesa.rifiutato_il && formatDateTime(notaSpesa.rifiutato_il)}
                          </p>
                          {notaSpesa.motivo_rifiuto && (
                            <div className="mt-2 p-2 bg-white rounded border border-red-200">
                              <p className="text-xs font-medium text-red-900 mb-1">Motivo:</p>
                              <p className="text-sm text-red-800">{notaSpesa.motivo_rifiuto}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline Azioni */}
              {azioni.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Cronologia</h3>
                  <div className="space-y-3">
                    {azioni.map((azione, index) => (
                      <div key={azione.id} className="flex items-start gap-3">
                        <div className="mt-1">{getAzioneIcon(azione.azione)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getAzioneLabel(azione.azione)}</p>
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
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informazioni Sistema</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  {notaSpesa.created_at && (
                    <div>
                      <p className="mb-1">Creato il</p>
                      <p className="font-medium text-foreground">{formatDateTime(notaSpesa.created_at)}</p>
                    </div>
                  )}
                  {notaSpesa.updated_at && notaSpesa.updated_at !== notaSpesa.created_at && (
                    <div>
                      <p className="mb-1">Ultima modifica</p>
                      <p className="font-medium text-foreground">{formatDateTime(notaSpesa.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      {showEditModal && (
        <EditNotaSpesaModal
          notaSpesa={notaSpesa}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
            onClose();
          }}
        />
      )}

      {/* Approvazione Modal */}
      {showApprovazioneModal && (
        <ApprovazioneNotaSpesaModal
          notaSpesa={notaSpesa}
          onClose={() => setShowApprovazioneModal(false)}
          onSuccess={() => {
            setShowApprovazioneModal(false);
            onUpdate();
            onClose();
          }}
        />
      )}
    </>
  );
}
