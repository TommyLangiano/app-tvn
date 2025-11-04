'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Briefcase, Calendar, Clock, RotateCcw, FileText, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RapportinoFormData } from '@/types/rapportino';

interface NuovoRapportinoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type User = {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
};

type Commessa = {
  id: string;
  titolo: string;
  slug: string;
};

const initialFormData: RapportinoFormData = {
  user_id: '',
  commessa_id: '',
  data_rapportino: new Date().toISOString().split('T')[0],
  ore_lavorate: '',
  note: '',
};

export function NuovoRapportinoModal({ onClose, onSuccess }: NuovoRapportinoModalProps) {
  const [formData, setFormData] = useState<RapportinoFormData>(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [openCommessaCombobox, setOpenCommessaCombobox] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get tenant
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Load users from API route
      const response = await fetch('/api/users');
      if (response.ok) {
        const { users: usersData } = await response.json();
        setUsers(usersData || []);
      }

      // Load commesse
      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, titolo, slug')
        .eq('tenant_id', userTenants.tenant_id)
        .eq('archiviata', false)
        .order('titolo');

      if (commesseData) {
        setCommesse(commesseData);
      }
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoadingData(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSelectedFile(null);
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.commessa_id || !formData.data_rapportino || !formData.ore_lavorate) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const oreNum = parseFloat(formData.ore_lavorate);
    if (isNaN(oreNum) || oreNum <= 0 || oreNum > 24) {
      toast.error('Le ore lavorate devono essere tra 0 e 24');
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

      let allegato_url = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userTenants.tenant_id}/rapportini/${formData.user_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fatture-documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        allegato_url = filePath;
      }

      // Get selected user info
      const selectedUser = users.find(u => u.id === formData.user_id);
      const user_name = selectedUser?.user_metadata?.full_name || null;
      const user_email = selectedUser?.email || null;

      // Insert rapportino
      const { error } = await supabase
        .from('rapportini')
        .insert({
          tenant_id: userTenants.tenant_id,
          user_id: formData.user_id,
          user_name,
          user_email,
          commessa_id: formData.commessa_id,
          data_rapportino: formData.data_rapportino,
          ore_lavorate: oreNum,
          note: formData.note || null,
          allegato_url,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Rapportino creato con successo');
      onSuccess();
    } catch (error) {
      toast.error('Errore nella creazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || user.email;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border-2 border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-border">
          <h2 className="text-xl font-bold">Nuovo Rapportino</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 border-2 gap-1.5"
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-xs">Reset Dati</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 border-2"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {loadingData ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Row 1: Operaio, Data, Ore Lavorate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Operaio */}
                <div className="space-y-2">
                  <Label>
                    Operaio <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUserCombobox}
                        className="h-11 w-full justify-between border-2 border-border"
                      >
                        <span className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 shrink-0" />
                          {formData.user_id
                            ? getUserDisplayName(users.find((u) => u.id === formData.user_id)!)
                            : 'Seleziona operaio...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca operaio..." />
                        <CommandList>
                          <CommandEmpty>Nessun operaio trovato.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={getUserDisplayName(user)}
                                onSelect={() => {
                                  setFormData({ ...formData, user_id: user.id });
                                  setOpenUserCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.user_id === user.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {getUserDisplayName(user)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <Label htmlFor="data_rapportino">
                    Data Rapportino <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="data_rapportino"
                      type="date"
                      value={formData.data_rapportino}
                      onChange={(e) => setFormData({ ...formData, data_rapportino: e.target.value })}
                      className="h-11 border-2 border-border pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Ore Lavorate */}
                <div className="space-y-2">
                  <Label htmlFor="ore_lavorate">
                    Ore Lavorate <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="ore_lavorate"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="8"
                      value={formData.ore_lavorate}
                      onChange={(e) => setFormData({ ...formData, ore_lavorate: e.target.value })}
                      className="h-11 border-2 border-border pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Commessa */}
              <div className="space-y-2">
                <Label>
                  Commessa <span className="text-destructive">*</span>
                </Label>
                <Popover open={openCommessaCombobox} onOpenChange={setOpenCommessaCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCommessaCombobox}
                      className="h-11 w-full justify-between border-2 border-border"
                    >
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        {formData.commessa_id
                          ? commesse.find((c) => c.id === formData.commessa_id)?.titolo
                          : 'Seleziona commessa...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca commessa..." />
                      <CommandList>
                        <CommandEmpty>Nessuna commessa trovata.</CommandEmpty>
                        <CommandGroup>
                          {commesse.map((commessa) => (
                            <CommandItem
                              key={commessa.id}
                              value={commessa.titolo}
                              onSelect={() => {
                                setFormData({ ...formData, commessa_id: commessa.id });
                                setOpenCommessaCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  formData.commessa_id === commessa.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {commessa.titolo}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Row 3: Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Textarea
                    id="note"
                    placeholder="Eventuali note sul rapportino..."
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="border-2 border-border pl-10 resize-none"
                  />
                </div>
              </div>

              {/* Row 4: File Upload */}
              <div className="space-y-2">
                <Label>Carica File</Label>
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-lg p-6 transition-colors',
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="mt-2 h-8 text-xs"
                        >
                          Rimuovi file
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">
                          Trascina qui il tuo file o <span className="text-primary">clicca per selezionare</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG fino a 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 mt-6 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
              className="border-2"
            >
              {loading ? 'Creazione...' : 'Crea Rapportino'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
