'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { TipoMovimento } from '@/types/movimento';

interface MovimentoFormProps {
  commessaId: string;
  tipo: TipoMovimento;
  onSuccess: () => void;
  onCancel: () => void;
}

const aliquoteIva = ['0', '4', '5', '10', '22'];

export function MovimentoForm({ commessaId, tipo, onSuccess, onCancel }: MovimentoFormProps) {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [formData, setFormData] = useState({
    descrizione: '',
    importo_imponibile: '',
    aliquota_iva: '22',
    data_movimento: new Date().toISOString().split('T')[0],
    categoria: '',
    note: '',
  });

  useEffect(() => {
    loadTenantId();
  }, []);

  const loadTenantId = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenants) {
        setTenantId(userTenants.tenant_id);
      }
    } catch {

    }
  };

  const calcolaIva = () => {
    const imponibile = parseFloat(formData.importo_imponibile) || 0;
    const aliquota = parseFloat(formData.aliquota_iva) || 0;
    return (imponibile * aliquota) / 100;
  };

  const calcolaTotale = () => {
    const imponibile = parseFloat(formData.importo_imponibile) || 0;
    const iva = calcolaIva();
    return imponibile + iva;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      const importo_imponibile = parseFloat(formData.importo_imponibile);
      const aliquota_iva = parseFloat(formData.aliquota_iva);
      const importo_iva = calcolaIva();

      const dataToInsert = {
        commessa_id: commessaId,
        tenant_id: tenantId,
        tipo,
        descrizione: formData.descrizione,
        importo_imponibile,
        aliquota_iva,
        importo_iva,
        data_movimento: formData.data_movimento,
        categoria: formData.categoria || null,
        note: formData.note || null,
        created_by: user.id,
      };

      const { error } = await supabase.from('movimenti_commessa').insert(dataToInsert);

      if (error) throw error;

      toast.success(`${tipo === 'ricavo' ? 'Ricavo' : 'Costo'} aggiunto con successo!`);
      onSuccess();
    } catch {

      toast.error('Errore nell\'aggiunta del movimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Nuovo {tipo === 'ricavo' ? 'Ricavo' : 'Costo'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Descrizione - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="descrizione">
              Descrizione <span className="text-destructive">*</span>
            </Label>
            <Input
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              placeholder={tipo === 'ricavo' ? 'Es. Acconto cliente' : 'Es. Acquisto materiali'}
              required
              className="h-11 border-2 border-border"
            />
          </div>

          {/* Riga: Importo, IVA, Data */}
          <div className="grid grid-cols-3 gap-4">
            {/* Importo Imponibile */}
            <div className="space-y-2">
              <Label htmlFor="importo_imponibile">
                Importo Imponibile (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="importo_imponibile"
                type="number"
                step="0.01"
                min="0"
                value={formData.importo_imponibile}
                onChange={(e) => setFormData({ ...formData, importo_imponibile: e.target.value })}
                placeholder="0.00"
                required
                className="h-11 border-2 border-border"
              />
            </div>

            {/* Aliquota IVA */}
            <div className="space-y-2">
              <Label htmlFor="aliquota_iva">
                Aliquota IVA <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.aliquota_iva}
                onValueChange={(value) => setFormData({ ...formData, aliquota_iva: value })}
              >
                <SelectTrigger className="h-11 border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aliquoteIva.map((aliquota) => (
                    <SelectItem key={aliquota} value={aliquota}>
                      {aliquota}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Movimento */}
            <div className="space-y-2">
              <Label htmlFor="data_movimento">
                Data <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_movimento"
                type="date"
                value={formData.data_movimento}
                onChange={(e) => setFormData({ ...formData, data_movimento: e.target.value })}
                required
                className="h-11 border-2 border-border"
              />
            </div>
          </div>

          {/* Calcoli auto */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA Calcolata:</span>
                <span className="font-semibold">€{calcolaIva().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Totale:</span>
                <span className="font-bold text-primary">€{calcolaTotale().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Riga: Categoria e Note */}
          <div className="grid grid-cols-2 gap-4">
            {/* Categoria (opzionale) */}
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder={tipo === 'ricavo' ? 'Es. Acconto' : 'Es. Materiali'}
                className="h-11 border-2 border-border"
              />
            </div>

            {/* Note (opzionale) */}
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Eventuali note..."
                className="h-11 border-2 border-border"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="border-2"
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading} className="font-semibold">
              {loading ? 'Salvataggio...' : 'Aggiungi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
