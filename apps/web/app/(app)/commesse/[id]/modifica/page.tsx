'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
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

export default function ModificaCommessaPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commessaId, setCommessaId] = useState<string>('');
  const [formData, setFormData] = useState<CommessaFormData>({
    tipologia_cliente: 'Privato',
    tipologia_commessa: 'Appalto',
    nome_commessa: '',
    cliente_commessa: '',
  });

  useEffect(() => {
    loadCommessa();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadCommessa = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      if (!slug) {
        setLoading(false);
        return;
      }

      // Load commessa by slug
      const { data: commessaData, error: commessaError } = await supabase
        .from('commesse')
        .select('*')
        .eq('slug', slug)
        .single();

      if (commessaError) throw commessaError;

      // Populate form with existing data
      setCommessaId(commessaData.id);
      setFormData({
        tipologia_cliente: commessaData.tipologia_cliente,
        tipologia_commessa: commessaData.tipologia_commessa,
        nome_commessa: commessaData.nome_commessa,
        cliente_commessa: commessaData.cliente_commessa,
        codice_commessa: commessaData.codice_commessa || undefined,
        importo_commessa: commessaData.importo_commessa || undefined,
        cig: commessaData.cig || undefined,
        cup: commessaData.cup || undefined,
        citta: commessaData.citta || undefined,
        provincia: commessaData.provincia || undefined,
        cap: commessaData.cap || undefined,
        via: commessaData.via || undefined,
        numero_civico: commessaData.numero_civico || undefined,
        data_inizio: commessaData.data_inizio || undefined,
        data_fine_prevista: commessaData.data_fine_prevista || undefined,
        descrizione: commessaData.descrizione || undefined,
      });

    } catch (error) {

      toast.error('Errore nel caricamento della commessa');
      router.push('/commesse');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();

      // Clean up data - remove empty optional fields
      const dataToUpdate: Record<string, unknown> = { ...formData };

      // Remove CIG and CUP if not Pubblico or if empty
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cig) {
        delete dataToUpdate.cig;
      }
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cup) {
        delete dataToUpdate.cup;
      }

      // Update commessa
      const { error } = await supabase
        .from('commesse')
        .update(dataToUpdate)
        .eq('id', commessaId);

      if (error) throw error;

      toast.success('Commessa aggiornata con successo!');

      // Redirect back to detail page
      router.push(`/commesse/${slug}`);
    } catch (error) {

      toast.error('Errore nell\'aggiornamento della commessa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb pageName={`Modifica: ${formData.nome_commessa}`} />

      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 border-2 border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Modifica Commessa</h2>
          <p className="text-muted-foreground">
            Aggiorna i campi necessari e salva le modifiche
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8 [&_label]:text-foreground [&_label]:font-medium [&_label]:text-sm [&_input]:h-11 [&_input]:bg-background [&_input]:border-2 [&_input]:border-border [&_input]:rounded-lg [&_input]:px-4 [&_input]:text-base [&_input:focus]:border-primary [&_textarea]:bg-background [&_textarea]:border-2 [&_textarea]:border-border [&_textarea]:rounded-lg [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea:focus]:border-primary [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:bg-background [&_button[role=combobox]]:border-2 [&_button[role=combobox]]:border-border [&_button[role=combobox]]:rounded-lg [&_button[role=combobox]]:px-4 [&_button[role=combobox]]:text-base [&_button[role=combobox]:focus]:border-primary">
        {/* Sezione: Informazioni Generali */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
          <div className="border-b-2 border-border pb-3">
            <h3 className="text-lg font-semibold">Informazioni Generali</h3>
            <p className="text-sm text-muted-foreground">
              Dati principali della commessa
            </p>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="Es. Ristrutturazione Edificio A"
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
                  placeholder="Seleziona o inserisci manualmente"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Codice Commessa */}
              <div className="space-y-2">
                <Label htmlFor="codice_commessa">Codice Commessa</Label>
                <Input
                  id="codice_commessa"
                  value={formData.codice_commessa || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, codice_commessa: e.target.value })
                  }
                  placeholder="Es. COM-2025-001"
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
                  placeholder="0.00"
                />
              </div>
            </div>

          {/* CIG e CUP - Solo per Pubblico */}
          {formData.tipologia_cliente === 'Pubblico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CIG */}
              <div className="space-y-2">
                <Label htmlFor="cig">
                  CIG <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cig"
                  value={formData.cig || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, cig: e.target.value })
                  }
                  placeholder="Es. 1234567890"
                  required={formData.tipologia_cliente === 'Pubblico'}
                />
              </div>

              {/* CUP */}
              <div className="space-y-2">
                <Label htmlFor="cup">
                  CUP <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cup"
                  value={formData.cup || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, cup: e.target.value })
                  }
                  placeholder="Es. A12B34567890123"
                  required={formData.tipologia_cliente === 'Pubblico'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sezione: Indirizzo */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
          <div className="border-b-2 border-border pb-3">
            <h3 className="text-lg font-semibold">Indirizzo</h3>
            <p className="text-sm text-muted-foreground">
              Località della commessa
            </p>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Via */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="via">Via</Label>
                <Input
                  id="via"
                  value={formData.via || ''}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                  placeholder="Es. Via Roma"
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
                  placeholder="Es. 123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Città */}
              <div className="space-y-2">
                <Label htmlFor="citta">Città</Label>
                <Input
                  id="citta"
                  value={formData.citta || ''}
                  onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                  placeholder="Es. Roma"
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
                  className="uppercase"
                />
              </div>

              {/* CAP */}
              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  value={formData.cap || ''}
                  onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                  maxLength={5}
                  placeholder="Es. 00100"
                />
              </div>
            </div>
        </div>

        {/* Sezione: Pianificazione */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
          <div className="border-b-2 border-border pb-3">
            <h3 className="text-lg font-semibold">Pianificazione</h3>
            <p className="text-sm text-muted-foreground">
              Date e tempistiche della commessa
            </p>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Sezione: Descrizione */}
        <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
          <div className="border-b-2 border-border pb-3">
            <h3 className="text-lg font-semibold">Descrizione</h3>
            <p className="text-sm text-muted-foreground">
              Note e dettagli aggiuntivi
            </p>
          </div>

            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione || ''}
                onChange={(e) =>
                  setFormData({ ...formData, descrizione: e.target.value })
                }
                rows={6}
                placeholder="Inserisci una descrizione dettagliata della commessa..."
              />
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
            className="border-2 border-border h-11 px-6"
          >
            Annulla
          </Button>
          <Button type="submit" disabled={saving} className="font-semibold h-11 px-6">
            {saving ? 'Salvataggio in corso...' : 'Salva modifiche'}
          </Button>
        </div>
      </form>
    </div>
  );
}
