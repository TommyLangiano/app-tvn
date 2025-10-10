'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type FormaGiuridica = 'persona_fisica' | 'persona_giuridica';

export default function ModificaFornitorePage() {
  const router = useRouter();
  const params = useParams();
  const FornitoreId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');

  // Form data
  const [formaGiuridica, setFormaGiuridica] = useState<FormaGiuridica>('persona_fisica');
  const [tipologiaSettore, setTipologiaSettore] = useState('');

  // Persona Fisica
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');

  // Persona Giuridica
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [formaGiuridicaDettaglio, setFormaGiuridicaDettaglio] = useState('');

  // Identificativi Fiscali
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [ateco, setAteco] = useState('');
  const [rea, setRea] = useState('');

  // Contatti
  const [telefono, setTelefono] = useState('');
  const [fax, setFax] = useState('');
  const [pec, setPec] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Sede Legale
  const [sedeLegaleVia, setSedeLegaleVia] = useState('');
  const [sedeLegaleCivico, setSedeLegaleCivico] = useState('');
  const [sedeLegaleCap, setSedeLegaleCap] = useState('');
  const [sedeLegaleCitta, setSedeLegaleCitta] = useState('');
  const [sedeLegaleProvincia, setSedeLegaleProvincia] = useState('');
  const [sedeLegaleNazione, setSedeLegaleNazione] = useState('Italia');

  // Sede Operativa
  const [sedeOperativaDiversa, setSedeOperativaDiversa] = useState(false);
  const [sedeOperativaVia, setSedeOperativaVia] = useState('');
  const [sedeOperativaCivico, setSedeOperativaCivico] = useState('');
  const [sedeOperativaCap, setSedeOperativaCap] = useState('');
  const [sedeOperativaCitta, setSedeOperativaCitta] = useState('');
  const [sedeOperativaProvincia, setSedeOperativaProvincia] = useState('');
  const [sedeOperativaNazione, setSedeOperativaNazione] = useState('Italia');

  // Dati Amministrativi
  const [modalitaPagamento, setModalitaPagamento] = useState('');
  const [iban, setIban] = useState('');
  const [aliquotaIva, setAliquotaIva] = useState('');
  const [codiceSdi, setCodiceSdi] = useState('');

  // Note
  const [note, setNote] = useState('');

  useEffect(() => {
    loadFornitoreData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFornitoreData = async () => {
    try {
      setLoadingData(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenants) {
        setTenantId(userTenants.tenant_id);
      }

      // Load Fornitore data
      const { data: Fornitore, error } = await supabase
        .from('fornitori')
        .select('*')
        .eq('id', FornitoreId)
        .single();

      if (error) throw error;

      if (Fornitore) {
        // Set all form fields with existing data
        setFormaGiuridica(Fornitore.forma_giuridica);
        setTipologiaSettore(Fornitore.tipologia_settore || '');
        setNome(Fornitore.nome || '');
        setCognome(Fornitore.cognome || '');
        setRagioneSociale(Fornitore.ragione_sociale || '');
        setFormaGiuridicaDettaglio(Fornitore.forma_giuridica_dettaglio || '');
        setCodiceFiscale(Fornitore.codice_fiscale || '');
        setPartitaIva(Fornitore.partita_iva || '');
        setAteco(Fornitore.ateco || '');
        setRea(Fornitore.rea || '');
        setTelefono(Fornitore.telefono || '');
        setFax(Fornitore.fax || '');
        setPec(Fornitore.pec || '');
        setEmail(Fornitore.email || '');
        setWebsite(Fornitore.website || '');
        setSedeLegaleVia(Fornitore.sede_legale_via || '');
        setSedeLegaleCivico(Fornitore.sede_legale_civico || '');
        setSedeLegaleCap(Fornitore.sede_legale_cap || '');
        setSedeLegaleCitta(Fornitore.sede_legale_citta || '');
        setSedeLegaleProvincia(Fornitore.sede_legale_provincia || '');
        setSedeLegaleNazione(Fornitore.sede_legale_nazione || 'Italia');
        setSedeOperativaDiversa(Fornitore.sede_operativa_diversa || false);
        setSedeOperativaVia(Fornitore.sede_operativa_via || '');
        setSedeOperativaCivico(Fornitore.sede_operativa_civico || '');
        setSedeOperativaCap(Fornitore.sede_operativa_cap || '');
        setSedeOperativaCitta(Fornitore.sede_operativa_citta || '');
        setSedeOperativaProvincia(Fornitore.sede_operativa_provincia || '');
        setSedeOperativaNazione(Fornitore.sede_operativa_nazione || 'Italia');
        setModalitaPagamento(Fornitore.modalita_pagamento_preferita || '');
        setIban(Fornitore.iban || '');
        setAliquotaIva(Fornitore.aliquota_iva_predefinita?.toString() || '');
        setCodiceSdi(Fornitore.codice_sdi || '');
        setNote(Fornitore.note || '');
      }
    } catch (error) {
      console.error('Error loading Fornitore:', error);
      toast.error('Errore nel caricamento del Fornitore');
      router.push('/anagrafica?tab=fornitori');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formaGiuridica || !tipologiaSettore) {
      toast.error('Forma Giuridica e Tipologia Settore sono obbligatori');
      return;
    }

    if (formaGiuridica === 'persona_fisica' && (!nome || !cognome)) {
      toast.error('Nome e Cognome sono obbligatori per Persona Fisica');
      return;
    }

    if (formaGiuridica === 'persona_giuridica' && !ragioneSociale) {
      toast.error('Ragione Sociale è obbligatoria per Persona Giuridica');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (!tenantId) {
        toast.error('Errore: Tenant ID non trovato');
        return;
      }

      const FornitoreData = {
        forma_giuridica: formaGiuridica,
        tipologia_settore: tipologiaSettore,

        // Persona Fisica
        ...(formaGiuridica === 'persona_fisica' && {
          nome,
          cognome,
        }),

        // Persona Giuridica
        ...(formaGiuridica === 'persona_giuridica' && {
          ragione_sociale: ragioneSociale,
          forma_giuridica_dettaglio: formaGiuridicaDettaglio || null,
        }),

        // Identificativi Fiscali
        codice_fiscale: codiceFiscale || null,
        partita_iva: partitaIva || null,
        ...(formaGiuridica === 'persona_giuridica' && {
          ateco: ateco || null,
          rea: rea || null,
        }),

        // Contatti
        telefono: telefono || null,
        fax: fax || null,
        pec: pec || null,
        email: email || null,
        website: website || null,

        // Sede Legale
        sede_legale_via: sedeLegaleVia || null,
        sede_legale_civico: sedeLegaleCivico || null,
        sede_legale_cap: sedeLegaleCap || null,
        sede_legale_citta: sedeLegaleCitta || null,
        sede_legale_provincia: sedeLegaleProvincia || null,
        sede_legale_nazione: sedeLegaleNazione || null,

        // Sede Operativa
        ...(formaGiuridica === 'persona_giuridica' && {
          sede_operativa_diversa: sedeOperativaDiversa,
          sede_operativa_via: sedeOperativaDiversa ? (sedeOperativaVia || null) : null,
          sede_operativa_civico: sedeOperativaDiversa ? (sedeOperativaCivico || null) : null,
          sede_operativa_cap: sedeOperativaDiversa ? (sedeOperativaCap || null) : null,
          sede_operativa_citta: sedeOperativaDiversa ? (sedeOperativaCitta || null) : null,
          sede_operativa_provincia: sedeOperativaDiversa ? (sedeOperativaProvincia || null) : null,
          sede_operativa_nazione: sedeOperativaDiversa ? (sedeOperativaNazione || null) : null,
        }),

        // Dati Amministrativi
        modalita_pagamento_preferita: modalitaPagamento || null,
        iban: iban || null,
        aliquota_iva_predefinita: aliquotaIva ? parseFloat(aliquotaIva) : null,
        codice_sdi: codiceSdi || null,

        // Note
        note: note || null,
      };

      const { error } = await supabase
        .from('fornitori')
        .update(FornitoreData)
        .eq('id', FornitoreId);

      if (error) throw error;

      toast.success('Fornitore aggiornato con successo');
      router.push('/anagrafica?tab=fornitori');
    } catch (error) {
      console.error('Error updating Fornitore:', error);
      toast.error('Errore durante l\'aggiornamento del Fornitore');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb pageName="Modifica Fornitore" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 border-2 border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Modifica Fornitore</h2>
          <p className="text-muted-foreground">
            Aggiorna i dati del Fornitore
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sezione 1 - DATI GENERALI */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Dati Generali</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Forma Giuridica */}
            <div className="space-y-2">
              <Label htmlFor="forma_giuridica">
                Forma Giuridica <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formaGiuridica}
                onValueChange={(value: FormaGiuridica) => setFormaGiuridica(value)}
              >
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
                  <SelectItem value="persona_giuridica">Persona Giuridica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipologia Settore */}
            <div className="space-y-2">
              <Label htmlFor="tipologia_settore">
                Tipologia Settore <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tipologia_settore"
                value={tipologiaSettore}
                onChange={(e) => setTipologiaSettore(e.target.value)}
                className="border-2 border-border"
                required
              />
            </div>

            {/* Campi Persona Fisica */}
            {formaGiuridica === 'persona_fisica' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="border-2 border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cognome">
                    Cognome <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cognome"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    className="border-2 border-border"
                    required
                  />
                </div>
              </>
            )}

            {/* Campi Persona Giuridica */}
            {formaGiuridica === 'persona_giuridica' && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ragione_sociale">
                    Ragione Sociale <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ragione_sociale"
                    value={ragioneSociale}
                    onChange={(e) => setRagioneSociale(e.target.value)}
                    className="border-2 border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forma_giuridica_dettaglio">
                    Forma Giuridica Dettaglio
                  </Label>
                  <Input
                    id="forma_giuridica_dettaglio"
                    value={formaGiuridicaDettaglio}
                    onChange={(e) => setFormaGiuridicaDettaglio(e.target.value)}
                    className="border-2 border-border"
                    placeholder="es. S.r.l., S.p.A., S.n.c."
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sezione 2 - IDENTIFICATIVI FISCALI */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Identificativi Fiscali</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
              <Input
                id="codice_fiscale"
                value={codiceFiscale}
                onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                className="border-2 border-border"
                maxLength={16}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partita_iva">Partita IVA</Label>
              <Input
                id="partita_iva"
                value={partitaIva}
                onChange={(e) => setPartitaIva(e.target.value)}
                className="border-2 border-border"
                maxLength={11}
              />
            </div>

            {formaGiuridica === 'persona_giuridica' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ateco">ATECO</Label>
                  <Input
                    id="ateco"
                    value={ateco}
                    onChange={(e) => setAteco(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rea">REA</Label>
                  <Input
                    id="rea"
                    value={rea}
                    onChange={(e) => setRea(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sezione 3 - CONTATTI */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Contatti</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input
                id="fax"
                value={fax}
                onChange={(e) => setFax(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pec">PEC</Label>
              <Input
                id="pec"
                type="email"
                value={pec}
                onChange={(e) => setPec(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="border-2 border-border"
                placeholder="https://"
              />
            </div>
          </div>
        </div>

        {/* Sezione 4 - SEDE LEGALE / RESIDENZA */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {formaGiuridica === 'persona_fisica' ? 'Indirizzo Residenza' : 'Indirizzo Sede Legale'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sede_legale_via">Via</Label>
              <Input
                id="sede_legale_via"
                value={sedeLegaleVia}
                onChange={(e) => setSedeLegaleVia(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_legale_civico">Civico</Label>
              <Input
                id="sede_legale_civico"
                value={sedeLegaleCivico}
                onChange={(e) => setSedeLegaleCivico(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_legale_cap">CAP</Label>
              <Input
                id="sede_legale_cap"
                value={sedeLegaleCap}
                onChange={(e) => setSedeLegaleCap(e.target.value)}
                className="border-2 border-border"
                maxLength={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_legale_citta">Città</Label>
              <Input
                id="sede_legale_citta"
                value={sedeLegaleCitta}
                onChange={(e) => setSedeLegaleCitta(e.target.value)}
                className="border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_legale_provincia">Provincia</Label>
              <Input
                id="sede_legale_provincia"
                value={sedeLegaleProvincia}
                onChange={(e) => setSedeLegaleProvincia(e.target.value.toUpperCase())}
                className="border-2 border-border"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_legale_nazione">Nazione</Label>
              <Input
                id="sede_legale_nazione"
                value={sedeLegaleNazione}
                onChange={(e) => setSedeLegaleNazione(e.target.value)}
                className="border-2 border-border"
              />
            </div>
          </div>
        </div>

        {/* Sezione 5 - SEDE OPERATIVA (solo Persona Giuridica) */}
        {formaGiuridica === 'persona_giuridica' && (
          <div className="rounded-xl border-2 border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Indirizzo Sede Operativa</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sedeOperativaDiversa}
                  onChange={(e) => setSedeOperativaDiversa(e.target.checked)}
                  className="h-5 w-5 rounded border-2 border-border cursor-pointer"
                />
                <span className="text-sm font-medium">La sede operativa è diversa</span>
              </label>
            </div>

            {sedeOperativaDiversa && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_via">Via</Label>
                  <Input
                    id="sede_operativa_via"
                    value={sedeOperativaVia}
                    onChange={(e) => setSedeOperativaVia(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_civico">Civico</Label>
                  <Input
                    id="sede_operativa_civico"
                    value={sedeOperativaCivico}
                    onChange={(e) => setSedeOperativaCivico(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_cap">CAP</Label>
                  <Input
                    id="sede_operativa_cap"
                    value={sedeOperativaCap}
                    onChange={(e) => setSedeOperativaCap(e.target.value)}
                    className="border-2 border-border"
                    maxLength={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_citta">Città</Label>
                  <Input
                    id="sede_operativa_citta"
                    value={sedeOperativaCitta}
                    onChange={(e) => setSedeOperativaCitta(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_provincia">Provincia</Label>
                  <Input
                    id="sede_operativa_provincia"
                    value={sedeOperativaProvincia}
                    onChange={(e) => setSedeOperativaProvincia(e.target.value.toUpperCase())}
                    className="border-2 border-border"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sede_operativa_nazione">Nazione</Label>
                  <Input
                    id="sede_operativa_nazione"
                    value={sedeOperativaNazione}
                    onChange={(e) => setSedeOperativaNazione(e.target.value)}
                    className="border-2 border-border"
                  />
                </div>
              </div>
            )}

            {!sedeOperativaDiversa && (
              <p className="text-sm text-muted-foreground">
                La sede operativa corrisponde alla sede legale
              </p>
            )}
          </div>
        )}

        {/* Sezione 6 - DATI AMMINISTRATIVI */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Dati Amministrativi</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="modalita_pagamento">Modalità di Pagamento Preferita</Label>
              <Select
                value={modalitaPagamento}
                onValueChange={setModalitaPagamento}
              >
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="Seleziona modalità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bonifico">Bonifico</SelectItem>
                  <SelectItem value="Contanti">Contanti</SelectItem>
                  <SelectItem value="Carta">Carta</SelectItem>
                  <SelectItem value="Assegno">Assegno</SelectItem>
                  <SelectItem value="RiBa">RiBa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliquota_iva">Aliquota IVA Predefinita</Label>
              <Select
                value={aliquotaIva}
                onValueChange={setAliquotaIva}
              >
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="Seleziona aliquota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="22">22%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                className="border-2 border-border"
                placeholder="IT00X0000000000000000000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codice_sdi">Codice SDI</Label>
              <Input
                id="codice_sdi"
                value={codiceSdi}
                onChange={(e) => setCodiceSdi(e.target.value.toUpperCase())}
                className="border-2 border-border"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Sezione 7 - NOTE */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Note e Gestione Interna</h3>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-2 border-border min-h-[120px]"
              placeholder="Inserisci eventuali note..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </div>
      </form>
    </div>
  );
}
