import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────
// Google Places Autocomplete proxy
// Keeps the API key server-side and adds caching headers.
// ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input');
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { predictions: [], error: 'Places API not configured' },
      { status: 503 }
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('types', 'address');
  url.searchParams.set('components', 'country:us');  // adjust per market
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[places-autocomplete] API error:', data.status, data.error_message);
      return NextResponse.json({ predictions: [] }, { status: 502 });
    }

    const predictions = (data.predictions ?? []).map((p: Record<string, unknown>) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: (p.structured_formatting as Record<string, string>)?.main_text ?? p.description,
      secondary_text: (p.structured_formatting as Record<string, string>)?.secondary_text ?? '',
    }));

    const response = NextResponse.json({ predictions });
    // Short cache — predictions change with input
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (err) {
    console.error('[places-autocomplete] Fetch error:', err);
    return NextResponse.json({ predictions: [] }, { status: 502 });
  }
}
