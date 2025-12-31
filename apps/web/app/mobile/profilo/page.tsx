'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, LogOut, Shield } from 'lucide-react';
import { toast } from 'sonner';

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const UserAvatar = memo(({ userData }: { userData: any }) => {
  if (userData?.avatar_url) {
    return (
      <img
        src={userData.avatar_url}
        alt="Avatar"
        className="w-24 h-24 rounded-full mx-auto border-4 border-emerald-100"
      />
    );
  }

  return (
    <div className="w-24 h-24 rounded-full mx-auto bg-emerald-100 flex items-center justify-center border-4 border-emerald-200">
      <span className="text-3xl font-bold text-emerald-700">
        {userData?.nome?.[0]}{userData?.cognome?.[0]}
      </span>
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';

const InfoCard = memo(({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) => (
  <Card className="p-4 border-2 border-gray-200">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
));

InfoCard.displayName = 'InfoCard';

const ContractInfo = memo(({ userData }: { userData: any }) => (
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
));

ContractInfo.displayName = 'ContractInfo';

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

  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Logout effettuato');
      router.push('/sign-in');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Errore durante il logout');
    }
  }, [router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <UserAvatar userData={userData} />
        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          {userData?.nome} {userData?.cognome}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{userData?.qualifica || 'Dipendente'}</p>
      </div>

      <div className="space-y-3">
        <InfoCard
          icon={Mail}
          label="Email"
          value={userData?.email || 'Non disponibile'}
          color="bg-blue-100 text-blue-600"
        />

        {userData?.telefono && (
          <InfoCard
            icon={Phone}
            label="Telefono"
            value={userData.telefono}
            color="bg-green-100 text-green-600"
          />
        )}

        {userData?.matricola && (
          <InfoCard
            icon={Shield}
            label="Matricola"
            value={userData.matricola}
            color="bg-purple-100 text-purple-600"
          />
        )}
      </div>

      {(userData?.data_assunzione || userData?.tipo_contratto) && (
        <ContractInfo userData={userData} />
      )}

      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full h-12 text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Esci
      </Button>

      <p className="text-center text-xs text-gray-400 pb-4">
        AppTVN Mobile v1.0.0
      </p>
    </div>
  );
}
