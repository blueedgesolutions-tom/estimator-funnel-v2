import { NextRequest, NextResponse } from 'next/server';
import type { AddressData } from '@/lib/types';

// ─────────────────────────────────────────────────────────
// Google Place Details proxy
// Resolves a place_id to full coordinates and address
// components (street, city, state, zip, county, country).
// ─────────────────────────────────────────────────────────

type GComponent = { long_name: string; short_name: string; types: string[] };

function extractComponent(components: GComponent[], type: string, short = false): string {
  const comp = components.find((c) => c.types.includes(type));
  return comp ? (short ? comp.short_name : comp.long_name) : '';
}

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id');
  if (!placeId) {
    return NextResponse.json({ error: 'place_id is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 503 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'formatted_address,geometry,address_components');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('[geocode-place] API error:', data.status);
      return NextResponse.json({ error: data.status }, { status: 502 });
    }

    const result = data.result;
    const components: GComponent[] = result.address_components ?? [];

    const address: AddressData = {
      formatted_address: result.formatted_address,
      place_id: placeId,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      street_number: extractComponent(components, 'street_number'),
      route:         extractComponent(components, 'route'),
      locality:      extractComponent(components, 'locality') ||
                     extractComponent(components, 'sublocality'),
      administrative_area_level_1: extractComponent(components, 'administrative_area_level_1', true),
      postal_code:   extractComponent(components, 'postal_code'),
      county:        extractComponent(components, 'administrative_area_level_2'),
      country:       extractComponent(components, 'country', true),
    };

    const response = NextResponse.json({ address });
    // Cache geocode results — a place_id always resolves to the same location
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return response;
  } catch (err) {
    console.error('[geocode-place] Fetch error:', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
