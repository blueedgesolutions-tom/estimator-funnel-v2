import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────
// Basic US phone validation
//
// Performs structural checks first (length, valid area code).
// If NUMVERIFY_API_KEY is set, delegates to numverify for a
// live carrier lookup. Falls back gracefully if the service
// is unavailable.
// ─────────────────────────────────────────────────────────

const INVALID_AREA_CODES = new Set([
  '000', '100', '200', '300', '400', '500', '600', '700', '800', '900',
  '555', // generic placeholder code
]);

function isStructurallyValid(digits: string): boolean {
  if (digits.length !== 10) return false;
  const areaCode = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  // Area codes cannot start with 0 or 1
  if (areaCode[0] === '0' || areaCode[0] === '1') return false;
  // Exchange codes cannot start with 0 or 1
  if (exchange[0] === '0' || exchange[0] === '1') return false;
  // Block known invalid area codes
  if (INVALID_AREA_CODES.has(areaCode)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 });
  }

  const digits = (body.phone ?? '').replace(/\D/g, '');

  // Structural check
  if (!isStructurallyValid(digits)) {
    return NextResponse.json({ valid: false });
  }

  // Optional: live carrier lookup via numverify
  const apiKey = process.env.NUMVERIFY_API_KEY;
  if (apiKey) {
    try {
      const url = `http://apilayer.net/api/validate?access_key=${apiKey}&number=1${digits}&country_code=US&format=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();

      if (data.valid === false) {
        return NextResponse.json({ valid: false });
      }
    } catch {
      // Service unreachable — allow through with api-error signal
      return NextResponse.json({ valid: true, apiError: true });
    }
  }

  return NextResponse.json({ valid: true });
}
