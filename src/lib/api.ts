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
  const isBrowser = typeof window !== 'undefined';

  // Helper functions for localStorage
  function getLocalItem<R>(key: string, fallback: R): R {
    if (!isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setLocalItem<R>(key: string, value: R) {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  let parsedBody: any = null;
  if (options?.body) {
    try {
      parsedBody = JSON.parse(options.body as string);
    } catch {}
  }

  // If DELETE call on reservations endpoint, register tombstone in localStorage
  if (method === 'DELETE' && cleanEndpoint.includes('reservations')) {
    try {
      if (parsedBody) {
        registerCancelledReservationIdInStorage(parsedBody.id, parsedBody.external_id, parsedBody.reservation_id);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Intercept write operations to local cache immediately/locally
  if (isBrowser && method !== 'GET') {
    if (cleanEndpoint.includes('reservations')) {
      if (method === 'POST') {
        const checkIn = parsedBody.check_in || parsedBody.checkIn || (parsedBody.dates?.split(' - ')[0] ?? '');
        const checkOut = parsedBody.check_out || parsedBody.checkOut || (parsedBody.dates?.split(' - ')[1] ?? '');
        const localRes = {
          id: parsedBody.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          room_id: String(parsedBody.room_id || parsedBody.roomId || '101'),
          guest_id: parsedBody.guest_id || null,
          guest_name: parsedBody.guest_name || parsedBody.guestName || parsedBody.name || 'Huésped',
          check_in: checkIn,
          check_out: checkOut,
          dates: parsedBody.dates || `${checkIn} - ${checkOut}`,
          total_price: Number(parsedBody.total_price || parsedBody.totalPrice) || 0,
          notes: parsedBody.notes || null,
          payment_status: parsedBody.payment_status || parsedBody.paymentStatus || 'paid',
          status: parsedBody.status || 'Confirmed',
          external_id: parsedBody.external_id || parsedBody.reservation_id || parsedBody.id || null,
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_reservations', []);
        const idx = current.findIndex(r => r && (r.id === localRes.id || (localRes.external_id && r.external_id === localRes.external_id)));
        if (idx >= 0) {
          current[idx] = localRes;
        } else {
          current.push(localRes);
        }
        setLocalItem('vd_local_reservations', current);
      } else if (method === 'DELETE') {
        const delId = parsedBody?.id || parsedBody?.external_id || parsedBody?.reservation_id;
        if (delId) {
          registerCancelledReservationIdInStorage(delId);
          const current = getLocalItem<any[]>('vd_local_reservations', []);
          const filtered = current.filter(r => r && String(r.id).toLowerCase() !== String(delId).toLowerCase() && String(r.external_id).toLowerCase() !== String(delId).toLowerCase());
          setLocalItem('vd_local_reservations', filtered);
        }
      }
    } else if (cleanEndpoint.includes('rooms')) {
      if (method === 'PATCH' && parsedBody?.id && parsedBody?.status) {
        const roomId = String(parsedBody.id).trim();
        const status = parsedBody.status;
        const localStatuses = getLocalItem<Record<string, { status: string; _localOnly?: boolean }>>('vd_local_room_statuses', {});
        localStatuses[roomId] = { status, _localOnly: true };
        setLocalItem('vd_local_room_statuses', localStatuses);

        // Update local rooms array
        const currentRooms = getLocalItem<any[]>('vd_local_rooms', []);
        const updatedRooms = currentRooms.map(r => r && String(r.id) === roomId ? { ...r, status } : r);
        setLocalItem('vd_local_rooms', updatedRooms);

        // Clear active reservation today if room status is available
        if (status === 'available') {
          const today = new Date().toISOString().split('T')[0];
          const resList = getLocalItem<any[]>('vd_local_reservations', []);
          const cleanIds: string[] = [];
          const remaining = resList.filter(r => {
            if (r && String(r.room_id) === roomId) {
              const ci = r.check_in || '';
              const co = r.check_out || '';
              const isActive = ci === co ? today === ci : (today >= ci && today < co);
              if (isActive) {
                cleanIds.push(r.id);
                if (r.external_id) cleanIds.push(r.external_id);
                return false;
              }
            }
            return true;
          });
          setLocalItem('vd_local_reservations', remaining);
          if (cleanIds.length > 0) {
            registerCancelledReservationIdInStorage(...cleanIds);
          }
        }
      }
    } else if (cleanEndpoint.includes('guests')) {
      if (method === 'POST') {
        const localGuest = {
          id: parsedBody.id || `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: parsedBody.name,
          email: parsedBody.email || null,
          phone: parsedBody.phone || null,
          id_number: parsedBody.id_number || null,
          origin: parsedBody.origin || null,
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_guests', []);
        const idx = current.findIndex(g => g && g.name.toLowerCase() === localGuest.name.toLowerCase());
        if (idx >= 0) {
          current[idx] = { ...current[idx], ...localGuest };
        } else {
          current.unshift(localGuest);
        }
        setLocalItem('vd_local_guests', current);
      } else if (method === 'DELETE' && parsedBody?.id) {
        const current = getLocalItem<any[]>('vd_local_guests', []);
        setLocalItem('vd_local_guests', current.filter(g => g && g.id !== parsedBody.id));
      }
    } else if (cleanEndpoint.includes('settings')) {
      if (method === 'POST' && parsedBody?.key && parsedBody?.value) {
        const current = getLocalItem<Record<string, { value: string; _localOnly?: boolean }>>('vd_local_settings', {});
        current[parsedBody.key] = { value: parsedBody.value, _localOnly: true };
        setLocalItem('vd_local_settings', current);
      }
    } else if (cleanEndpoint.includes('notifications')) {
      if (method === 'PATCH') {
        const current = getLocalItem<any[]>('vd_local_notifications', []);
        if (parsedBody?.action === 'mark_all_read') {
          const updated = current.map(n => n ? { ...n, read: true, _localOnly: true } : n);
          setLocalItem('vd_local_notifications', updated);
        } else if (parsedBody?.id) {
          const updated = current.map(n => n && n.id === parsedBody.id ? { ...n, read: true, _localOnly: true } : n);
          setLocalItem('vd_local_notifications', updated);
        }
      }
    } else if (cleanEndpoint.includes('products')) {
      if (method === 'POST') {
        const localProduct = {
          id: parsedBody.id || `prod_${Date.now()}`,
          name: parsedBody.name,
          category: parsedBody.category,
          price: Number(parsedBody.price) || 0,
          stock: parsedBody.stock || null,
          image: parsedBody.image || null,
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_products', []);
        const idx = current.findIndex(p => p && p.id === localProduct.id);
        if (idx >= 0) {
          current[idx] = localProduct;
        } else {
          current.push(localProduct);
        }
        setLocalItem('vd_local_products', current);
      } else if (method === 'DELETE' && parsedBody?.id) {
        const current = getLocalItem<any[]>('vd_local_products', []);
        setLocalItem('vd_local_products', current.filter(p => p && p.id !== parsedBody.id));
      }
    } else if (cleanEndpoint.includes('pos-sales')) {
      if (method === 'POST') {
        const localSale = {
          id: parsedBody.id || `sale_${Date.now()}`,
          items_json: parsedBody.items_json || parsedBody.items || [],
          total: Number(parsedBody.total) || 0,
          payment_method: parsedBody.payment_method || 'Efectivo',
          notes: parsedBody.notes || null,
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_pos_sales', []);
        current.unshift(localSale);
        setLocalItem('vd_local_pos_sales', current);
      } else if (method === 'DELETE' && parsedBody?.id) {
        const current = getLocalItem<any[]>('vd_local_pos_sales', []);
        setLocalItem('vd_local_pos_sales', current.filter(s => s && s.id !== parsedBody.id));
      }
    } else if (cleanEndpoint.includes('room-charges')) {
      if (method === 'POST') {
        const localCharge = {
          id: parsedBody.id || `charge_${Date.now()}`,
          room_id: String(parsedBody.room_id || ''),
          guest_name: parsedBody.guest_name || 'Huésped',
          items_json: parsedBody.items_json || parsedBody.items || [],
          total: Number(parsedBody.total) || 0,
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_room_charges', []);
        current.unshift(localCharge);
        setLocalItem('vd_local_room_charges', current);
      } else if (method === 'DELETE' && parsedBody?.id) {
        const current = getLocalItem<any[]>('vd_local_room_charges', []);
        setLocalItem('vd_local_room_charges', current.filter(c => c && c.id !== parsedBody.id));
      }
    } else if (cleanEndpoint.includes('feedback')) {
      if (method === 'POST') {
        const localFeedback = {
          id: parsedBody.id || `fb_${Date.now()}`,
          guest_name: parsedBody.guest_name || 'Huésped',
          rating: Number(parsedBody.rating) || 5,
          comment: parsedBody.comment || '',
          created_at: parsedBody.created_at || new Date().toISOString(),
          _localOnly: true
        };
        const current = getLocalItem<any[]>('vd_local_feedback', []);
        current.unshift(localFeedback);
        setLocalItem('vd_local_feedback', current);
      }
    } else if (cleanEndpoint.includes('open-tables')) {
      if (method === 'POST') {
        setLocalItem('vd_local_open_tables', { ...parsedBody, _localOnly: true });
      }
    }
  }

  let serverData: any = null;
  let fetchFailed = false;

  try {
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
    serverData = text ? JSON.parse(text) : null;
  } catch (error) {
    if (isBrowser) {
      console.warn(`[apiFetch] API call to ${url} failed, using local storage cache:`, error);
      fetchFailed = true;
    } else {
      throw error;
    }
  }

  if (isBrowser) {
    // 1. GET requests: Merge serverData with localStorage and cache the result
    if (method === 'GET') {
      if (cleanEndpoint.includes('reservations')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_reservations', []);
        
        const merged = [...serverList];
        for (const r of localList) {
          if (r && r._localOnly) {
            if (!merged.some(sr => String(sr.id) === String(r.id) || (r.external_id && String(sr.external_id) === String(r.external_id)))) {
              merged.push(r);
            }
          }
        }

        const cancelled = getCancelledReservationIdsFromStorage();
        const finalFiltered = merged.filter((r: any) => {
          if (!r) return false;
          const rId = String(r.id || '').trim().toLowerCase();
          const rExtId = String(r.external_id || '').trim().toLowerCase();
          if (cancelled.has(rId) || cancelled.has(rExtId)) return false;
          const statusLower = String(r.status || '').toLowerCase();
          if (statusLower === 'cancelled' || statusLower === 'checkedout' || statusLower === 'checked_out' || statusLower === 'completed') {
            return false;
          }
          return true;
        });

        setLocalItem('vd_local_reservations', finalFiltered);
        return finalFiltered as any;
      }

      if (cleanEndpoint.includes('rooms')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localStatuses = getLocalItem<Record<string, { status: string; _localOnly?: boolean }>>('vd_local_room_statuses', {});
        
        const merged = serverList.map((r: any) => {
          const rId = String(r.id);
          const override = localStatuses[rId];
          if (override) {
            if (r.status === override.status) {
              delete localStatuses[rId];
            } else if (override._localOnly) {
              return { ...r, status: override.status };
            }
          }
          return r;
        });

        setLocalItem('vd_local_room_statuses', localStatuses);
        setLocalItem('vd_local_rooms', merged);
        return merged as any;
      }

      if (cleanEndpoint.includes('guests')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_guests', []);
        
        const merged = [...serverList];
        for (const g of localList) {
          if (g && g._localOnly) {
            if (!merged.some(sg => String(sg.id) === String(g.id) || String(sg.name).toLowerCase() === String(g.name).toLowerCase())) {
              merged.push(g);
            }
          }
        }
        setLocalItem('vd_local_guests', merged);
        return merged as any;
      }

      if (cleanEndpoint.includes('settings')) {
        const serverDict = serverData && typeof serverData === 'object' ? serverData : {};
        const localDict = getLocalItem<Record<string, { value: string; _localOnly?: boolean }>>('vd_local_settings', {});
        
        const merged: Record<string, string> = {};
        for (const k of Object.keys(serverDict)) {
          merged[k] = serverDict[k];
          if (localDict[k] && localDict[k].value === serverDict[k]) {
            delete localDict[k];
          }
        }
        for (const k of Object.keys(localDict)) {
          if (localDict[k] && localDict[k]._localOnly) {
            merged[k] = localDict[k].value;
          }
        }
        setLocalItem('vd_local_settings', localDict);
        return merged as any;
      }

      if (cleanEndpoint.includes('notifications')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_notifications', []);
        
        const merged = [...serverList];
        for (const n of localList) {
          if (n && n._localOnly) {
            if (!merged.some(sn => String(sn.id) === String(n.id))) {
              merged.push(n);
            }
          }
        }
        const sorted = merged.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setLocalItem('vd_local_notifications', sorted);
        return sorted as any;
      }

      if (cleanEndpoint.includes('products')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_products', []);
        
        const merged = [...serverList];
        for (const p of localList) {
          if (p && p._localOnly) {
            if (!merged.some(sp => String(sp.id) === String(p.id))) {
              merged.push(p);
            }
          }
        }
        setLocalItem('vd_local_products', merged);
        return merged as any;
      }

      if (cleanEndpoint.includes('pos-sales')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_pos_sales', []);
        
        const merged = [...serverList];
        for (const s of localList) {
          if (s && s._localOnly) {
            if (!merged.some(ss => String(ss.id) === String(s.id))) {
              merged.push(s);
            }
          }
        }
        const sorted = merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setLocalItem('vd_local_pos_sales', sorted);
        return sorted as any;
      }

      if (cleanEndpoint.includes('room-charges')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_room_charges', []);
        
        const merged = [...serverList];
        for (const c of localList) {
          if (c && c._localOnly) {
            if (!merged.some(sc => String(sc.id) === String(c.id))) {
              merged.push(c);
            }
          }
        }
        const sorted = merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setLocalItem('vd_local_room_charges', sorted);
        return sorted as any;
      }

      if (cleanEndpoint.includes('feedback')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_feedback', []);
        
        const merged = [...serverList];
        for (const f of localList) {
          if (f && f._localOnly) {
            if (!merged.some(sf => String(sf.id) === String(f.id))) {
              merged.push(f);
            }
          }
        }
        const sorted = merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setLocalItem('vd_local_feedback', sorted);
        return sorted as any;
      }

      if (cleanEndpoint.includes('open-tables')) {
        const serverList = Array.isArray(serverData) ? serverData : [];
        const localList = getLocalItem<any[]>('vd_local_open_tables', []);
        const merged = serverList.length > 0 ? serverList : localList;
        setLocalItem('vd_local_open_tables', merged);
        return merged as any;
      }

      return (serverData !== null ? serverData : getLocalItem<any>(`vd_local_${cleanEndpoint}`, [])) as T;
    }

    if (method !== 'GET' && !fetchFailed && serverData) {
      if (cleanEndpoint.includes('reservations')) {
        if (method === 'POST') {
          const current = getLocalItem<any[]>('vd_local_reservations', []);
          const idx = current.findIndex(r => r && (r.id === serverData.id || (serverData.external_id && r.external_id === serverData.external_id)));
          const cleaned = { ...serverData, _localOnly: false };
          if (idx >= 0) {
            current[idx] = cleaned;
          } else {
            current.push(cleaned);
          }
          setLocalItem('vd_local_reservations', current);
        }
      } else if (cleanEndpoint.includes('guests')) {
        if (method === 'POST') {
          const current = getLocalItem<any[]>('vd_local_guests', []);
          const idx = current.findIndex(g => g && g.name.toLowerCase() === serverData.name.toLowerCase());
          const cleaned = { ...serverData, _localOnly: false };
          if (idx >= 0) {
            current[idx] = cleaned;
          } else {
            current.unshift(cleaned);
          }
          setLocalItem('vd_local_guests', current);
        }
      } else if (cleanEndpoint.includes('rooms')) {
        if (method === 'PATCH' && serverData.room) {
          const localStatuses = getLocalItem<Record<string, { status: string; _localOnly?: boolean }>>('vd_local_room_statuses', {});
          delete localStatuses[String(serverData.room.id)]; // clear override as it is synced
          setLocalItem('vd_local_room_statuses', localStatuses);
        }
      }
    }

    if (fetchFailed) {
      if (method === 'POST' || method === 'PATCH') {
        return parsedBody as any;
      }
      return { success: true } as any;
    }
  }

  return serverData as T;
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
