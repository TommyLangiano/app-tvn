'use client';

import { useState } from 'react';
import { X, Mail, Lock, User, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreateUserFormData } from '@/types/tenant';

interface NuovoUtenteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const initialFormData: CreateUserFormData = {
  email: '',
  password: '',
  full_name: '',
  role: 'operaio',
};

export function NuovoUtenteModal({ onClose, onSuccess }: NuovoUtenteModalProps) {
  const [formData, setFormData] = useState<CreateUserFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setFormData(initialFormData);
  };

  const generatePassword = () => {
    // Generate a random 12-character password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    toast.success('Password generata');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      setLoading(true);

      // Call API to create user
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella creazione dell\'utente');
      }

      toast.success('Utente creato con successo');
      onSuccess();
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : 'Errore nella creazione dell\'utente';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border-2 border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-border">
          <h2 className="text-xl font-bold">Nuovo Utente</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 border-2 gap-1.5"
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-xs">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 border-2"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Row 1: Nome Completo, Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="h-11 border-2 border-border pl-10"
                    placeholder="Mario Rossi"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 border-2 border-border pl-10"
                    placeholder="mario.rossi@esempio.it"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Password, Ruolo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-11 border-2 border-border pl-10"
                      placeholder="Minimo 6 caratteri"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    className="h-11 border-2"
                  >
                    Genera
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comunica questa password all&apos;utente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  Ruolo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'operaio') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="h-11 border-2 border-border pl-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operaio">Operaio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.role === 'admin' ? 'Accesso completo al sistema' : 'Accesso limitato ai propri rapportini'}
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Nota:</strong> L&apos;utente riceverà le credenziali che hai impostato. Assicurati di comunicargliele in modo sicuro.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 mt-6 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="border-2"
            >
              {loading ? 'Creazione...' : 'Crea Utente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
