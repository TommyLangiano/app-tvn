'use client';

import { useState, useEffect } from 'react';
import { Save, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ImpostazioniGenerali() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    full_name: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserData({
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: userData.full_name,
        },
      });

      if (error) throw error;

      toast.success('Profilo aggiornato con successo');
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nel salvataggio del profilo';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Le password non corrispondono');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      toast.success('Password aggiornata con successo');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nel cambio password';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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
    <div className="space-y-8">
      {/* Profilo Utente */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Profilo Utente</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={userData.full_name}
              onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userData.email}
              disabled
              className="h-11 border-2 border-border bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              L&apos;email non può essere modificata
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </div>
      </form>

      {/* Cambio Password */}
      <form onSubmit={handleChangePassword} className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Cambia Password</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Nuova Password</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="h-11 border-2 border-border"
              placeholder="Minimo 6 caratteri"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Conferma Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              className="h-11 border-2 border-border"
              placeholder="Ripeti la nuova password"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving} className="gap-2">
              <Lock className="h-4 w-4" />
              {saving ? 'Aggiornamento...' : 'Aggiorna Password'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
