import { invoke } from '@tauri-apps/api/core';

// API Configuration for Vainilla & Descanso
export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    // Prefer explicit env var for production
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      return envUrl.replace(/\/$/, ''); // strip trailing slash
    }
    // In development over http we can use the legacy port
    if (window.location.protocol === 'http:') {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    // In https production without explicit env var, fall back to relative paths
    return '';
  }
  return 'http://localhost:3001';
})();

// PERSISTENT DEVICE IDENTIFIER FOR MOBILE DEVICES (CRM CONNECTION)
export let deviceId = '';
export let deviceName = '';
if (typeof window !== 'undefined') {
  deviceId = localStorage.getItem('vainilla_device_id') || '';
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('vainilla_device_id', deviceId);
  }
  
  deviceName = localStorage.getItem('vainilla_device_name') || '';
  if (!deviceName) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    deviceName = isMobile ? 'Móvil Mesero' : 'Navegador Web';
    localStorage.setItem('vainilla_device_name', deviceName);
  }
}

export const API_ENDPOINTS = {
  rooms: 'rooms',
  reservations: 'reservations',
  guests: 'guests',
  apiKey: 'get_api_key',
  settings: 'settings',
  notifications: 'notifications',
  feedback: 'feedback',
  products: 'products',
  posSales: 'pos_sales',
  roomCharges: 'room_charges'
};

// Check if running in Tauri (Safe for SSR)
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

/**
 * Maps snake_case keys to camelCase keys for frontend consistency
 */
function mapToFrontend(data: any): any {
  if (Array.isArray(data)) {
    return data.map(mapToFrontend);
  } else if (data !== null && typeof data === 'object') {
    const newData: any = {};
    for (const key in data) {
      // Fix for 'type_' field in Rust Notification struct
      let cleanKey = key === 'type_' ? 'type' : key;
      const newKey = cleanKey.replace(/(_\w)/g, (m) => m[1].toUpperCase());
      newData[newKey] = mapToFrontend(data[key]);
    }
    return newData;
  }
  return data;
}

/**
 * Maps camelCase keys to snake_case keys for Rust backend parameters
 */
function mapToBackend(data: any): any {
  if (Array.isArray(data)) {
    return data.map(mapToBackend);
  } else if (data !== null && typeof data === 'object') {
    const newData: any = {};
    for (const key in data) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newData[snakeKey] = mapToBackend(data[key]);
    }
    return newData;
  }
  return data;
}

/**
 * Maps snake_case or standard keys to camelCase keys for Tauri v2 command invokes
 */
function mapToTauri(data: any): any {
  if (Array.isArray(data)) {
    return data.map(mapToTauri);
  } else if (data !== null && typeof data === 'object') {
    const newData: any = {};
    for (const key in data) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      newData[camelKey] = mapToTauri(data[key]);
    }
    return newData;
  }
  return data;
}

/**
 * Bulletproof Fetch Wrapper
 * Prioritizes Tauri SQLite for Desktop, falls back to API for Web.
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  const cacheKey = `lkg_${endpoint.replace(/[^a-z0-9]/gi, '_')}`;
  
  const currentIsTauri = typeof window !== 'undefined' && (
    !!(window as any).__TAURI_INTERNALS__ || 
    !!(window as any).__TAURI__ || 
    !!(window as any).__TAURI_IPC__
  );

  console.log(`[apiFetch] endpoint: ${endpoint}, method: ${method}, isTauri: ${currentIsTauri}, window.__TAURI_INTERNALS__:`, typeof window !== 'undefined' ? !!(window as any).__TAURI_INTERNALS__ : 'undefined');

  try {
    // 1. Try Tauri SQLite first if available
    if (currentIsTauri) {
      let command = '';
      let args = options?.body ? JSON.parse(options.body as string) : {};

      if (endpoint === 'rooms') {
        if (method === 'GET') command = 'get_rooms';
        if (method === 'PATCH') command = 'update_room_status';
      } else if (endpoint === 'reservations') {
        if (method === 'GET') command = 'get_reservations';
        if (method === 'POST') command = 'add_reservation';
        if (method === 'DELETE') command = 'delete_reservation';
      } else if (endpoint === 'settings') {
        if (method === 'GET') command = 'get_settings';
        if (method === 'POST') command = 'update_setting';
      } else if (endpoint === 'notifications') {
        if (method === 'GET') command = 'get_notifications';
        if (method === 'PATCH') command = 'mark_notification_read';
      } else if (endpoint === 'get_api_key') {
        command = 'get_api_key';
      } else if (endpoint === 'guests') {
        if (method === 'GET') command = 'get_guests';
        if (method === 'POST') command = 'add_guest';
        if (method === 'DELETE') command = 'delete_guest';
      } else if (endpoint === 'feedback') {
        if (method === 'POST') command = 'add_feedback';
        if (method === 'GET') command = 'get_feedback';
        if (method === 'DELETE') command = 'delete_feedback';
      } else if (endpoint === 'pricing') {
        if (method === 'GET') command = 'get_pricing';
      } else if (endpoint === 'products') {
        if (method === 'GET') command = 'get_products';
        if (method === 'POST') command = 'add_product';
        if (method === 'DELETE') command = 'delete_product';
      } else if (endpoint === 'pos_sales') {
        if (method === 'GET') command = 'get_pos_sales';
        if (method === 'POST') command = 'add_pos_sale';
        if (method === 'DELETE') command = 'delete_pos_sale';
        if (method === 'PATCH') command = 'update_pos_sale';
      } else if (endpoint === 'room_charges') {
        if (method === 'GET') command = 'get_room_charges';
        if (method === 'POST') command = 'add_room_charge';
      }

      if (command) {
        try {
          const tauriArgs = mapToTauri(args);
          const data = await invoke(command, tauriArgs);
          const mappedData = mapToFrontend(data);
          
          if (method === 'GET') {
            localStorage.setItem(cacheKey, JSON.stringify({
              timestamp: Date.now(),
              data: mappedData
            }));
          }
          
          return mappedData as T;
        } catch (tauriError) {
          console.error(`Tauri Invoke (${command}) failed:`, tauriError);
          throw tauriError;
        }
      }
    }

    // 2. Fallback to standard fetch
    const url = API_BASE_URL ? `${API_BASE_URL}/api/v1/${endpoint}` : `/api/v1/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-Name': encodeURIComponent(deviceName),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vainilla_device_unauthorized'));
      }
      throw new Error("Dispositivo desvinculado por el Administrador");
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    
    if (data && method === 'GET') {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    }

    return data as T;
  } catch (error) {
    console.error(`Fetch failed for ${endpoint}:`, error);
    
    // 3. Last Known Good recovery
    const lkg = localStorage.getItem(cacheKey);
    if (lkg && method === 'GET') {
      const { data, timestamp } = JSON.parse(lkg);
      const age = Math.round((Date.now() - timestamp) / 1000 / 60);
      console.warn(`Using Last Known Good snapshot for ${endpoint} (Age: ${age} mins)`);
      return data as T;
    }
    
    throw error;
  }
}
