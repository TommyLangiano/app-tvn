'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Settore = {
  id: string;
  nome: string;
  tipo: 'clienti' | 'fornitori' | 'entrambi';
};

type SettoreComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  tipo: 'clienti' | 'fornitori';
  tenantId: string;
  label?: string;
  required?: boolean;
};

export function SettoreCombobox({
  value,
  onChange,
  tipo,
  tenantId,
  label = 'Tipologia Settore',
  required = true,
}: SettoreComboboxProps) {
  const [open, setOpen] = useState(false);
  const [settori, setSettori] = useState<Settore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadSettori();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tipo]);

  const loadSettori = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('settori_personalizzati')
        .select('id, nome, tipo')
        .eq('tenant_id', tenantId)
        .in('tipo', [tipo, 'entrambi'])
        .order('nome', { ascending: true });

      if (error) throw error;

      setSettori(data || []);
    } catch (error) {
      console.error('Error loading settori:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  // Filter settori based on search
  const filteredSettori = settori.filter(s =>
    s.nome.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="tipologia_settore">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Seleziona dalla lista o scrivi un nuovo settore. Gestisci i settori da <strong>Impostazioni → Settori</strong>.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between border-2 border-border font-normal h-11"
          >
            <span className={cn(!value && "text-muted-foreground")}>
              {value || "Seleziona o inserisci un settore..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cerca o scrivi un nuovo settore..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Caricamento settori...
                </div>
              ) : (
                <>
                  {filteredSettori.length > 0 && (
                    <CommandGroup heading="Settori disponibili">
                      {filteredSettori.map((settore) => (
                        <CommandItem
                          key={settore.id}
                          value={settore.nome}
                          onSelect={() => handleSelect(settore.nome)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value.toLowerCase() === settore.nome.toLowerCase()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {settore.nome}
                          {settore.tipo === 'entrambi' && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              (Condiviso)
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Allow custom input */}
                  {searchValue.trim() !== '' && !filteredSettori.some(s => s.nome.toLowerCase() === searchValue.toLowerCase()) && (
                    <CommandGroup heading="Crea nuovo">
                      <CommandItem
                        value={searchValue}
                        onSelect={() => handleSelect(searchValue)}
                        className="text-emerald-600"
                      >
                        <ChevronsUpDown className="mr-2 h-4 w-4" />
                        Usa "{searchValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {filteredSettori.length === 0 && searchValue.trim() === '' && (
                    <CommandEmpty>
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Nessun settore configurato
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inizia a scrivere per creare il primo settore
                        </p>
                      </div>
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
