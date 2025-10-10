'use client';

import { X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { toast } from 'sonner';

type Cliente = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  tipologia_settore: string;
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  forma_giuridica_dettaglio?: string;
  codice_fiscale?: string;
  partita_iva?: string;
  ateco?: string;
  rea?: string;
  telefono?: string;
  fax?: string;
  pec?: string;
  email?: string;
  website?: string;
  sede_legale_via?: string;
  sede_legale_civico?: string;
  sede_legale_cap?: string;
  sede_legale_citta?: string;
  sede_legale_provincia?: string;
  sede_legale_nazione?: string;
  sede_operativa_diversa?: boolean;
  sede_operativa_via?: string;
  sede_operativa_civico?: string;
  sede_operativa_cap?: string;
  sede_operativa_citta?: string;
  sede_operativa_provincia?: string;
  sede_operativa_nazione?: string;
  modalita_pagamento_preferita?: string;
  iban?: string;
  aliquota_iva_predefinita?: number;
  codice_sdi?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
};

interface InfoClienteModalProps {
  cliente: Cliente;
  onClose: () => void;
}

export function InfoClienteModal({ cliente, onClose }: InfoClienteModalProps) {
  const isPersonaFisica = cliente.forma_giuridica === 'persona_fisica';

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiato!`);
  };

  const InfoField = ({ label, value, copyable = false }: { label: string; value?: string | number | null; copyable?: boolean }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium">{value}</p>
          {copyable && (
            <button
              onClick={() => handleCopy(value.toString(), label)}
              className="p-1 rounded hover:bg-emerald-50 transition-colors"
              title={`Copia ${label}`}
            >
              <Copy className="h-4 w-4 text-emerald-600" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border-2 border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-4xl mx-auto bg-background rounded-xl border-2 border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b-2 border-border p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              {isPersonaFisica
                ? `${cliente.cognome || ''} ${cliente.nome || ''}`.trim()
                : cliente.ragione_sociale || 'N/A'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isPersonaFisica ? 'Persona Fisica' : 'Persona Giuridica'} • {cliente.tipologia_settore}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="rounded-full h-10 w-10 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dati Generali */}
          <Section title="Dati Generali">
            <InfoField label="Forma Giuridica" value={isPersonaFisica ? 'Persona Fisica' : 'Persona Giuridica'} />
            <InfoField label="Tipologia Settore" value={cliente.tipologia_settore} />
            {isPersonaFisica ? (
              <>
                <InfoField label="Nome" value={cliente.nome} />
                <InfoField label="Cognome" value={cliente.cognome} />
              </>
            ) : (
              <>
                <InfoField label="Ragione Sociale" value={cliente.ragione_sociale} />
                <InfoField label="Forma Giuridica Dettaglio" value={cliente.forma_giuridica_dettaglio} />
              </>
            )}
          </Section>

          {/* Identificativi Fiscali */}
          {(cliente.codice_fiscale || cliente.partita_iva || cliente.ateco || cliente.rea) && (
            <Section title="Identificativi Fiscali">
              <InfoField label="Codice Fiscale" value={cliente.codice_fiscale} copyable />
              <InfoField label="Partita IVA" value={cliente.partita_iva} copyable />
              <InfoField label="Codice ATECO" value={cliente.ateco} copyable />
              <InfoField label="REA" value={cliente.rea} copyable />
            </Section>
          )}

          {/* Contatti */}
          {(cliente.telefono || cliente.fax || cliente.email || cliente.pec || cliente.website) && (
            <Section title="Contatti">
              <InfoField label="Telefono" value={cliente.telefono} copyable />
              <InfoField label="Fax" value={cliente.fax} copyable />
              <InfoField label="Email" value={cliente.email} copyable />
              <InfoField label="PEC" value={cliente.pec} copyable />
              <InfoField label="Website" value={cliente.website} copyable />
            </Section>
          )}

          {/* Sede Legale / Residenza */}
          {(cliente.sede_legale_via || cliente.sede_legale_citta) && (
            <Section title={isPersonaFisica ? 'Indirizzo Residenza' : 'Indirizzo Sede Legale'}>
              <InfoField label="Via" value={cliente.sede_legale_via} />
              <InfoField label="Civico" value={cliente.sede_legale_civico} />
              <InfoField label="CAP" value={cliente.sede_legale_cap} />
              <InfoField label="Città" value={cliente.sede_legale_citta} />
              <InfoField label="Provincia" value={cliente.sede_legale_provincia} />
              <InfoField label="Nazione" value={cliente.sede_legale_nazione} />
            </Section>
          )}

          {/* Sede Operativa */}
          {cliente.sede_operativa_diversa && (cliente.sede_operativa_via || cliente.sede_operativa_citta) && (
            <Section title="Indirizzo Sede Operativa">
              <InfoField label="Via" value={cliente.sede_operativa_via} />
              <InfoField label="Civico" value={cliente.sede_operativa_civico} />
              <InfoField label="CAP" value={cliente.sede_operativa_cap} />
              <InfoField label="Città" value={cliente.sede_operativa_citta} />
              <InfoField label="Provincia" value={cliente.sede_operativa_provincia} />
              <InfoField label="Nazione" value={cliente.sede_operativa_nazione} />
            </Section>
          )}

          {/* Dati Amministrativi */}
          {(cliente.modalita_pagamento_preferita || cliente.iban || cliente.aliquota_iva_predefinita || cliente.codice_sdi) && (
            <Section title="Dati Amministrativi">
              <InfoField label="Modalità Pagamento Preferita" value={cliente.modalita_pagamento_preferita} />
              <InfoField label="IBAN" value={cliente.iban} copyable />
              <InfoField
                label="Aliquota IVA Predefinita"
                value={cliente.aliquota_iva_predefinita ? `${cliente.aliquota_iva_predefinita}%` : undefined}
              />
              <InfoField label="Codice SDI" value={cliente.codice_sdi} copyable />
            </Section>
          )}

          {/* Note */}
          {cliente.note && (
            <div className="rounded-xl border-2 border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Note</h3>
              <p className="text-sm whitespace-pre-wrap">{cliente.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t-2 border-border p-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Chiudi
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
