/** API client for Vainilla & Descanso CRM (PWA) */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_API_KEY = 'vd_crm_secret_key_2026';
const LOCAL_STORAGE_CANCELLED_KEY = 'vd_cancelled_reservation_ids';

export function getCancelledReservationIdsFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CANCELLED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(id => String(id).trim().toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

export function registerCancelledReservationIdInStorage(...ids: (string | undefined | null)[]) {
  if (typeof window === 'undefined') return;
  try {
    const current = getCancelledReservationIdsFromStorage();
    for (const id of ids) {
      if (!id) continue;
      const clean = String(id).trim().toLowerCase();
      if (clean) current.add(clean);
    }
    localStorage.setItem(LOCAL_STORAGE_CANCELLED_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetch wrapper for all CRM API endpoints.
 * Hits Next.js Route Handlers at /api/{endpoint} with credentials, API Key, no-store policy,
 * and client-side tombstone persistence for Netlify serverless deployment.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = cleanEndpoint.startsWith('api/') ? `/${cleanEndpoint}` : `/api/${cleanEndpoint}`;

  const method = (options?.method || 'GET').toUpperCase();

  // If DELETE call on reservations endpoint, register tombstone in localStorage
  if (method === 'DELETE' && cleanEndpoint.includes('reservations')) {
    try {
      if (options?.body) {
        const parsedBody = JSON.parse(options.body as string);
        registerCancelledReservationIdInStorage(parsedBody.id, parsedBody.external_id, parsedBody.reservation_id);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

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
  const data = text ? JSON.parse(text) : (null as any);

  return data;
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
