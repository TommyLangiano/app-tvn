'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

interface Comune {
  codice_istat: string;
  nome: string;
  provincia: string;
  sigla_provincia: string;
  regione: string;
  cap: string;
}

interface CityComboboxProps {
  value?: string;
  onSelect: (comune: Comune | null) => void;
  placeholder?: string;
  error?: boolean;
  id?: string;
  disabled?: boolean;
}

export function CityCombobox({
  value,
  onSelect,
  placeholder = 'Seleziona città...',
  error = false,
  id,
  disabled = false,
}: CityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [comuni, setComuni] = React.useState<Comune[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setComuni([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('comuni_italiani')
          .select('*')
          .ilike('nome', `${searchQuery}%`)
          .order('nome', { ascending: true })
          .limit(50);

        if (error) throw error;
        setComuni(data || []);
      } catch (err) {
        console.error('Error fetching comuni:', err);
        setComuni([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedComune = comuni.find((c) => c.nome === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            error && '!border-red-500 !border-2 focus:!border-red-500'
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca città..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading
                ? 'Caricamento...'
                : searchQuery.length < 2
                  ? 'Digita almeno 2 caratteri'
                  : 'Nessuna città trovata'}
            </CommandEmpty>
            <CommandGroup>
              {comuni.map((comune) => (
                <CommandItem
                  key={comune.codice_istat}
                  value={comune.nome}
                  onSelect={() => {
                    onSelect(comune);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === comune.nome ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{comune.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {comune.provincia} ({comune.sigla_provincia}) - {comune.regione}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
