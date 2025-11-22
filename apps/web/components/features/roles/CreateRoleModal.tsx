'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createCustomRole } from '@/lib/roles';
import type { RolePermissions } from '@/lib/roles';
import { Loader2 } from 'lucide-react';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PermissionSection {
  key: keyof RolePermissions;
  label: string;
  description: string;
  actions: string[];
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    key: 'users',
    label: 'Utenti & Ruoli',
    description: 'Gestione accessi e permessi al sistema',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'dipendenti',
    label: 'Anagrafica Dipendenti',
    description: 'Dati personali, documenti, patenti, visite mediche',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'rapportini',
    label: 'Rapportini',
    description: 'Rapportini giornalieri di lavoro',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'commesse',
    label: 'Commesse & Progetti',
    description: 'Progetti, movimenti, fatture attive',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'clienti',
    label: 'Clienti',
    description: 'Anagrafica e gestione clienti',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'fornitori',
    label: 'Fornitori',
    description: 'Anagrafica e gestione fornitori',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'fatture',
    label: 'Fatturazione',
    description: 'Fatture passive, documenti contabili',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'costi',
    label: 'Costi & Movimenti',
    description: 'Costi su commesse, movimenti finanziari',
    actions: ['view', 'create', 'update', 'delete'],
  },
  {
    key: 'documenti',
    label: 'Documenti',
    description: 'Caricamento e gestione documenti dipendenti',
    actions: ['view', 'upload', 'delete'],
  },
  {
    key: 'settings',
    label: 'Impostazioni Azienda',
    description: 'Configurazione generale del sistema',
    actions: ['view', 'update'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualizza',
  create: 'Crea',
  update: 'Modifica',
  delete: 'Elimina',
  view_own: 'Visualizza propri',
  create_own: 'Crea propri',
  update_own: 'Modifica propri',
  delete_own: 'Elimina propri',
  view_all: 'Visualizza tutti',
  create_all: 'Crea per altri',
  update_all: 'Modifica tutti',
  delete_all: 'Elimina tutti',
  upload: 'Carica',
};

export function CreateRoleModal({ open, onOpenChange, onSuccess }: CreateRoleModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<RolePermissions>({});

  const handlePermissionToggle = (section: keyof RolePermissions, action: string) => {
    setPermissions((prev) => {
      const current = prev[section] as string[] | undefined;
      const currentArray = Array.isArray(current) ? current : [];

      if (currentArray.includes(action)) {
        // Remove permission
        const updated = currentArray.filter((a) => a !== action);
        return {
          ...prev,
          [section]: updated.length > 0 ? updated : undefined,
        };
      } else {
        // Add permission
        return {
          ...prev,
          [section]: [...currentArray, action],
        };
      }
    });
  };

  const isPermissionEnabled = (section: keyof RolePermissions, action: string): boolean => {
    const current = permissions[section] as string[] | undefined;
    return Array.isArray(current) && current.includes(action);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Inserisci il nome del ruolo');
      return;
    }

    // Check if at least one permission is selected
    const hasPermissions = Object.values(permissions).some(
      (perms) => Array.isArray(perms) && perms.length > 0
    );

    if (!hasPermissions) {
      toast.error('Seleziona almeno un permesso');
      return;
    }

    setLoading(true);

    try {
      const result = await createCustomRole({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
      });

      if (result) {
        toast.success('Ruolo creato con successo');
        setName('');
        setDescription('');
        setPermissions({});
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Errore durante la creazione del ruolo');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Errore durante la creazione del ruolo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Ruolo Personalizzato</DialogTitle>
          <DialogDescription>
            Crea un ruolo su misura per la tua azienda con permessi specifici
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome e Descrizione */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">
                Nome Ruolo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Responsabile Cantiere"
                className="border-2 border-border"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Descrizione</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi le responsabilità di questo ruolo..."
                className="border-2 border-border resize-none"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          {/* Permessi */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">
                Permessi <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Seleziona le azioni che questo ruolo può eseguire
              </p>
            </div>

            <div className="space-y-4">
              {PERMISSION_SECTIONS.map((section) => (
                <div
                  key={section.key}
                  className="rounded-lg border-2 border-border bg-card p-4"
                >
                  <div className="mb-3">
                    <h4 className="font-medium text-sm">{section.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {section.actions.map((action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${section.key}-${action}`}
                          checked={isPermissionEnabled(section.key, action)}
                          onCheckedChange={() =>
                            handlePermissionToggle(section.key, action)
                          }
                          disabled={loading}
                        />
                        <label
                          htmlFor={`${section.key}-${action}`}
                          className="text-sm cursor-pointer select-none"
                        >
                          {ACTION_LABELS[action] || action}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea Ruolo'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
