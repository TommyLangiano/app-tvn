'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Map, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type MapResult = {
  success: boolean;
  message: string;
  count: number;
  commesse?: Array<{
    id: string;
    nome: string;
    indirizzo: string;
    mapUrl: string | null;
    hasAddress: boolean;
  }>;
  info?: string;
};

export function ImpostazioniUtilita() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MapResult | null>(null);

  const handleRegenerateMaps = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/commesse/regenerate-maps', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la rigenerazione');
      }

      setResult(data);

      if (data.count > 0) {
        toast.success(`${data.count} commesse con mappe trovate`);
      } else {
        toast.info('Nessuna commessa con indirizzo trovata');
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la rigenerazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Strumenti di Utilità</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Strumenti per la manutenzione e ottimizzazione del sistema
        </p>
      </div>

      {/* Rigenera Mappe */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 border border-blue-200 flex-shrink-0">
            <Map className="h-6 w-6 text-blue-600" />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h4 className="text-base font-semibold text-foreground mb-1">
                Rigenera Mappe Commesse
              </h4>
              <p className="text-sm text-muted-foreground">
                Verifica quali commesse hanno indirizzi validi per la generazione delle mappe.
                Le mappe vengono generate automaticamente quando carichi le pagine delle commesse.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRegenerateMaps}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4" />
                    Verifica Mappe
                  </>
                )}
              </Button>
            </div>

            {/* Risultati */}
            {result && (
              <div className={`rounded-lg border-2 p-4 ${
                result.count > 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.count > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 space-y-2">
                    <p className={`text-sm font-medium ${
                      result.count > 0 ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {result.message}
                    </p>

                    {result.info && (
                      <p className={`text-xs ${
                        result.count > 0 ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {result.info}
                      </p>
                    )}

                    {result.commesse && result.commesse.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-green-800">
                          Commesse con mappe valide:
                        </p>
                        <ul className="space-y-1">
                          {result.commesse.slice(0, 5).map((commessa) => (
                            <li key={commessa.id} className="text-xs text-green-700">
                              • {commessa.nome} - {commessa.indirizzo}
                            </li>
                          ))}
                          {result.commesse.length > 5 && (
                            <li className="text-xs text-green-700 font-medium">
                              ... e altre {result.commesse.length - 5} commesse
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Come funzionano le mappe?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Le mappe vengono generate dinamicamente utilizzando Google Maps Static API quando visualizzi
              le commesse. Assicurati che la chiave API sia configurata correttamente nelle variabili d&apos;ambiente
              (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
