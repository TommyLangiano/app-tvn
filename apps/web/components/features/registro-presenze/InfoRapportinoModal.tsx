'use client';

import { useState, useEffect } from 'react';
import { FileText, Edit, Trash2, Save, XCircle, Upload, Trash, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSignedUrl } from '@/lib/utils/storage';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Rapportino } from '@/types/rapportino';

interface User {
  id: string;
  nome?: string;
  cognome?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface Commessa {
  id: string;
  nome_commessa: string;
}

interface InfoRapportinoModalProps {
  rapportino: Rapportino;
  users: User[];
  commesse: Commessa[];
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function InfoRapportinoModal({ rapportino, users, commesse, onClose, onUpdate, onDelete }: InfoRapportinoModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Rapportino>>(rapportino);
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [deleteCurrentFile, setDeleteCurrentFile] = useState(false);

  useEffect(() => {
    if (rapportino.allegato_url) {
      getSignedUrl(rapportino.allegato_url).then(setAllegatoUrl);
    }
  }, [rapportino.allegato_url]);

  // Upload file to Supabase storage
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get tenant_id from user metadata
      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) throw new Error('Tenant ID not found');

      const originalFileName = file.name;
      const filePath = `${tenantId}/${folder}/${rapportino.id}/${originalFileName}`;

      const { data, error } = await supabase.storage
        .from('app-storage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Errore durante l\'upload del file');
      return null;
    }
  };

  // Delete file from Supabase storage
  const deleteFile = async (filePath: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from('app-storage')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Errore durante l\'eliminazione del file');
    }
  };

  const getUserDisplayName = (rapp: Rapportino) => {
    return rapp.user_name || rapp.user_email?.split('@')[0] || 'Utente';
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

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(rapportino);
  };

  const handleCancelEdit = () => {
    setEditedData(rapportino);
    setIsEditing(false);
    setNewFile(null);
    setDeleteCurrentFile(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewFile(e.target.files[0]);
      setDeleteCurrentFile(false);
    }
  };

  const handleDeleteFile = () => {
    setDeleteCurrentFile(true);
    setNewFile(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      let finalAllegatoUrl: string | null | undefined = editedData.allegato_url;

      // Gestione file allegato
      if (deleteCurrentFile && rapportino.allegato_url) {
        await deleteFile(rapportino.allegato_url);
        finalAllegatoUrl = null;
      }

      if (newFile) {
        if (rapportino.allegato_url) {
          await deleteFile(rapportino.allegato_url);
        }
        const uploadedPath = await uploadFile(newFile, 'rapportini-documents');
        finalAllegatoUrl = uploadedPath;
      }

      // Update rapportino
      const { error } = await supabase
        .from('rapportini')
        .update({
          user_id: editedData.user_id,
          dipendente_id: editedData.dipendente_id,
          commessa_id: editedData.commessa_id,
          data_rapportino: editedData.data_rapportino,
          ore_lavorate: editedData.ore_lavorate,
          tempo_pausa: editedData.tempo_pausa || null,
          orario_inizio: editedData.orario_inizio || null,
          orario_fine: editedData.orario_fine || null,
          note: editedData.note || null,
          allegato_url: finalAllegatoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino aggiornato con successo');
      setIsEditing(false);
      setNewFile(null);
      setDeleteCurrentFile(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      toast.error('Errore nel salvataggio del rapportino');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('rapportini')
        .update({
          stato: 'approvato',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino approvato');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Errore nell\'approvazione:', error);
      toast.error('Errore nell\'approvazione del rapportino');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('rapportini')
        .update({
          stato: 'rifiutato',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino rifiutato');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Errore nel rifiuto:', error);
      toast.error('Errore nel rifiuto del rapportino');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header fisso */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="h-6 w-6 text-primary flex-shrink-0" />
              <SheetTitle className="text-2xl font-bold truncate">
                Dettagli Rapportino
              </SheetTitle>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <>
                  {/* Approval buttons - Show only when stato is 'da_approvare' */}
                  {rapportino.stato === 'da_approvare' && (
                    <>
                      <Button
                        onClick={handleReject}
                        variant="outline"
                        size="sm"
                        className="gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={isSaving}
                      >
                        <XCircle className="h-4 w-4" />
                        Rifiuta
                      </Button>
                      <Button
                        onClick={handleApprove}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        disabled={isSaving}
                      >
                        <Check className="h-4 w-4" />
                        Approva
                      </Button>
                    </>
                  )}

                  {/* Regular buttons - Show when not in da_approvare state */}
                  {rapportino.stato !== 'da_approvare' && (
                    <>
                      {onDelete && (
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
                      <Button
                        onClick={handleEdit}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifica
                      </Button>
                    </>
                  )}
                  {/* Close button - Always visible when not editing */}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <XCircle className="h-4 w-4" />
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </Button>
                  {/* Close button - Also visible when editing */}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <div className="space-y-6">
            {/* Dati Rapportino */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dati Rapportino</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Operaio</p>
                  {isEditing ? (
                    <Select
                      value={editedData.user_id || editedData.dipendente_id || ''}
                      onValueChange={(value) => {
                        const user = users.find(u => u.id === value);
                        if (user) {
                          setEditedData({
                            ...editedData,
                            user_id: user.id,
                            dipendente_id: undefined,
                            user_name: user.user_metadata?.full_name || user.email,
                            user_email: user.email
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 border-2 border-border bg-white">
                        <SelectValue placeholder="Seleziona operaio" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.user_metadata?.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <p className="font-semibold">{getUserDisplayName(rapportino)}</p>
                      {rapportino.user_email && (
                        <p className="text-xs text-muted-foreground mt-1">{rapportino.user_email}</p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Data Rapportino</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedData.data_rapportino || ''}
                      onChange={(e) => setEditedData({...editedData, data_rapportino: e.target.value})}
                      className="h-11 border-2 border-border bg-white"
                    />
                  ) : (
                    <p className="font-semibold">{formatDate(rapportino.data_rapportino)}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Commessa</p>
                  {isEditing ? (
                    <Select
                      value={editedData.commessa_id || ''}
                      onValueChange={(value) => setEditedData({...editedData, commessa_id: value})}
                    >
                      <SelectTrigger className="h-11 border-2 border-border bg-white">
                        <SelectValue placeholder="Seleziona commessa" />
                      </SelectTrigger>
                      <SelectContent>
                        {commesse.map((commessa) => (
                          <SelectItem key={commessa.id} value={commessa.id}>
                            {commessa.nome_commessa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-semibold">{rapportino.commesse?.titolo || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ore Lavorate</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.5"
                      value={editedData.ore_lavorate || ''}
                      onChange={(e) => setEditedData({...editedData, ore_lavorate: parseFloat(e.target.value)})}
                      className="h-11 border-2 border-border bg-white"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{rapportino.ore_lavorate}h</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pausa (minuti)</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedData.tempo_pausa || ''}
                      onChange={(e) => setEditedData({...editedData, tempo_pausa: parseInt(e.target.value) || undefined})}
                      className="h-11 border-2 border-border bg-white"
                      placeholder="es. 60"
                    />
                  ) : (
                    <p className="font-semibold">{rapportino.tempo_pausa ? `${rapportino.tempo_pausa} min` : '—'}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Orario</p>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={editedData.orario_inizio || ''}
                        onChange={(e) => setEditedData({...editedData, orario_inizio: e.target.value})}
                        className="h-11 border-2 border-border bg-white"
                        placeholder="Inizio"
                      />
                      <Input
                        type="time"
                        value={editedData.orario_fine || ''}
                        onChange={(e) => setEditedData({...editedData, orario_fine: e.target.value})}
                        className="h-11 border-2 border-border bg-white"
                        placeholder="Fine"
                      />
                    </div>
                  ) : (
                    <p className="font-semibold">
                      {rapportino.orario_inizio || '—'} - {rapportino.orario_fine || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Note</h3>
              {isEditing ? (
                <Textarea
                  value={editedData.note || ''}
                  onChange={(e) => setEditedData({...editedData, note: e.target.value})}
                  className="min-h-[100px] border-2 border-border bg-white"
                  placeholder="Inserisci note..."
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{rapportino.note || 'Nessuna nota'}</p>
                </div>
              )}
            </div>

            {/* Allegato */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Allegato</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {rapportino.allegato_url && !deleteCurrentFile && !newFile && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <a
                        href={allegatoUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-1"
                      >
                        File corrente
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteFile}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                        Rimuovi
                      </Button>
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      onChange={handleFileChange}
                      className="h-11 border-2 border-border bg-white"
                    />
                    {newFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Nuovo file: {newFile.name}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {allegatoUrl ? (
                    <Button
                      onClick={() => window.open(allegatoUrl, '_blank')}
                      variant="outline"
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Visualizza Documento
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun allegato</p>
                  )}
                </div>
              )}
            </div>

            {/* Metadata */}
            {!isEditing && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informazioni Sistema</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  {rapportino.created_at && (
                    <div>
                      <p className="mb-1">Creato il</p>
                      <p className="font-medium text-foreground">{formatDateTime(rapportino.created_at)}</p>
                    </div>
                  )}
                  {rapportino.updated_at && rapportino.updated_at !== rapportino.created_at && (
                    <div>
                      <p className="mb-1">Ultima modifica</p>
                      <p className="font-medium text-foreground">{formatDateTime(rapportino.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
