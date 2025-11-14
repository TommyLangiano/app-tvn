'use client';

import { usePathname } from 'next/navigation';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, name: 'Dati Aziendali', path: '/onboarding/step-1' },
  { id: 2, name: 'Logo & Branding', path: '/onboarding/step-2' },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentStep = steps.findIndex(step => pathname?.includes(step.path)) + 1 || 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Header con Logo a Sinistra e Steps al Centro - Stessa Riga */}
          <div className="flex items-center justify-between">
            {/* Logo e Titolo - Sinistra */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground flex-shrink-0">
                <span className="text-xl font-bold">TVN</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Configurazione Iniziale</h1>
                <p className="text-sm text-muted">Completa i dati della tua azienda</p>
              </div>
            </div>

            {/* Steps Indicator - Centro */}
            <nav aria-label="Progress" className="flex-1 max-w-md ml-12">
              <ol className="flex items-start justify-center relative">
                {steps.map((step, stepIdx) => (
                  <li
                    key={step.name}
                    className="flex flex-col items-center relative flex-1"
                  >
                    {/* Step Circle con numero */}
                    <div className="relative z-10 mb-3">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          currentStep > step.id
                            ? 'border-primary bg-primary text-white'
                            : currentStep === step.id
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-background text-muted'
                        }`}
                      >
                        {currentStep > step.id ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span className="text-base font-semibold">{step.id}</span>
                        )}
                      </span>
                    </div>

                    {/* Nome dello step sotto */}
                    <span
                      className={`text-sm font-medium text-center transition-colors ${
                        currentStep >= step.id ? 'text-foreground' : 'text-muted'
                      }`}
                    >
                      {step.name}
                    </span>

                    {/* Connector Line - DOPO il primo step */}
                    {stepIdx < steps.length - 1 && (
                      <div
                        className="absolute top-6 left-1/2 w-full h-0.5 bg-border z-0"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-full transition-all duration-500 ${
                            currentStep > step.id ? 'bg-primary w-full' : 'bg-transparent w-0'
                          }`}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </div>
    </div>
  );
}
