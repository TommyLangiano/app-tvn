'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/lib/utils/storage';
import type { DocumentoDipendente } from '@/types/documento-dipendente';
import { UploadDocumentoSemplice } from './UploadDocumentoSemplice';

interface GestioneDocumentiSectionProps {
  dipendenteId: string;
}

export function GestioneDocumentiSection({ dipendenteId }: GestioneDocumentiSectionProps) {
  const [documenti, setDocumenti] = useState<DocumentoDipendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocumenti();
  }, [dipendenteId]);

  const loadDocumenti = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('documenti_dipendenti')
        .select('*')
        .eq('dipendente_id', dipendenteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumenti(data || []);
    } catch (error) {
      console.error('Error loading documenti:', error);
      toast.error('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documento: DocumentoDipendente) => {
    if (!confirm(`Eliminare il documento "${documento.nome_documento}"?`)) return;

    try {
      setDeletingId(documento.id);
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('app-storage')
        .remove([documento.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue anyway to delete DB record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documenti_dipendenti')
        .delete()
        .eq('id', documento.id);

      if (dbError) throw dbError;

      toast.success('Documento eliminato con successo');
      loadDocumenti();
    } catch (error) {
      console.error('Error deleting documento:', error);
      toast.error('Errore nell\'eliminazione del documento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (documento: DocumentoDipendente) => {
    try {
      const signedUrl = await getSignedUrl(documento.file_path);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error('Impossibile aprire il documento');
      }
    } catch (error) {
      console.error('Error viewing documento:', error);
      toast.error('Errore nell\'apertura del documento');
    }
  };

  const handleDownload = async (documento: DocumentoDipendente) => {
    try {
      const signedUrl = await getSignedUrl(documento.file_path);
      if (signedUrl) {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = documento.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error('Impossibile scaricare il documento');
      }
    } catch (error) {
      console.error('Error downloading documento:', error);
      toast.error('Errore nel download del documento');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Caricamento documenti...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header con pulsante aggiungi */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Documenti Caricati</h3>
            <p className="text-sm text-muted-foreground">
              {documenti.length} {documenti.length === 1 ? 'documento' : 'documenti'}
            </p>
          </div>
          <Button
            onClick={() => setShowNuovoModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Carica Documento
          </Button>
        </div>

        {/* Lista documenti */}
        {documenti.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Nessun documento caricato</p>
            <Button
              onClick={() => setShowNuovoModal(true)}
              variant="outline"
              className="border-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Carica il primo documento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documenti.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border-2 border-border bg-card p-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icona documento */}
                  <div className="flex-shrink-0 p-3 rounded-lg bg-emerald-100">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base truncate mb-2">{doc.nome_documento}</h4>

                    {doc.descrizione && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {doc.descrizione}
                      </p>
                    )}

                    {/* File info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{doc.file_name}</span>
                      <span>•</span>
                      <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleView(doc)}
                      className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                      title="Visualizza"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                      title="Scarica"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="h-9 w-9 flex items-center justify-center bg-surface border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all text-red-600 disabled:opacity-50"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuovo documento */}
      {showNuovoModal && (
        <UploadDocumentoSemplice
          dipendenteId={dipendenteId}
          onClose={() => setShowNuovoModal(false)}
          onSuccess={loadDocumenti}
        />
      )}
    </>
  );
}
