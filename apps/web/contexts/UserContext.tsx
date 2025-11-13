'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserData {
  userId: string;
  email: string;
  fullName: string;
  firstName: string;
  role: string;
}

interface TenantData {
  tenantId: string;
  ragioneSociale: string;
  logoUrl?: string;
}

interface UserContextType {
  user: UserData | null;
  tenant: TenantData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  tenant: null,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    try {
      const supabase = createClient();

      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', authUser.id)
        .single();

      // Get user tenant and role
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', authUser.id)
        .single();

      if (!userTenant) {
        setUser(null);
        setTenant(null);
        setLoading(false);
        return;
      }

      // Get tenant profile
      const { data: tenantProfiles } = await supabase
        .from('tenant_profiles')
        .select('ragione_sociale, logo_url')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      const tenantProfile = tenantProfiles?.[0];

      // Set user data
      const fullName = profile?.full_name || authUser.email?.split('@')[0] || 'Utente';
      const firstName = fullName.split(' ')[0];

      setUser({
        userId: authUser.id,
        email: authUser.email || '',
        fullName,
        firstName,
        role: userTenant.role,
      });

      // Set tenant data
      setTenant({
        tenantId: userTenant.tenant_id,
        ragioneSociale: tenantProfile?.ragione_sociale || 'La Mia Azienda',
        logoUrl: tenantProfile?.logo_url,
      });

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const refresh = async () => {
    setLoading(true);
    await loadUserData();
  };

  return (
    <UserContext.Provider value={{ user, tenant, loading, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
