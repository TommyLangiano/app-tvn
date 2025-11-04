'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { CommessaFormData, TipologiaCliente, TipologiaCommessa } from '@/types/commessa';

interface NewCommessaDialogProps {
  tenantId: string;
  onCommessaCreated: () => void;
}

export function NewCommessaDialog({ tenantId, onCommessaCreated }: NewCommessaDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CommessaFormData>({
    tipologia_cliente: 'Privato',
    tipologia_commessa: 'Appalto',
    nome_commessa: '',
    cliente_commessa: '',
  });

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

      const { error } = await supabase.from('commesse').insert({
        ...formData,
        tenant_id: tenantId,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Commessa creata con successo!');
      setOpen(false);
      setFormData({
        tipologia_cliente: 'Privato',
        tipologia_commessa: 'Appalto',
        nome_commessa: '',
        cliente_commessa: '',
      });
      onCommessaCreated();
    } catch {

      toast.error('Errore nella creazione della commessa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Commessa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Commessa</DialogTitle>
          <DialogDescription>
            Compila i campi per creare una nuova commessa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Tipologia Cliente */}
            <div className="space-y-2">
              <Label htmlFor="tipologia_cliente">
                Tipologia Cliente <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipologia_cliente}
                onValueChange={(value: TipologiaCliente) =>
                  setFormData({ ...formData, tipologia_cliente: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Privato">Privato</SelectItem>
                  <SelectItem value="Pubblico">Pubblico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipologia Commessa */}
            <div className="space-y-2">
              <Label htmlFor="tipologia_commessa">
                Tipologia Commessa <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipologia_commessa}
                onValueChange={(value: TipologiaCommessa) =>
                  setFormData({ ...formData, tipologia_commessa: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Appalto">Appalto</SelectItem>
                  <SelectItem value="ATI">ATI</SelectItem>
                  <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                  <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nome Commessa */}
          <div className="space-y-2">
            <Label htmlFor="nome_commessa">
              Nome Commessa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome_commessa"
              value={formData.nome_commessa}
              onChange={(e) =>
                setFormData({ ...formData, nome_commessa: e.target.value })
              }
              required
            />
          </div>

          {/* Cliente Commessa */}
          <div className="space-y-2">
            <Label htmlFor="cliente_commessa">
              Cliente Commessa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cliente_commessa"
              value={formData.cliente_commessa}
              onChange={(e) =>
                setFormData({ ...formData, cliente_commessa: e.target.value })
              }
              required
              placeholder="Seleziona o inserisci manualmente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Codice Commessa */}
            <div className="space-y-2">
              <Label htmlFor="codice_commessa">Codice Commessa</Label>
              <Input
                id="codice_commessa"
                value={formData.codice_commessa || ''}
                onChange={(e) =>
                  setFormData({ ...formData, codice_commessa: e.target.value })
                }
              />
            </div>

            {/* Importo Commessa */}
            <div className="space-y-2">
              <Label htmlFor="importo_commessa">Importo Commessa (€)</Label>
              <Input
                id="importo_commessa"
                type="number"
                step="0.01"
                value={formData.importo_commessa || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    importo_commessa: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Città */}
            <div className="space-y-2">
              <Label htmlFor="citta">Città</Label>
              <Input
                id="citta"
                value={formData.citta || ''}
                onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
              />
            </div>

            {/* Provincia */}
            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia</Label>
              <Input
                id="provincia"
                value={formData.provincia || ''}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                maxLength={2}
                placeholder="Es. RM"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Via */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="via">Via</Label>
              <Input
                id="via"
                value={formData.via || ''}
                onChange={(e) => setFormData({ ...formData, via: e.target.value })}
              />
            </div>

            {/* Numero Civico */}
            <div className="space-y-2">
              <Label htmlFor="numero_civico">N. Civico</Label>
              <Input
                id="numero_civico"
                value={formData.numero_civico || ''}
                onChange={(e) =>
                  setFormData({ ...formData, numero_civico: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data Inizio */}
            <div className="space-y-2">
              <Label htmlFor="data_inizio">Data Inizio</Label>
              <Input
                id="data_inizio"
                type="date"
                value={formData.data_inizio || ''}
                onChange={(e) =>
                  setFormData({ ...formData, data_inizio: e.target.value })
                }
              />
            </div>

            {/* Data Fine Prevista */}
            <div className="space-y-2">
              <Label htmlFor="data_fine_prevista">Data Fine Prevista</Label>
              <Input
                id="data_fine_prevista"
                type="date"
                value={formData.data_fine_prevista || ''}
                onChange={(e) =>
                  setFormData({ ...formData, data_fine_prevista: e.target.value })
                }
              />
            </div>
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione || ''}
              onChange={(e) =>
                setFormData({ ...formData, descrizione: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Commessa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
