'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Building2, Wrench, Tag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImpostazioniGenerali } from '@/components/features/impostazioni/ImpostazioniGenerali';
import { ImpostazioniAzienda } from '@/components/features/impostazioni/ImpostazioniAzienda';
import { ImpostazioniUtilita } from '@/components/features/impostazioni/ImpostazioniUtilita';
import SettoriPage from './settori/page';

type TabType = 'generali' | 'azienda' | 'settori' | 'utilita';

function ImpostazioniPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('generali');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && (tab === 'generali' || tab === 'azienda' || tab === 'settori' || tab === 'utilita')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/impostazioni?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Tabs Navigazione */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)} className="space-y-6">
        <TabsList className="w-full justify-between h-auto bg-transparent border-b border-border rounded-none p-0 gap-0">
          <TabsTrigger
            value="generali"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Generali</span>
            <span className="sm:hidden">Gen.</span>
          </TabsTrigger>
          <TabsTrigger
            value="azienda"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Azienda</span>
            <span className="sm:hidden">Azienda</span>
          </TabsTrigger>
          <TabsTrigger
            value="settori"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Settori</span>
            <span className="sm:hidden">Set.</span>
          </TabsTrigger>
          <TabsTrigger
            value="utilita"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Utilità</span>
            <span className="sm:hidden">Util.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generali" className="mt-6">
          <ImpostazioniGenerali />
        </TabsContent>

        <TabsContent value="azienda" className="mt-6">
          <ImpostazioniAzienda />
        </TabsContent>

        <TabsContent value="settori" className="mt-6">
          <SettoriPage />
        </TabsContent>

        <TabsContent value="utilita" className="mt-6">
          <ImpostazioniUtilita />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ImpostazioniPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96">Caricamento...</div>}>
      <ImpostazioniPageContent />
    </Suspense>
  );
}
