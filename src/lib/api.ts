/** API client for Vainilla & Descanso CRM (PWA) */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper for all CRM API endpoints.
 * Hits Next.js Route Handlers at /api/{endpoint} with cache: 'no-store' to guarantee fresh data.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, body);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as any);
}

/** Typed endpoint catalog */
export const API = {
  rooms:         'rooms',
  reservations:  'reservations',
  guests:        'guests',
  products:      'products',
  posSales:      'pos-sales',
  roomCharges:   'room-charges',
  feedback:      'feedback',
  settings:      'settings',
  notifications: 'notifications',
} as const;
