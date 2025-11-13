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
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-xl font-bold">TVN</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Configurazione Iniziale</h1>
              <p className="text-sm text-muted">Completa i dati della tua azienda</p>
            </div>
          </div>

          {/* Steps Indicator */}
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li
                  key={step.name}
                  className={`relative ${stepIdx !== steps.length - 1 ? 'pr-20 flex-1' : ''}`}
                >
                  {/* Connector Line */}
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className="absolute top-5 left-12 right-0 h-0.5 bg-border"
                      aria-hidden="true"
                    >
                      <div
                        className={`h-full transition-all duration-500 ${
                          currentStep > step.id ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  )}

                  {/* Step Circle */}
                  <div className="relative flex items-center group">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
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
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </span>
                    <span
                      className={`ml-4 text-sm font-medium transition-colors ${
                        currentStep >= step.id ? 'text-foreground' : 'text-muted'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </div>
    </div>
  );
}
