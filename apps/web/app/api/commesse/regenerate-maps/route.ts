import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';

// 🔒 SECURITY #66: Google Maps Quota Tracking
// NOTA: Questo endpoint usa Google Maps Static API che ha limiti di quota:
// - Free tier: 25,000 requests/day
// - Rate limit implementato: 100 req/min per utente
// - Monitoraggio consigliato: Google Cloud Console > APIs & Services > Quotas
// - Costi oltre quota: $2 per 1000 requests
// TODO: Implementare contatore database per tracciare chiamate giornaliere
// TODO: Aggiungere alert quando si raggiunge 80% della quota

export async function POST() {
  return withAuth(async (context) => {
    try {
      // 🔒 PERFORMANCE & #66: Rate limit per evitare abuso Google Maps API quota
      const { success, reset } = await checkRateLimit(context.user.id, 'api');
      if (!success) {
        throw ApiErrors.rateLimitExceeded(Math.ceil((reset - Date.now()) / 1000));
      }

      const supabase = await createClient();

      // 🔒 PERFORMANCE #59: Pagination per non caricare tutto in memoria
      // TODO: Implementare pagination con limit/offset per tenant con 10k+ commesse
      // Esempio: .range(offset, offset + limit - 1)

      // 🔒 PERFORMANCE #64: Caching per evitare rigenerazione
      // TODO: Salvare map URLs in DB con cache expiry (es. 7 giorni)
      // Rigenera solo se indirizzo cambiato o cache scaduta

      // Ottieni tutte le commesse del tenant che hanno un indirizzo
      const { data: commesse, error: commesseError } = await supabase
        .from('commesse')
        .select('id, nome_commessa, via, civico, cap, citta, provincia')
        .eq('tenant_id', context.tenant.tenant_id)
        .not('via', 'is', null)
        .limit(1000); // 🔒 PERFORMANCE #59: Limit temporaneo per prevenire OOM

      if (commesseError) throw commesseError;

      if (!commesse || commesse.length === 0) {
        return NextResponse.json({
          message: 'Nessuna commessa con indirizzo trovata',
          count: 0
        });
      }

      type CommessaAddress = {
        nome_commessa?: string | null;
        via?: string | null;
        civico?: string | null;
        cap?: string | null;
        citta?: string | null;
        provincia?: string | null;
      };

      // 🔒 SECURITY #60: Sanitizza indirizzo per prevenire injection in Google Maps URL
      const sanitizeAddressField = (field: string | null | undefined): string => {
        if (!field) return '';
        // Rimuovi caratteri potenzialmente pericolosi per URL
        return field
          .replace(/[<>'"]/g, '') // HTML/JS injection
          .replace(/[&|;$`\\]/g, '') // Command injection
          .trim();
      };

      // Funzione per costruire l'indirizzo
      const buildAddress = (commessa: CommessaAddress) => {
        const parts: string[] = [];
        if (commessa.via) parts.push(sanitizeAddressField(commessa.via));
        if (commessa.civico) parts.push(sanitizeAddressField(commessa.civico));
        if (commessa.cap) parts.push(sanitizeAddressField(commessa.cap));
        if (commessa.citta) parts.push(sanitizeAddressField(commessa.citta));
        if (commessa.provincia) parts.push(sanitizeAddressField(commessa.provincia));
        return parts.filter(p => p.length > 0).join(', ');
      };

      // Funzione per generare URL mappa statica
      const generateStaticMapUrl = (commessa: CommessaAddress) => {
        const address = buildAddress(commessa);
        if (!address) return null;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
        if (!apiKey) return null;

        const center = encodeURIComponent(address);
        const zoom = 14;
        const size = '200x200';
        const scale = 2;
        const maptype = 'roadmap';
        const markers = `color:red%7C${center}`;
        const style = 'style=feature:poi|visibility:off&style=feature:transit|visibility:off';

        return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=${maptype}&${style}&markers=${markers}&key=${apiKey}`;
      };

      // 🔒 SECURITY #58 & #62: NON esporre API key + sanitizza nome per XSS
      // Genera info per tutte le commesse con indirizzo (senza mapUrl che contiene API key)
      const mapInfo = commesse.map(commessa => {
        const address = buildAddress(commessa);

        // 🔒 SECURITY #62: Sanitizza nome_commessa per prevenire XSS se riflesso in UI
        const safeName = (commessa.nome_commessa || 'Senza nome')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');

        return {
          id: commessa.id,
          nome: safeName,
          indirizzo: address,
          hasAddress: !!(commessa.via || commessa.citta),
          // Segnala solo se la mappa può essere generata, ma non espone l'URL con la chiave
          canGenerateMap: !!address && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        };
      }).filter(info => info.hasAddress);

      // 🔒 PERFORMANCE #63: Timeout handling per Google Maps API
      // TODO: Implementare timeout con AbortController se si chiama realmente Google API
      // Esempio: const controller = new AbortController();
      //          setTimeout(() => controller.abort(), 5000); // 5s timeout

      // 🔒 OBSERVABILITY #67 & #68: Monitoring Google Maps API usage
      console.debug('[Google Maps] API call tracked:', {
        tenantId: context.tenant.tenant_id,
        userId: context.user.id,
        commesseCount: mapInfo.length,
        timestamp: new Date().toISOString(),
      });

      // TODO #67: Implementare contatore database per quota monitoring
      // Example: await supabase.from('google_maps_usage').insert({ tenant_id, call_count: mapInfo.length })

      return NextResponse.json({
        success: true,
        message: `Trovate ${mapInfo.length} commesse con indirizzi validi`,
        count: mapInfo.length,
        commesse: mapInfo,
        info: 'Le mappe vengono generate client-side usando la chiave API configurata nel frontend.'
      });

    } catch (error) {
      // 🔒 OBSERVABILITY #68: Log Google Maps API errors per troubleshooting
      console.error('[Google Maps] API error:', {
        tenantId: context.tenant.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return handleApiError(error, 'POST /api/commesse/regenerate-maps');
    }
  });
}
