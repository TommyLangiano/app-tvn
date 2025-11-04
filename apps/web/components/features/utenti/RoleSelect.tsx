/**
 * RoleSelect Component
 *
 * Dropdown select for user roles with descriptions
 */

'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACTIVE_ROLES, ROLE_METADATA } from '@/lib/permissions';
import type { TenantRole } from '@/lib/permissions';

interface RoleSelectProps {
  value: TenantRole;
  onChange: (value: TenantRole) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

export function RoleSelect({ value, onChange, disabled, showDescription = true }: RoleSelectProps) {
  const selectedMeta = ROLE_METADATA[value];

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="role-select-trigger" className="h-11 border-2 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVE_ROLES.map((role) => {
            const meta = ROLE_METADATA[role];

            // Skip hidden roles (owner)
            if (meta.isHiddenFromUI) return null;

            return (
              <SelectItem key={role} value={role}>
                <div className="flex flex-col">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Description of selected role */}
      {showDescription && selectedMeta && (
        <p className="text-xs text-muted-foreground">
          ℹ️ {selectedMeta.description}
        </p>
      )}
    </div>
  );
}
