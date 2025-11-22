'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AddSettoreModal } from '@/components/features/settori/AddSettoreModal';

type Settore = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: 'clienti' | 'fornitori' | 'entrambi';
  created_at: string;
};

export default function SettoriPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settori, setSettori] = useState<Settore[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSettore, setEditingSettore] = useState<Settore | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenants) {
        setTenantId(userTenants.tenant_id);
        await loadSettori(userTenants.tenant_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const loadSettori = async (tenant_id: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('settori_personalizzati')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Error loading settori:', error);
      toast.error('Errore nel caricamento dei settori');
      return;
    }

    setSettori(data || []);
  };

  const handleAddNew = () => {
    setEditingSettore(null);
    setIsModalOpen(true);
  };

  const handleEdit = (settore: Settore) => {
    setEditingSettore(settore);
    setIsModalOpen(true);
  };

  const handleDelete = async (settore: Settore) => {
    const confirmDelete = confirm(
      `Sei sicuro di voler eliminare il settore "${settore.nome}"?\n\nAssicurati che non sia in uso da clienti o fornitori.`
    );

    if (!confirmDelete) return;

    setDeletingId(settore.id);

    try {
      const supabase = createClient();

      // Check if settore is in use
      if (settore.tipo === 'clienti' || settore.tipo === 'entrambi') {
        const { data: clienti, error: clientiError } = await supabase
          .from('clienti')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('tipologia_settore', settore.nome)
          .limit(1);

        if (clientiError) throw clientiError;

        if (clienti && clienti.length > 0) {
          toast.error(`Impossibile eliminare: settore in uso da ${clienti.length} cliente/i`);
          setDeletingId(null);
          return;
        }
      }

      if (settore.tipo === 'fornitori' || settore.tipo === 'entrambi') {
        const { data: fornitori, error: fornitoriError } = await supabase
          .from('fornitori')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('tipologia_settore', settore.nome)
          .limit(1);

        if (fornitoriError) throw fornitoriError;

        if (fornitori && fornitori.length > 0) {
          toast.error(`Impossibile eliminare: settore in uso da ${fornitori.length} fornitore/i`);
          setDeletingId(null);
          return;
        }
      }

      // Delete settore
      const { error } = await supabase
        .from('settori_personalizzati')
        .delete()
        .eq('id', settore.id);

      if (error) throw error;

      toast.success('Settore eliminato con successo');
      await loadSettori(tenantId);
    } catch (error) {
      console.error('Error deleting settore:', error);
      toast.error('Errore durante l\'eliminazione del settore');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = async (refresh: boolean) => {
    setIsModalOpen(false);
    setEditingSettore(null);
    if (refresh && tenantId) {
      await loadSettori(tenantId);
    }
  };

  const getSettoriByTipo = (tipo: 'clienti' | 'fornitori' | 'entrambi') => {
    return settori.filter(s => s.tipo === tipo);
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'clienti': return 'Clienti';
      case 'fornitori': return 'Fornitori';
      case 'entrambi': return 'Entrambi';
      default: return tipo;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'clienti': return 'bg-blue-100 text-blue-700';
      case 'fornitori': return 'bg-purple-100 text-purple-700';
      case 'entrambi': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Settori</h2>
          <p className="text-muted-foreground">
            Configura i settori personalizzati per clienti e fornitori
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuovo Settore
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Come funzionano i settori?</p>
          <p>
            I settori ti permettono di categorizzare i tuoi clienti e fornitori.
            Quando crei o modifichi un cliente/fornitore, potrai selezionare un settore
            dalla lista o inserirne uno nuovo.
          </p>
        </div>
      </div>

      {/* Settori Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clienti */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getTipoBadgeColor('clienti')}`}>
              Clienti
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              ({getSettoriByTipo('clienti').length})
            </span>
          </h3>
          <div className="space-y-2">
            {getSettoriByTipo('clienti').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessun settore configurato
              </p>
            ) : (
              getSettoriByTipo('clienti').map(settore => (
                <div
                  key={settore.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{settore.nome}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(settore)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(settore)}
                      disabled={deletingId === settore.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fornitori */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getTipoBadgeColor('fornitori')}`}>
              Fornitori
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              ({getSettoriByTipo('fornitori').length})
            </span>
          </h3>
          <div className="space-y-2">
            {getSettoriByTipo('fornitori').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessun settore configurato
              </p>
            ) : (
              getSettoriByTipo('fornitori').map(settore => (
                <div
                  key={settore.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{settore.nome}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(settore)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(settore)}
                      disabled={deletingId === settore.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Entrambi */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getTipoBadgeColor('entrambi')}`}>
              Entrambi
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              ({getSettoriByTipo('entrambi').length})
            </span>
          </h3>
          <div className="space-y-2">
            {getSettoriByTipo('entrambi').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessun settore configurato
              </p>
            ) : (
              getSettoriByTipo('entrambi').map(settore => (
                <div
                  key={settore.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{settore.nome}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(settore)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(settore)}
                      disabled={deletingId === settore.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddSettoreModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        tenantId={tenantId}
        editingSettore={editingSettore}
      />
    </div>
  );
}
