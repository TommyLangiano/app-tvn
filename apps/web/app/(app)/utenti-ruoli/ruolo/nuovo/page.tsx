'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { createCustomRole } from '@/lib/roles';
import type { RolePermissions } from '@/lib/roles';
import {
  Loader2,
  ArrowLeft,
  Briefcase,
  Users,
  Calculator,
  FileText,
  Wrench,
  ClipboardList,
  UserCircle,
  Building2,
  Headphones,
  Settings,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface PermissionSection {
  key: keyof RolePermissions;
  label: string;
  description: string;
  actions: string[];
}

interface RoleTemplate {
  name: string;
  description: string;
  icon: any;
  permissions: RolePermissions;
}

interface IconOption {
  name: string;
  icon: any;
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
  upload: 'Carica',
};

const ICON_OPTIONS: IconOption[] = [
  { name: 'Users', icon: Users },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Wrench', icon: Wrench },
  { name: 'ClipboardList', icon: ClipboardList },
  { name: 'Calculator', icon: Calculator },
  { name: 'FileText', icon: FileText },
  { name: 'UserCircle', icon: UserCircle },
  { name: 'Building2', icon: Building2 },
  { name: 'Headphones', icon: Headphones },
  { name: 'Settings', icon: Settings },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'TrendingUp', icon: TrendingUp },
];

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Responsabile Risorse Umane',
    description: 'Gestisce dipendenti, documenti e rapportini del personale',
    icon: Users,
    permissions: {
      dipendenti: ['view', 'create', 'update', 'delete'],
      documenti: ['view', 'upload', 'delete'],
      rapportini: ['view', 'create', 'update', 'delete'],
      users: ['view'],
    },
  },
  {
    name: 'Project Manager',
    description: 'Gestisce commesse, clienti e rapportini di cantiere',
    icon: Briefcase,
    permissions: {
      commesse: ['view', 'create', 'update', 'delete'],
      clienti: ['view', 'create', 'update', 'delete'],
      rapportini: ['view', 'create', 'update', 'delete'],
      dipendenti: ['view'],
      costi: ['view'],
    },
  },
  {
    name: 'Responsabile Acquisti',
    description: 'Gestisce fornitori e costi su commesse',
    icon: ClipboardList,
    permissions: {
      fornitori: ['view', 'create', 'update', 'delete'],
      costi: ['view', 'create', 'update', 'delete'],
      commesse: ['view'],
      fatture: ['view'],
    },
  },
  {
    name: 'Capo Cantiere',
    description: 'Gestisce rapportini e visualizza commesse assegnate',
    icon: Wrench,
    permissions: {
      rapportini: ['view', 'create', 'update', 'delete'],
      commesse: ['view'],
      dipendenti: ['view'],
    },
  },
];

export default function NuovoRuoloPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [selectedIconName, setSelectedIconName] = useState<string>('Users');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handlePermissionToggle = (section: keyof RolePermissions, action: string) => {
    setPermissions((prev) => {
      const current = prev[section] as string[] | undefined;
      const currentArray = Array.isArray(current) ? current : [];

      if (currentArray.includes(action)) {
        const updated = currentArray.filter((a) => a !== action);
        return {
          ...prev,
          [section]: updated.length > 0 ? updated : undefined,
        };
      } else {
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

  const applyTemplate = (template: RoleTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setPermissions(template.permissions);
    // Find icon name from template
    const iconOption = ICON_OPTIONS.find(opt => opt.icon === template.icon);
    if (iconOption) {
      setSelectedIconName(iconOption.name);
    }
    toast.success('Template applicato! Puoi modificare i dettagli prima di confermare');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Inserisci il nome del ruolo');
      return;
    }

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
        icon: selectedIconName,
      });

      if (result) {
        toast.success('Ruolo creato con successo');
        router.push('/utenti-ruoli?tab=ruoli');
      } else {
        toast.error('Errore durante la creazione del ruolo. Hai raggiunto il limite massimo di 15 ruoli personalizzati?');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Errore durante la creazione del ruolo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grid con Informazioni Base e Template */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Informazioni Base */}
          <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Informazioni Base</h2>
              <p className="text-sm text-muted-foreground">
                Nome e descrizione del ruolo
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">
                  Nome Ruolo <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  {/* Icon Picker Popover */}
                  <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={loading}
                        className="p-3 rounded-lg border-2 border-border bg-background hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
                      >
                        {(() => {
                          const selectedIcon = ICON_OPTIONS.find(opt => opt.name === selectedIconName);
                          const IconComponent = selectedIcon?.icon || Users;
                          return (
                            <IconComponent className="h-6 w-6 text-emerald-600" />
                          );
                        })()}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="w-64 p-4"
                      sideOffset={8}
                    >
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Seleziona Icona</h4>
                          <p className="text-xs text-muted-foreground">Scegli un'icona per il ruolo</p>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {ICON_OPTIONS.map((iconOption) => {
                            const IconComponent = iconOption.icon;
                            const isSelected = selectedIconName === iconOption.name;
                            return (
                              <button
                                key={iconOption.name}
                                type="button"
                                onClick={() => {
                                  setSelectedIconName(iconOption.name);
                                  setShowIconPicker(false);
                                }}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/50'
                                }`}
                              >
                                <IconComponent className={`h-5 w-5 mx-auto ${
                                  isSelected ? 'text-emerald-600' : 'text-muted-foreground'
                                }`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Input Nome */}
                  <Input
                    id="role-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="es. Responsabile Cantiere"
                    className="border-2 border-border h-11 flex-1"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Descrizione</Label>
                <Textarea
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi le responsabilita di questo ruolo..."
                  className="border-2 border-border resize-none"
                  rows={9}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Card Template Suggeriti */}
          <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Template Suggeriti</h2>
              <p className="text-sm text-muted-foreground">
                Seleziona un template per iniziare velocemente
              </p>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {ROLE_TEMPLATES.map((template, index) => {
                const IconComponent = template.icon;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    disabled={loading}
                    className="w-full text-left p-4 rounded-lg border-2 border-border bg-background/50 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                        <IconComponent className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">
              Permessi <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Seleziona le azioni che questo ruolo puo eseguire
            </p>
          </div>

          <div className="space-y-4">
            {PERMISSION_SECTIONS.map((section) => {
              const allEnabled = section.actions.every(action =>
                isPermissionEnabled(section.key, action)
              );

              return (
                <div
                  key={section.key}
                  className="rounded-lg border-2 border-border bg-background/50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{section.label}</h4>
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={allEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (allEnabled) {
                          // Deseleziona tutto
                          section.actions.forEach(action => {
                            if (isPermissionEnabled(section.key, action)) {
                              handlePermissionToggle(section.key, action);
                            }
                          });
                        } else {
                          // Seleziona tutto
                          section.actions.forEach(action => {
                            if (!isPermissionEnabled(section.key, action)) {
                              handlePermissionToggle(section.key, action);
                            }
                          });
                        }
                      }}
                      disabled={loading}
                      className={allEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Tutto
                    </Button>
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
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/utenti-ruoli?tab=ruoli')}
            disabled={loading}
            className="h-11"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 h-11"
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
    </div>
  );
}
