'use client';

import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TeamMember {
  id: string;
  nome: string;
  cognome: string;
  ruolo?: string;
  email?: string;
}

interface TeamTableProps {
  members: TeamMember[];
  onRemove?: (id: string) => void;
  onBulkRemove?: (ids: string[]) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function TeamTable({ members, onRemove, onBulkRemove, selectedIds, onSelectionChange }: TeamTableProps) {
  const toggleSelectAll = () => {
    if (selectedIds.size === members.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(members.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-lg">
        Nessuna persona aggiunta al team
      </div>
    );
  }

  const allSelected = members.length > 0 && selectedIds.size === members.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < members.length;

  return (
    <div className="w-full border-2 border-border rounded-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-border">
            <th className="px-4 py-6 w-12 border-r border-border">
              <Checkbox
                checked={allSelected}
                {...(someSelected ? { 'data-indeterminate': true } : {})}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Cognome</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Nome</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Ruolo</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Email</th>
            <th className="px-4 py-6 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className="border-b border-border hover:bg-primary/10 transition-colors"
            >
              {/* Checkbox */}
              <td className="px-4 py-5">
                <Checkbox
                  checked={selectedIds.has(member.id)}
                  onCheckedChange={() => toggleSelect(member.id)}
                />
              </td>

              {/* Cognome */}
              <td className="px-4 py-5">
                <div className="text-sm text-foreground font-medium">
                  {member.cognome}
                </div>
              </td>

              {/* Nome */}
              <td className="px-4 py-5">
                <div className="text-sm text-foreground font-medium">
                  {member.nome}
                </div>
              </td>

              {/* Ruolo */}
              <td className="px-4 py-5">
                <div className="text-sm text-muted-foreground">
                  {member.ruolo || '-'}
                </div>
              </td>

              {/* Email */}
              <td className="px-4 py-5">
                <div className="text-sm text-muted-foreground">
                  {member.email || '-'}
                </div>
              </td>

              {/* Azioni */}
              <td className="px-4 py-5 w-20">
                <div className="flex items-center justify-end">
                  {onRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(member.id)}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
