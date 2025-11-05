'use client';

import { useState, useEffect, useRef } from 'react';
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
import { ModalWrapper } from '@/components/common/ModalWrapper';
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
  role: string;
  user_metadata?: {
    full_name?: string;
  };
};

type Commessa = {
  id: string;
  nome_commessa: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
      if (!userTenant) return;

      // Load users from API route - filter only operaio role
      const response = await fetch('/api/users');
      if (response.ok) {
        const { users: usersData } = await response.json();

        // DEBUG: Log all users and their roles
        console.log('🔍 ALL USERS from API:', usersData);
        console.log('🔍 User roles:', usersData.map((u: User) => ({ email: u.email, role: u.role })));

        // Filter only users with role 'operaio'
        const operai = (usersData || []).filter((u: User) => u.role === 'operaio');
        console.log('✅ FILTERED OPERAI:', operai);

        setUsers(operai);
      }

      // Load commesse
      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, nome_commessa')
        .eq('tenant_id', userTenant.tenant_id)
        .order('nome_commessa');

      if (commesseData) {
        setCommesse(commesseData);
      }
    } catch {
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
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
      if (!userTenant) throw new Error('No tenant found');

      let allegato_url = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userTenant.tenant_id}/rapportini/${formData.user_id}/${fileName}`;

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
          tenant_id: userTenant.tenant_id,
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
    } catch {
      toast.error('Errore nella creazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || user.email;
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Nuovo Rapportino</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compila i dati del rapportino giornaliero
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 border-2 gap-1.5"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 border-2"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {loadingData ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              Caricamento dati...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card Unica */}
              <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Operaio */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium text-sm">
                      Operaio <span className="text-destructive">*</span>
                    </Label>
                    <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openUserCombobox}
                          className="h-11 w-full justify-between border-2 border-border bg-background"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {formData.user_id
                                ? getUserDisplayName(users.find((u) => u.id === formData.user_id)!)
                                : 'Seleziona operaio...'}
                            </span>
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
                    <Label htmlFor="data_rapportino" className="text-foreground font-medium text-sm">
                      Data Rapportino <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="data_rapportino"
                        type="date"
                        value={formData.data_rapportino}
                        onChange={(e) => setFormData({ ...formData, data_rapportino: e.target.value })}
                        className="h-11 border-2 border-border bg-background pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Ore Lavorate */}
                  <div className="space-y-2">
                    <Label htmlFor="ore_lavorate" className="text-foreground font-medium text-sm">
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
                        className="h-11 border-2 border-border bg-background pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Commessa */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium text-sm">
                    Commessa <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={openCommessaCombobox} onOpenChange={setOpenCommessaCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCommessaCombobox}
                        className="h-11 w-full justify-between border-2 border-border bg-background"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {formData.commessa_id
                              ? commesse.find((c) => c.id === formData.commessa_id)?.nome_commessa
                              : 'Seleziona commessa...'}
                          </span>
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
                                value={commessa.nome_commessa}
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
                                {commessa.nome_commessa}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Row: Note + Upload File */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Note - 3 colonne */}
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="note" className="text-foreground font-medium text-sm">Note</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Textarea
                        id="note"
                        placeholder="Eventuali note sul rapportino..."
                        rows={5}
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="border-2 border-border bg-background pl-10 resize-none"
                      />
                    </div>
                  </div>

                  {/* Upload File - 2 colonne */}
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-foreground font-medium text-sm">Allegato</Label>
                    <div
                      className={cn(
                        'relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer h-[calc(100%-28px)]',
                        dragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
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
                      <div className="text-center h-full flex flex-col items-center justify-center">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        {selectedFile ? (
                          <>
                            <p className="text-sm font-medium text-foreground mb-1 truncate max-w-full px-2">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
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
                              className="h-8 text-xs border-2"
                            >
                              Rimuovi
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-foreground mb-1 px-2">
                              Trascina o <span className="text-primary font-medium">clicca</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF, JPG, PNG (max 10MB)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 mt-6 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2 h-11 px-6 font-semibold"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
              className="h-11 px-6 font-semibold"
            >
              {loading ? 'Creazione in corso...' : 'Crea Rapportino'}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
