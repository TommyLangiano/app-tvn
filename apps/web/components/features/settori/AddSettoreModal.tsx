'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Settore = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: 'clienti' | 'fornitori' | 'entrambi';
  created_at: string;
};

type AddSettoreModalProps = {
  isOpen: boolean;
  onClose: (refresh: boolean) => void;
  tenantId: string;
  editingSettore: Settore | null;
};

export function AddSettoreModal({ isOpen, onClose, tenantId, editingSettore }: AddSettoreModalProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'clienti' | 'fornitori' | 'entrambi'>('clienti');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingSettore) {
      setNome(editingSettore.nome);
      setTipo(editingSettore.tipo);
    } else {
      setNome('');
      setTipo('clienti');
    }
  }, [editingSettore, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Il nome del settore è obbligatorio');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (editingSettore) {
        // Update existing settore
        const { error } = await supabase
          .from('settori_personalizzati')
          .update({
            nome: nome.trim(),
            tipo,
          })
          .eq('id', editingSettore.id);

        if (error) {
          if (error.code === '23505') {
            toast.error('Esiste già un settore con questo nome e tipo');
            return;
          }
          throw error;
        }

        toast.success('Settore aggiornato con successo');
      } else {
        // Create new settore
        const { error } = await supabase
          .from('settori_personalizzati')
          .insert([{
            tenant_id: tenantId,
            nome: nome.trim(),
            tipo,
          }]);

        if (error) {
          if (error.code === '23505') {
            toast.error('Esiste già un settore con questo nome e tipo');
            return;
          }
          throw error;
        }

        toast.success('Settore creato con successo');
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving settore:', error);
      toast.error('Errore durante il salvataggio del settore');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl border-2 border-border w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <h2 className="text-xl font-bold">
            {editingSettore ? 'Modifica Settore' : 'Nuovo Settore'}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome Settore <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border-2 border-border"
              placeholder="es. Edilizia, Arredamento, Consulenza..."
              required
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>
              Tipo <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="tipo"
                  value="clienti"
                  checked={tipo === 'clienti'}
                  onChange={(e) => setTipo(e.target.value as 'clienti')}
                  className="h-4 w-4 text-emerald-600"
                />
                <div>
                  <div className="font-medium">Clienti</div>
                  <div className="text-sm text-muted-foreground">
                    Il settore sarà disponibile solo per i clienti
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="tipo"
                  value="fornitori"
                  checked={tipo === 'fornitori'}
                  onChange={(e) => setTipo(e.target.value as 'fornitori')}
                  className="h-4 w-4 text-emerald-600"
                />
                <div>
                  <div className="font-medium">Fornitori</div>
                  <div className="text-sm text-muted-foreground">
                    Il settore sarà disponibile solo per i fornitori
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="tipo"
                  value="entrambi"
                  checked={tipo === 'entrambi'}
                  onChange={(e) => setTipo(e.target.value as 'entrambi')}
                  className="h-4 w-4 text-emerald-600"
                />
                <div>
                  <div className="font-medium">Entrambi</div>
                  <div className="text-sm text-muted-foreground">
                    Il settore sarà disponibile sia per clienti che fornitori
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Salvataggio...' : editingSettore ? 'Aggiorna' : 'Crea Settore'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
