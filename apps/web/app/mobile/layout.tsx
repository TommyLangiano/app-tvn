'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Calendar, FileText, User } from 'lucide-react';
import { BottomNav } from '@/components/mobile/BottomNav';
import { FABMenu } from '@/components/mobile/FABMenu';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get user role
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('custom_role_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenant?.custom_role_id) {
        toast.error('Accesso non autorizzato');
        router.push('/dashboard');
        return;
      }

      // Get role details
      const { data: role } = await supabase
        .from('custom_roles')
        .select('system_role_key')
        .eq('id', userTenant.custom_role_id)
        .single();

      // Only allow dipendente role
      if (role?.system_role_key !== 'dipendente') {
        toast.error('Questa area è riservata ai dipendenti');
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking user role:', error);
      router.push('/sign-in');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-500">Caricamento...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { icon: Home, label: 'Home', href: '/mobile/home' },
    { icon: Calendar, label: 'Presenze', href: '/mobile/presenze' },
    { icon: User, label: 'Placeholder', href: '#' }, // Placeholder per FAB
    { icon: FileText, label: 'Richieste', href: '/mobile/richieste' },
    { icon: User, label: 'Profilo', href: '/mobile/profilo' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <MobileHeader title="AppTVN" showNotifications />

      {/* Main Content - with bottom padding for nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav items={navItems} onFabClick={() => setFabOpen(true)} />

      {/* FAB Menu */}
      <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(false)} />
    </div>
  );
}
