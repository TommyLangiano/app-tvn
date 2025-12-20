'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, LogOut, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function MobileProfiloPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get dipendente data
      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserData({
        email: user.email,
        ...dipendente,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Logout effettuato');
      router.push('/sign-in');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Errore durante il logout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header con Avatar */}
      <div className="text-center">
        {userData?.avatar_url ? (
          <img
            src={userData.avatar_url}
            alt="Avatar"
            className="w-24 h-24 rounded-full mx-auto border-4 border-emerald-100"
          />
        ) : (
          <div className="w-24 h-24 rounded-full mx-auto bg-emerald-100 flex items-center justify-center border-4 border-emerald-200">
            <span className="text-3xl font-bold text-emerald-700">
              {userData?.nome?.[0]}{userData?.cognome?.[0]}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          {userData?.nome} {userData?.cognome}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{userData?.qualifica || 'Dipendente'}</p>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        <Card className="p-4 border-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{userData?.email || 'Non disponibile'}</p>
            </div>
          </div>
        </Card>

        {userData?.telefono && (
          <Card className="p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Telefono</p>
                <p className="font-medium text-gray-900">{userData.telefono}</p>
              </div>
            </div>
          </Card>
        )}

        {userData?.matricola && (
          <Card className="p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Matricola</p>
                <p className="font-medium text-gray-900">{userData.matricola}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Informazioni Contrattuali */}
      {(userData?.data_assunzione || userData?.tipo_contratto) && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Informazioni Contrattuali</h2>

          <Card className="p-4 border-2 border-gray-200 space-y-3">
            {userData?.tipo_contratto && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Tipo Contratto</span>
                <span className="text-sm font-medium text-gray-900">{userData.tipo_contratto}</span>
              </div>
            )}
            {userData?.data_assunzione && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Data Assunzione</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(userData.data_assunzione).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
            {userData?.ore_settimanali && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Ore Settimanali</span>
                <span className="text-sm font-medium text-gray-900">{userData.ore_settimanali}h</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full h-12 text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Esci
      </Button>

      {/* Version */}
      <p className="text-center text-xs text-gray-400 pb-4">
        AppTVN Mobile v1.0.0
      </p>
    </div>
  );
}
