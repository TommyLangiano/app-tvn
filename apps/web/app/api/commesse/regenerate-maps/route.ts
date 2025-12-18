import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST() {
  return withAuth(async (context) => {
    try {
      // 🔒 PERFORMANCE: Rate limit per evitare abuso Google Maps API quota
      const { success, reset } = await checkRateLimit(context.user.id, 'api');
      if (!success) {
        throw ApiErrors.rateLimitExceeded(Math.ceil((reset - Date.now()) / 1000));
      }

      const supabase = await createClient();

      // Ottieni tutte le commesse del tenant che hanno un indirizzo
      const { data: commesse, error: commesseError } = await supabase
        .from('commesse')
        .select('id, nome_commessa, via, civico, cap, citta, provincia')
        .eq('tenant_id', context.tenant.tenant_id)
        .not('via', 'is', null);

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

      // Funzione per costruire l'indirizzo
      const buildAddress = (commessa: CommessaAddress) => {
        const parts: string[] = [];
        if (commessa.via) parts.push(commessa.via);
        if (commessa.civico) parts.push(commessa.civico);
        if (commessa.cap) parts.push(commessa.cap);
        if (commessa.citta) parts.push(commessa.citta);
        if (commessa.provincia) parts.push(commessa.provincia);
        return parts.join(', ');
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

      // 🔒 SECURITY #58: NON esporre API key nella response
      // Genera info per tutte le commesse con indirizzo (senza mapUrl che contiene API key)
      const mapInfo = commesse.map(commessa => {
        const address = buildAddress(commessa);
        return {
          id: commessa.id,
          nome: commessa.nome_commessa || 'Senza nome',
          indirizzo: address,
          hasAddress: !!(commessa.via || commessa.citta),
          // Segnala solo se la mappa può essere generata, ma non espone l'URL con la chiave
          canGenerateMap: !!address && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        };
      }).filter(info => info.hasAddress);

      return NextResponse.json({
        success: true,
        message: `Trovate ${mapInfo.length} commesse con indirizzi validi`,
        count: mapInfo.length,
        commesse: mapInfo,
        info: 'Le mappe vengono generate client-side usando la chiave API configurata nel frontend.'
      });

    } catch (error) {
      return handleApiError(error, 'POST /api/commesse/regenerate-maps');
    }
  });
}
