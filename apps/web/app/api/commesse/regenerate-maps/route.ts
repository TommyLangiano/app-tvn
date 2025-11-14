import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Ottieni tenant dell'utente
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
    }

    // Ottieni tutte le commesse del tenant che hanno un indirizzo
    const { data: commesse, error: commesseError } = await supabase
      .from('commesse')
      .select('id, nome_commessa, via, civico, cap, citta, provincia')
      .eq('tenant_id', userTenant.tenant_id)
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

    // Genera info per tutte le commesse con indirizzo
    const mapInfo = commesse.map(commessa => ({
      id: commessa.id,
      nome: commessa.nome_commessa || 'Senza nome',
      indirizzo: buildAddress(commessa),
      mapUrl: generateStaticMapUrl(commessa),
      hasAddress: !!(commessa.via || commessa.citta)
    })).filter(info => info.hasAddress && info.mapUrl);

    return NextResponse.json({
      success: true,
      message: `Trovate ${mapInfo.length} commesse con indirizzi validi`,
      count: mapInfo.length,
      commesse: mapInfo,
      info: 'Le mappe vengono generate dinamicamente al caricamento della pagina. Verifica che la variabile NEXT_PUBLIC_GOOGLE_MAPS_API_KEY sia configurata correttamente.'
    });

  } catch (error) {
    console.error('Error regenerating maps:', error);
    return NextResponse.json(
      { error: 'Errore durante la rigenerazione delle mappe' },
      { status: 500 }
    );
  }
}
