/** API client for Vainilla & Descanso CRM (PWA) */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_API_KEY = 'vd_crm_secret_key_2026';

/**
 * Fetch wrapper for all CRM API endpoints.
 * Hits Next.js Route Handlers at /api/{endpoint} with credentials, API Key, and no-store policy.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = cleanEndpoint.startsWith('api/') ? `/${cleanEndpoint}` : `/api/${cleanEndpoint}`;

  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DEFAULT_API_KEY,
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
