'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Building2 } from 'lucide-react';
import { ImpostazioniGenerali } from '@/components/features/impostazioni/ImpostazioniGenerali';
import { ImpostazioniAzienda } from '@/components/features/impostazioni/ImpostazioniAzienda';

type TabType = 'generali' | 'azienda';

function ImpostazioniPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('generali');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && (tab === 'generali' || tab === 'azienda')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/impostazioni?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-6">

      <div>
        <p className="text-muted-foreground mt-1">
          Gestisci le impostazioni del tuo account e della tua azienda
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="flex border-b-2 border-border">
          <button
            onClick={() => handleTabChange('generali')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 font-semibold transition-all duration-[450ms] ease-in-out ${
              activeTab === 'generali'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-600 border-b-4'
                : 'text-muted-foreground hover:bg-muted/20 border-b-4 border-transparent'
            }`}
          >
            <Settings className="h-5 w-5 transition-transform duration-[450ms] ease-in-out" />
            Generali
          </button>
          <button
            onClick={() => handleTabChange('azienda')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 font-semibold transition-all duration-[450ms] ease-in-out ${
              activeTab === 'azienda'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-600 border-b-4'
                : 'text-muted-foreground hover:bg-muted/20 border-b-4 border-transparent'
            }`}
          >
            <Building2 className="h-5 w-5 transition-transform duration-[450ms] ease-in-out" />
            Azienda
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'generali' && <ImpostazioniGenerali />}
          {activeTab === 'azienda' && <ImpostazioniAzienda />}
        </div>
      </div>
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
