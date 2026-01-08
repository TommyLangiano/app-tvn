'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Calendar, Euro, FileText, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CategoriaNotaSpesa } from '@/types/nota-spesa';
import { useRouter } from 'next/navigation';
import { useMobileData } from '@/contexts/MobileDataContext';

interface FileWithPreview {
  file: File;
  preview: string;
}

const initialFormData = {
  data_nota: new Date().toISOString().split('T')[0],
  categoria: '',
  importo: '',
  descrizione: '',
};

export default function NuovaNotaSpesaPage() {
  const router = useRouter();
  const { dipendente, refreshData } = useMobileData();

  // Form data
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dropdown data
  const [categorie, setCategorie] = useState<CategoriaNotaSpesa[]>([]);
  const [commesse, setCommesse] = useState<Array<{id: string; nome_commessa: string; codice_commessa?: string}>>([]);
  const [selectedCommessaId, setSelectedCommessaId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategorie();
    loadCommesse();
  }, []);

  const loadCategorie = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      const { data: categorieData } = await supabase
        .from('categorie_note_spesa')
        .select('*')
        .eq('tenant_id', userTenants.tenant_id)
        .eq('attiva', true)
        .order('ordinamento');

      if (categorieData) {
        setCategorie(categorieData);
      }
    } catch (error) {
      console.error('Error loading categorie:', error);
    }
  };

  const loadCommesse = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Carica solo le commesse del team del dipendente
      if (dipendente?.id) {
        const { data: commesseTeam } = await supabase
          .from('commesse_team')
          .select(`
            commessa_id,
            commesse!commesse_team_commessa_id_fkey (
              id,
              nome_commessa,
              codice_commessa
            )
          `)
          .eq('dipendente_id', dipendente.id)
          .eq('tenant_id', userTenants.tenant_id);

        if (commesseTeam) {
          const commesseList = commesseTeam
            .filter((ct: any) => ct.commesse)
            .map((ct: any) => ({
              id: ct.commesse.id,
              nome_commessa: ct.commesse.nome_commessa,
              codice_commessa: ct.commesse.codice_commessa,
            }));
          setCommesse(commesseList);
        }
      }
    } catch (error) {
      console.error('Error loading commesse:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files).slice(0, 1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files).slice(0, 1));
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} è troppo grande. Massimo 10MB per file`);
      return;
    }

    // Clean up previous file if exists
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview });
  };

  const removeFile = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
      setSelectedFile(null);
    }
  };

  const formatCurrencyInput = (value: string): string => {
    let cleaned = value.replace(/[^\d,\.]/g, '');
    cleaned = cleaned.replace(',', '.');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleImportoChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData({ ...formData, importo: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dipendente?.id) {
      toast.error('Dati dipendente non disponibili');
      return;
    }

    // Validazione
    if (!selectedCommessaId) {
      toast.error('Seleziona una commessa');
      return;
    }

    if (!formData.categoria || !formData.importo || !formData.data_nota) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const importoNum = parseFloat(formData.importo);
    if (isNaN(importoNum) || importoNum <= 0) {
      toast.error('Importo non valido');
      return;
    }

    // Verifica categoria richiede allegato
    const categoriaSelezionata = categorie.find(c => c.id === formData.categoria);
    if (categoriaSelezionata?.richiede_allegato && !selectedFile) {
      toast.error(`La categoria "${categoriaSelezionata.nome}" richiede un allegato`);
      return;
    }

    // Verifica importo massimo categoria
    if (categoriaSelezionata?.importo_massimo && importoNum > categoriaSelezionata.importo_massimo) {
      toast.error(`L'importo massimo per la categoria "${categoriaSelezionata.nome}" è ${categoriaSelezionata.importo_massimo}€`);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) throw new Error('No tenant found');

      // Upload allegato
      const allegati = [];
      if (selectedFile) {
        const filePath = `${userTenants.tenant_id}/note-spesa/${selectedCommessaId}/${Date.now()}_${selectedFile.file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('app-storage')
          .upload(filePath, selectedFile.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Errore upload ${selectedFile.file.name}`);
        }

        allegati.push({
          nome_file: selectedFile.file.name,
          file_path: filePath,
          file_size: selectedFile.file.size,
          mime_type: selectedFile.file.type,
        });
      }

      // Verifica se la commessa ha approvazione note spesa abilitata
      const { data: impostazioniApprovazione } = await supabase
        .from('commesse_impostazioni_approvazione')
        .select('abilitato')
        .eq('commessa_id', selectedCommessaId)
        .eq('tipo_approvazione', 'note_spesa')
        .single();

      const statoIniziale = impostazioniApprovazione?.abilitato ? 'da_approvare' : 'approvato';

      // Insert nota spesa
      const { data: notaSpesaData, error: insertError } = await supabase
        .from('note_spesa')
        .insert({
          tenant_id: userTenants.tenant_id,
          commessa_id: selectedCommessaId,
          dipendente_id: dipendente.id,
          data_nota: formData.data_nota,
          importo: importoNum,
          categoria: formData.categoria,
          descrizione: formData.descrizione || null,
          allegati: allegati,
          stato: statoIniziale,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create azione log
      await supabase
        .from('note_spesa_azioni')
        .insert({
          nota_spesa_id: notaSpesaData.id,
          tenant_id: userTenants.tenant_id,
          azione: 'creata',
          eseguita_da: user.id,
          stato_nuovo: statoIniziale,
        });

      if (statoIniziale === 'approvato') {
        toast.success('Nota spesa creata e approvata automaticamente');
      } else {
        toast.success('Nota spesa inviata in attesa di approvazione');
      }

      // Refresh data before navigating
      await refreshData();
      router.push('/mobile/richieste/note-spesa');
    } catch (error: any) {
      console.error('Error creating nota spesa:', error);
      toast.error(error?.message || 'Errore nella creazione della nota spesa');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (selectedFile) {
        URL.revokeObjectURL(selectedFile.preview);
      }
    };
  }, [selectedFile]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header verde */}
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mobile/richieste/note-spesa" prefetch={true}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <ArrowLeft className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Nuova Nota Spesa</h1>
        </div>
      </div>

      {/* Form container */}
      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Commessa */}
            <div className="space-y-2">
              <Label htmlFor="commessa" className="text-sm font-semibold text-gray-900">
                Commessa <span className="text-red-600">*</span>
              </Label>
              <Select value={selectedCommessaId} onValueChange={setSelectedCommessaId}>
                <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
                  <SelectValue placeholder="Seleziona commessa..." />
                </SelectTrigger>
                <SelectContent>
                  {commesse.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-gray-500">
                      Nessuna commessa assegnata
                    </div>
                  ) : (
                    commesse.map((commessa) => (
                      <SelectItem key={commessa.id} value={commessa.id}>
                        {commessa.codice_commessa ? `${commessa.codice_commessa} - ` : ''}
                        {commessa.nome_commessa}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Categoria */}
            <div className="grid grid-cols-2 gap-4">
              {/* Data Nota */}
              <div className="space-y-2">
                <Label htmlFor="data_nota" className="text-sm font-semibold text-gray-900">
                  Data <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    id="data_nota"
                    type="date"
                    value={formData.data_nota}
                    onChange={(e) => setFormData({ ...formData, data_nota: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10"
                    required
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-sm font-semibold text-gray-900">
                  Categoria <span className="text-red-600">*</span>
                </Label>
                <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorie.map(categoria => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoria.colore }}
                          />
                          <span className="text-sm">{categoria.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Importo */}
            <div className="space-y-2">
              <Label htmlFor="importo" className="text-sm font-semibold text-gray-900">
                Importo <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <Input
                  id="importo"
                  type="text"
                  placeholder="0.00"
                  value={formData.importo}
                  onChange={(e) => handleImportoChange(e.target.value)}
                  className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10 text-base"
                  required
                />
              </div>
              {formData.importo && !isNaN(parseFloat(formData.importo)) && (
                <p className="text-sm text-emerald-600 font-medium">
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(formData.importo))}
                </p>
              )}
            </div>

            {/* Descrizione */}
            <div className="space-y-2">
              <Label htmlFor="descrizione" className="text-sm font-semibold text-gray-900">
                Descrizione <span className="text-gray-400 font-normal">(opzionale)</span>
              </Label>
              <Textarea
                id="descrizione"
                placeholder="Eventuali dettagli sulla spesa..."
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                className="border-2 border-gray-200 rounded-xl bg-white resize-none min-h-[100px]"
              />
            </div>

            {/* Allegato */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Allegato {categorie.find(c => c.id === formData.categoria)?.richiede_allegato && (
                  <span className="text-red-600">*</span>
                )}
              </Label>

              {/* Upload Zone */}
              {!selectedFile ? (
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-6 transition-colors cursor-pointer',
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-700 mb-1">
                      Trascina il file qui o <span className="text-emerald-600 font-medium">tocca per selezionare</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0 rounded-lg"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Invio in corso...' : 'Invia Richiesta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
