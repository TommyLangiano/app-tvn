'use client';

import { useState } from 'react';
import { Edit2, Trash2, FileText, Users, Clock, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import type { F24, F24Dettaglio } from '@/types/f24';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface Props {
  f24: F24;
  dettaglio: F24Dettaglio[];
  onEdit: () => void;
  onUpdate: () => void;
}

export function F24DetailView({ f24, dettaglio, onEdit, onUpdate }: Props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('f24')
        .delete()
        .eq('id', f24.id);

      if (error) throw error;

      toast.success('F24 eliminato con successo');
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting F24:', error);
      toast.error('Errore nell\'eliminazione dell\'F24');
    } finally {
      setDeleting(false);
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} ore`;
    return `${h} ore e ${m} min`;
  };

  // Calcola i totali
  const totaleOre = dettaglio.reduce((sum, item) => sum + Number(item.ore_commessa), 0);
  const totaleF24 = dettaglio.reduce((sum, item) => sum + Number(item.valore_f24_commessa), 0);

  return (
    <div className="space-y-6">
      {/* Card Unica F24 + Dettaglio */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            F24 - {MESI[f24.mese - 1]} {f24.anno}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Modifica
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Elimina
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span className="text-sm">Importo Totale</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(Number(f24.importo_f24))}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Ore Totali</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatHours(Number(f24.totale_ore_decimali))}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Dipendenti</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {f24.numero_dipendenti}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span className="text-sm">Valore Orario</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(Number(f24.valore_orario))}/h
            </p>
          </div>
        </div>

        {/* Note */}
        {f24.note && (
          <div className="px-6 pb-6">
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-muted-foreground mb-1">Note</p>
                <p className="text-foreground">{f24.note}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabella Dettaglio Commesse */}
      {dettaglio.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">
            Nessuna commessa con ore lavorate in questo periodo
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-border">
                <th className="px-4 py-6 text-left text-sm font-semibold text-foreground">
                  Commessa
                </th>
                <th className="px-4 py-6 text-left text-sm font-semibold text-foreground">
                  Ore Totali
                </th>
                <th className="px-4 py-6 text-left text-sm font-semibold text-foreground">
                  Dipendenti
                </th>
                <th className="px-4 py-6 text-left text-sm font-semibold text-foreground">
                  Totale F24
                </th>
              </tr>
            </thead>
            <tbody>
              {dettaglio.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border transition-colors hover:bg-primary/10"
                >
                  <td className="px-4 py-5">
                    <span className="font-medium text-foreground">
                      {item.commesse?.nome_commessa || item.commesse?.titolo || item.commessa_id}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="font-medium text-foreground">
                      {formatHours(Number(item.ore_commessa))}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="font-medium text-foreground">
                      {item.numero_dipendenti_commessa}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="font-bold text-primary">
                      {formatCurrency(Number(item.valore_f24_commessa))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-border">
                <td className="px-4 py-6 text-left text-sm font-bold text-foreground">
                  TOTALE
                </td>
                <td className="px-4 py-6 text-left text-sm font-bold text-foreground">
                  {formatHours(totaleOre)}
                </td>
                <td className="px-4 py-6 text-left text-sm font-bold text-foreground">
                  {f24.numero_dipendenti}
                </td>
                <td className="px-4 py-6 text-left text-sm font-bold text-primary">
                  {formatCurrency(totaleF24)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'F24 di {MESI[f24.mese - 1]} {f24.anno}?
              Questa azione eliminerà anche tutti i dettagli di ripartizione associati e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
