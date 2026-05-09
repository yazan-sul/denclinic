import { NextResponse } from 'next/server';

// Fallback rates relative to ILS (in case external API fails)
const FALLBACK_RATES: Record<string, number> = {
  ILS: 1,
  USD: 0.272,  // 1 ILS = 0.272 USD
  JOD: 0.193,  // 1 ILS = 0.193 JOD
  EUR: 0.250,  // 1 ILS = 0.250 EUR
};

// Simple in-memory cache (resets on server restart, ~1hr TTL)
let cachedRates: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const now = Date.now();

    // Return cache if fresh
    if (cachedRates && now - cacheTime < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: { rates: cachedRates, source: 'cache', updatedAt: new Date(cacheTime).toISOString() },
      });
    }

    // Fetch from frankfurter.app (free, no API key)
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=ILS&to=USD,JOD,EUR',
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { base: string; rates: Record<string, number> };

    const rates: Record<string, number> = {
      ILS: 1,
      USD: json.rates.USD ?? FALLBACK_RATES.USD,
      JOD: json.rates.JOD ?? FALLBACK_RATES.JOD,
      EUR: json.rates.EUR ?? FALLBACK_RATES.EUR,
    };

    // Update cache
    cachedRates = rates;
    cacheTime   = now;

    return NextResponse.json({
      success: true,
      data: { rates, source: 'live', updatedAt: new Date().toISOString() },
    });
  } catch {
    // Fallback to static rates
    return NextResponse.json({
      success: true,
      data: { rates: FALLBACK_RATES, source: 'fallback', updatedAt: new Date().toISOString() },
    });
  }
}
