'use client';

import { useState, useEffect } from 'react';
import { X, Upload, User, Briefcase, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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

export function NuovoRapportinoModal({ onClose, onSuccess }: NuovoRapportinoModalProps) {
  const [formData, setFormData] = useState<RapportinoFormData>({
    user_id: '',
    commessa_id: '',
    data_rapportino: new Date().toISOString().split('T')[0],
    ore_lavorate: '',
    note: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

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

      // Load users from tenant
      const { data: tenantUsers } = await supabase
        .from('user_tenants')
        .select('user_id')
        .eq('tenant_id', userTenants.tenant_id);

      if (tenantUsers) {
        const usersData = await Promise.all(
          tenantUsers.map(async (ut) => {
            const { data } = await supabase.auth.admin.getUserById(ut.user_id);
            return data?.user;
          })
        );
        setUsers(usersData.filter(Boolean) as User[]);
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
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoadingData(false);
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

      // Insert rapportino
      const { error } = await supabase
        .from('rapportini')
        .insert({
          tenant_id: userTenants.tenant_id,
          user_id: formData.user_id,
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
      console.error('Error creating rapportino:', error);
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
        className="bg-background rounded-xl border-2 border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <h2 className="text-2xl font-bold">Nuovo Rapportino</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingData ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : (
            <>
              {/* Operaio */}
              <div className="space-y-2">
                <Label htmlFor="user_id" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Operaio <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona operaio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data_rapportino" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Rapportino <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="data_rapportino"
                  type="date"
                  value={formData.data_rapportino}
                  onChange={(e) => setFormData({ ...formData, data_rapportino: e.target.value })}
                  required
                />
              </div>

              {/* Commessa */}
              <div className="space-y-2">
                <Label htmlFor="commessa_id" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Commessa <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.commessa_id}
                  onValueChange={(value) => setFormData({ ...formData, commessa_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona commessa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {commesse.map((commessa) => (
                      <SelectItem key={commessa.id} value={commessa.id}>
                        {commessa.titolo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ore Lavorate */}
              <div className="space-y-2">
                <Label htmlFor="ore_lavorate" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ore Lavorate <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ore_lavorate"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="8"
                  value={formData.ore_lavorate}
                  onChange={(e) => setFormData({ ...formData, ore_lavorate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Inserisci le ore lavorate (es. 8, 7.5, 4)
                </p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  placeholder="Eventuali note sul rapportino..."
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Carica File
                </Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    File selezionato: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Formati supportati: PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
            >
              {loading ? 'Creazione...' : 'Crea Rapportino'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
