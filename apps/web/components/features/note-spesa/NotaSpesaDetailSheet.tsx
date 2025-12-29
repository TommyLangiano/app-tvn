'use client';

import { useState, useEffect, useRef } from 'react';
import { Receipt, X, Edit, Trash2, Save, XCircle, Check, FileText, Upload, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { getSignedUrl } from '@/lib/utils/storage';
import type { NotaSpesa } from '@/types/nota-spesa';

interface NotaSpesaDetailSheetProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

const CATEGORIE_NOTA_SPESA = [
  'Carburante',
  'Vitto',
  'Alloggio',
  'Trasporti',
  'Materiali',
  'Altro'
];

export function NotaSpesaDetailSheet({ notaSpesa, onClose, onDelete, onUpdate }: NotaSpesaDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<NotaSpesa>>(notaSpesa);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [deleteCurrentFile, setDeleteCurrentFile] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTenantId();
  }, []);

  useEffect(() => {
    setEditedData(notaSpesa);
  }, [notaSpesa]);

  const loadTenantId = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      if (userTenant) {
        setTenantId(userTenant.tenant_id);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDipendenteDisplayName = () => {
    if (notaSpesa.dipendenti) {
      return `${notaSpesa.dipendenti.cognome} ${notaSpesa.dipendenti.nome}`;
    }
    return 'N/A';
  };

  const getCommessaDisplayName = () => {
    if (notaSpesa.commesse) {
      return notaSpesa.commesse.nome_commessa || notaSpesa.commesse.titolo;
    }
    return 'N/A';
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(notaSpesa);
    setNewFile(null);
    setDeleteCurrentFile(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File troppo grande. Massimo 10MB');
        return;
      }

      setNewFile(file);
      setDeleteCurrentFile(false);
    }
  };

  const handleDeleteCurrentFile = () => {
    setDeleteCurrentFile(true);
    setNewFile(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      let allegatoUrl = editedData.allegato_url;

      // Handle file deletion
      if (deleteCurrentFile && notaSpesa.allegato_url) {
        await supabase.storage
          .from('app-storage')
          .remove([notaSpesa.allegato_url]);
        allegatoUrl = null;
      }

      // Handle new file upload
      if (newFile) {
        // Delete old file if exists
        if (notaSpesa.allegato_url) {
          await supabase.storage
            .from('app-storage')
            .remove([notaSpesa.allegato_url]);
        }

        // Upload new file
        const filePath = `${tenantId}/note-spesa/${Date.now()}_${newFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('app-storage')
          .upload(filePath, newFile);

        if (uploadError) {
          throw new Error('Errore caricamento file');
        }

        allegatoUrl = filePath;
      }

      // Update nota spesa
      const { error: updateError } = await supabase
        .from('note_spesa')
        .update({
          data_spesa: editedData.data_spesa || editedData.data_nota,
          importo: editedData.importo,
          categoria: editedData.categoria,
          descrizione: editedData.descrizione,
          allegato_url: allegatoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notaSpesa.id);

      if (updateError) throw updateError;

      toast.success('Nota spesa aggiornata con successo');
      setIsEditing(false);
      setNewFile(null);
      setDeleteCurrentFile(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error updating nota spesa:', error);
      toast.error(error?.message || 'Errore aggiornamento nota spesa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('note_spesa')
        .update({
          stato: 'approvata',
          approvata_da: user.id,
          approvata_il: new Date().toISOString(),
        })
        .eq('id', notaSpesa.id);

      if (error) throw error;

      toast.success('Nota spesa approvata');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error('Errore approvazione');
    }
  };

  const handleReject = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const motivo = prompt('Inserisci il motivo del rifiuto:');
      if (!motivo) return;

      const { error } = await supabase
        .from('note_spesa')
        .update({
          stato: 'rifiutata',
          approvata_da: user.id,
          approvata_il: new Date().toISOString(),
          note_approvazione: motivo,
        })
        .eq('id', notaSpesa.id);

      if (error) throw error;

      toast.success('Nota spesa rifiutata');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error('Errore rifiuto');
    }
  };

  const handleDownloadFile = async () => {
    if (!notaSpesa.allegato_url) return;

    try {
      const url = await getSignedUrl(notaSpesa.allegato_url);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Errore download file');
    }
  };

  const getStatoBadge = (stato: string) => {
    const badges = {
      'in_attesa': { label: 'In Attesa', class: 'bg-yellow-100 text-yellow-700' },
      'da_approvare': { label: 'Da Approvare', class: 'bg-yellow-100 text-yellow-700' },
      'approvata': { label: 'Approvata', class: 'bg-green-100 text-green-700' },
      'rifiutata': { label: 'Rifiutata', class: 'bg-red-100 text-red-700' },
    };
    const badge = badges[stato as keyof typeof badges] || { label: stato, class: 'bg-gray-100 text-gray-700' };
    return (
      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', badge.class)}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-2 border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <SheetTitle className="text-xl font-bold">
              {isEditing ? 'Modifica Nota Spesa' : 'Dettagli Nota Spesa'}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {notaSpesa.numero_nota || `#${notaSpesa.id.substring(0, 8)}`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="border-2"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stato */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Stato:</span>
          {getStatoBadge(notaSpesa.stato)}
        </div>

        {/* Informazioni Base */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Informazioni Generali</h3>

          {/* Dipendente */}
          <div className="grid grid-cols-3 gap-4">
            <span className="text-sm text-muted-foreground">Dipendente:</span>
            <span className="col-span-2 text-sm font-medium">{getDipendenteDisplayName()}</span>
          </div>

          {/* Commessa */}
          <div className="grid grid-cols-3 gap-4">
            <span className="text-sm text-muted-foreground">Commessa:</span>
            <span className="col-span-2 text-sm font-medium">{getCommessaDisplayName()}</span>
          </div>

          {/* Data */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>Data Spesa</Label>
              <Input
                type="date"
                value={editedData.data_spesa || editedData.data_nota}
                onChange={(e) => setEditedData({ ...editedData, data_spesa: e.target.value })}
                className="bg-white border-2"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm text-muted-foreground">Data:</span>
              <span className="col-span-2 text-sm font-medium">
                {formatDate(notaSpesa.data_spesa || notaSpesa.data_nota)}
              </span>
            </div>
          )}

          {/* Categoria */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={editedData.categoria}
                onValueChange={(value) => setEditedData({ ...editedData, categoria: value })}
              >
                <SelectTrigger className="bg-white border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIE_NOTA_SPESA.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <span className="col-span-2 text-sm font-medium">{notaSpesa.categoria}</span>
            </div>
          )}

          {/* Importo */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>Importo</Label>
              <Input
                type="number"
                step="0.01"
                value={editedData.importo}
                onChange={(e) => setEditedData({ ...editedData, importo: parseFloat(e.target.value) })}
                className="bg-white border-2"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm text-muted-foreground">Importo:</span>
              <span className="col-span-2 text-lg font-bold text-emerald-600">
                {formatCurrency(notaSpesa.importo)}
              </span>
            </div>
          )}

          {/* Descrizione */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={editedData.descrizione || ''}
                onChange={(e) => setEditedData({ ...editedData, descrizione: e.target.value })}
                className="bg-white border-2 min-h-[100px]"
              />
            </div>
          ) : (
            notaSpesa.descrizione && (
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-muted-foreground">Descrizione:</span>
                <span className="col-span-2 text-sm">{notaSpesa.descrizione}</span>
              </div>
            )
          )}
        </div>

        {/* Allegato */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Allegato</h3>

          {isEditing ? (
            <div className="space-y-3">
              {/* Current file */}
              {notaSpesa.allegato_url && !deleteCurrentFile && !newFile && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">File corrente</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadFile}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizza
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteCurrentFile}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* New file upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {newFile ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">{newFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(newFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewFile(null)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {deleteCurrentFile || !notaSpesa.allegato_url ? 'Carica file' : 'Sostituisci file'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            notaSpesa.allegato_url ? (
              <Button
                variant="outline"
                onClick={handleDownloadFile}
                className="w-full border-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Visualizza Allegato
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun allegato</p>
            )
          )}
        </div>

        {/* Note Approvazione */}
        {notaSpesa.note_approvazione && (
          <div className="space-y-2 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <h3 className="font-semibold text-sm text-red-900">Motivo Rifiuto:</h3>
            <p className="text-sm text-red-700">{notaSpesa.note_approvazione}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t-2 border-border p-6 space-y-3">
        {isEditing ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex-1 border-2"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        ) : (
          <>
            {/* Admin actions for in_attesa state */}
            {notaSpesa.stato === 'in_attesa' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  className="flex-1 border-2 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rifiuta
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approva
                </Button>
              </div>
            )}

            {/* Edit and Delete for non-approved */}
            {notaSpesa.stato !== 'approvata' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  className="flex-1 border-2"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                {onDelete && (
                  <Button
                    variant="outline"
                    onClick={onDelete}
                    className="flex-1 border-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
