import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Reservation } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TMP_DIR = path.join(os.tmpdir(), 'vainilla_data');

/** In-memory tombstone set for deleted reservation IDs to survive Netlify serverless re-fetches */
const DELETED_RESERVATION_IDS = new Set<string>();

export async function registerDeletedReservationId(...ids: (string | undefined | null)[]) {
  const cleanIds = ids
    .filter(Boolean)
    .map(id => String(id).trim().toLowerCase())
    .filter(id => id.length > 0);

  if (cleanIds.length === 0) return;

  // Sync to in-memory set
  for (const id of cleanIds) {
    DELETED_RESERVATION_IDS.add(id);
  }

  await updateJsonTransactional<string[]>(
    'deleted_reservations.json',
    (existing) => {
      const list = Array.isArray(existing) ? existing : [];
      const set = new Set([
        ...list.map(id => String(id).trim().toLowerCase()),
        ...cleanIds
      ]);
      return Array.from(set);
    },
    []
  );
}

/**
 * Sanitizes input filename to prevent path traversal vulnerabilities.
 */
function sanitizeFilename(filename: string): string {
  const safeName = path.basename(filename);
  if (!safeName.endsWith('.json')) {
    throw new Error('Invalid database filename target');
  }
  return safeName;
}

/**
 * Reads a JSON file from local data/ directory first, then /tmp serverless dir, or GitHub API as last resort.
 * Automatically filters out any tombstones registered in DELETED_RESERVATION_IDS.
 */
export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const safeName = sanitizeFilename(filename);
  let data: T | null = null;

  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO || 'krisyiser/CRM_V-D';

  // 1. Primary Read: GitHub API if configured (to avoid stale serverless disk cache)
  if (ghToken) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${safeName}`, {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Vainilla-CRM'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const text = await res.text();
        data = JSON.parse(text) as T;
        
        // Cache to disk and /tmp so offline/stale fallbacks stay warm
        await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
        await fs.writeFile(path.join(DATA_DIR, safeName), text, 'utf-8').catch(() => {});
        await fs.mkdir(TMP_DIR, { recursive: true }).catch(() => {});
        await fs.writeFile(path.join(TMP_DIR, safeName), text, 'utf-8').catch(() => {});
      }
    } catch (e) {
      console.warn(`[GitHub DB] Failed to fetch ${safeName} from GitHub API, falling back to local files:`, e);
    }
  }

  // 2. Fallbacks: Read from local disk if GitHub is not configured or failed
  if (data === null) {
    // Try /tmp runtime directory first (contains newer dynamic serverless writes)
    try {
      const tmpFilePath = path.join(TMP_DIR, safeName);
      const tmpContent = await fs.readFile(tmpFilePath, 'utf-8');
      data = JSON.parse(tmpContent) as T;
    } catch {
      // Try local static data/ directory next
      try {
        const filePath = path.join(DATA_DIR, safeName);
        const content = await fs.readFile(filePath, 'utf-8');
        data = JSON.parse(content) as T;
      } catch {
        data = fallback;
      }
    }
  }

  // Filter out tombstones if reading reservations.json
  if (safeName === 'reservations.json' && Array.isArray(data)) {
    let deletedList: string[] = [];
    try {
      deletedList = await readJson<string[]>('deleted_reservations.json', []);
      if (!Array.isArray(deletedList)) deletedList = [];
    } catch {
      deletedList = [];
    }

    const deletedSet = new Set([
      ...deletedList.map(id => String(id).trim().toLowerCase()),
      ...Array.from(DELETED_RESERVATION_IDS)
    ]);

    // Keep in-memory in sync
    for (const id of deletedSet) {
      DELETED_RESERVATION_IDS.add(id);
    }

    const list = data as Reservation[];
    const filtered = list.filter(r => {
      if (!r) return false;
      if (r.status === 'Cancelled' || r.status === 'cancelled') return false;
      const rId = String(r.id || '').trim().toLowerCase();
      const rExtId = String(r.external_id || '').trim().toLowerCase();
      if (deletedSet.has(rId) || deletedSet.has(rExtId)) return false;
      return true;
    });
    return filtered as any as T;
  }

  return data;
}

/**
 * Writes data atomically to data/ directory and /tmp runtime fallback, then syncs with GitHub if configured.
 * ALWAYS awaits GitHub API write so Netlify Lambda functions don't terminate prematurely.
 */
export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const jsonString = JSON.stringify(data, null, 2);

  // 1. Write to data/ directory (primary storage)
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, safeName);
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (err) {
    // Expected on read-only serverless filesystems
  }

  // 2. Mirror write to /tmp runtime directory to maintain 100% parity
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
    const tmpFilePath = path.join(TMP_DIR, safeName);
    await fs.writeFile(tmpFilePath, jsonString, 'utf-8');
  } catch (err) {
    console.error(`[Serverless DB] Error writing TMP_DIR/${safeName}:`, err);
  }

  // 3. Synchronous sync with GitHub Repo API if configured
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO || 'krisyiser/CRM_V-D';

  if (ghToken) {
    try {
      const metaRes = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${safeName}`, {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'User-Agent': 'Vainilla-CRM'
        },
        cache: 'no-store'
      });
      
      let sha: string | undefined;
      if (metaRes.ok) {
        const meta = await metaRes.json();
        sha = meta.sha;
      }

      const contentBase64 = Buffer.from(jsonString).toString('base64');
      await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${safeName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vainilla-CRM'
        },
        body: JSON.stringify({
          message: `auto-sync: update data/${safeName}`,
          content: contentBase64,
          sha
        })
      });
    } catch (err) {
      console.error(`[GitHub DB Sync] Error committing ${safeName} to GitHub:`, err);
    }
  }
}

/**
 * Fetches online reservations created by guests on the public website's GitHub repository.
 */
export async function fetchWebsiteReservationsFromGitHub(): Promise<Reservation[]> {
  const websiteRepo = process.env.WEBSITE_GITHUB_REPO || 'krisyiser/Vainilla-y-Descanso';
  const ghToken = process.env.GITHUB_TOKEN;

  const pathsToTry = [
    `https://raw.githubusercontent.com/${websiteRepo}/main/data/db.json`,
    `https://api.github.com/repos/${websiteRepo}/contents/data/db.json`
  ];

  for (const targetUrl of pathsToTry) {
    try {
      const headers: Record<string, string> = { 'User-Agent': 'Vainilla-CRM' };
      if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;
      if (targetUrl.includes('api.github.com')) headers['Accept'] = 'application/vnd.github.v3.raw';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(targetUrl, { headers, cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        const rawList = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.reservations) ? parsed.reservations : []);
        
        if (rawList.length > 0) {
          const list = rawList.map((item: any, index: number) => {
            const checkIn = item.check_in || item.checkIn || (item.dates?.split(' - ')[0] ?? '');
            const checkOut = item.check_out || item.checkOut || (item.dates?.split(' - ')[1] ?? '');
            return {
              id: item.id || item.reservation_id || `web_res_${index}_${Date.now()}`,
              room_id: String(item.room_id || item.roomId || '101'),
              guest_id: item.guest_id || null,
              guest_name: item.guest_name || item.guestName || item.name || 'Huésped Web',
              check_in: checkIn,
              check_out: checkOut,
              dates: item.dates || `${checkIn} - ${checkOut}`,
              total_price: Number(item.total_price || item.totalPrice || item.total || 0),
              notes: item.notes ? `Reserva Web | ${item.notes}` : 'Reserva Web desde Sitio Oficial',
              payment_status: item.payment_status || 'paid',
              status: item.status === 'confirmed_online' || item.status === 'pending_sync' ? 'Confirmed' : (item.status || 'Confirmed'),
              external_id: item.reservation_id || item.id || 'WEB_SITE',
              created_at: item.created_at || new Date().toISOString()
            };
          });

          let deletedList: string[] = [];
          try {
            deletedList = await readJson<string[]>('deleted_reservations.json', []);
            if (!Array.isArray(deletedList)) deletedList = [];
          } catch {
            deletedList = [];
          }
          const deletedSet = new Set([
            ...deletedList.map(id => String(id).trim().toLowerCase()),
            ...Array.from(DELETED_RESERVATION_IDS)
          ]);

          return list.filter((r: Reservation) => {
            if (!r) return false;
            if (r.status === 'Cancelled' || r.status === 'cancelled') return false;
            const rId = String(r.id || '').trim().toLowerCase();
            const rExtId = String(r.external_id || '').trim().toLowerCase();
            return !deletedSet.has(rId) && !deletedSet.has(rExtId);
          });
        }
      }
    } catch (e) {
      // Continue to next URL fallback
    }
  }

  return [];
}

/**
 * Deletes or cancels a reservation in the public website's GitHub repository (krisyiser/Vainilla-y-Descanso data/db.json)
 */
export async function deleteWebsiteReservationFromGitHub(...ids: (string | undefined)[]): Promise<boolean> {
  const targetIds = ids.filter(Boolean) as string[];
  if (targetIds.length === 0) return false;

  await registerDeletedReservationId(...targetIds);

  const websiteRepo = process.env.WEBSITE_GITHUB_REPO || 'krisyiser/Vainilla-y-Descanso';
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) return false;

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const contentsUrl = `https://api.github.com/repos/${websiteRepo}/contents/data/db.json`;
      const res = await fetch(contentsUrl, {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'User-Agent': 'Vainilla-CRM'
        },
        cache: 'no-store'
      });

      if (!res.ok) return false;
      const meta = await res.json();
      const sha = meta.sha;
      const rawContent = Buffer.from(meta.content, 'base64').toString('utf-8');
      const dbData = JSON.parse(rawContent);

      let list: any[] = Array.isArray(dbData) ? dbData : (dbData.reservations || []);
      const initialLen = list.length;

      // Filter out target reservation from db.json
      list = list.filter((item: any) => {
        const itemId = String(item.id || '').trim().toLowerCase();
        const itemResId = String(item.reservation_id || '').trim().toLowerCase();
        const itemExtId = String(item.external_id || '').trim().toLowerCase();
        return !targetIds.some(tid => {
          const cleanTid = String(tid).trim().toLowerCase();
          return cleanTid === itemId || cleanTid === itemResId || cleanTid === itemExtId;
        });
      });

      if (list.length === initialLen) return false;

      const updatedData = Array.isArray(dbData) ? list : { ...dbData, reservations: list };
      const updatedBase64 = Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64');

      const putRes = await fetch(contentsUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vainilla-CRM'
        },
        body: JSON.stringify({
          message: `cancel: remove reservation ${targetIds.join(', ')} from db.json`,
          content: updatedBase64,
          sha
        })
      });

      if (putRes.ok) {
        return true;
      } else if (putRes.status === 409 || putRes.status === 422) {
        console.warn(`[Website DB Delete] Conflict on ${websiteRepo}/contents/data/db.json. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        continue;
      } else {
        return false;
      }
    } catch (err) {
      console.error('[GitHub Website DB Delete] Error deleting reservation from website GitHub repo:', err);
      if (attempt === maxRetries) return false;
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    }
  }
  return false;
}

export async function updateJsonTransactional<T>(
  filename: string,
  transform: (data: T) => T | Promise<T>,
  fallback: T
): Promise<T> {
  const safeName = sanitizeFilename(filename);
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO || 'krisyiser/CRM_V-D';

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    let currentData: T = fallback;
    let sha: string | undefined = undefined;

    // 1. Fetch current data and SHA directly from GitHub if configured
    if (ghToken) {
      try {
        const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${safeName}`, {
          headers: {
            'Authorization': `Bearer ${ghToken}`,
            'User-Agent': 'Vainilla-CRM'
          },
          cache: 'no-store'
        });

        if (res.ok) {
          const meta = await res.json();
          sha = meta.sha;
          const rawContent = Buffer.from(meta.content, 'base64').toString('utf-8');
          currentData = JSON.parse(rawContent) as T;
        } else if (res.status === 404) {
          sha = undefined;
          currentData = fallback;
        } else {
          throw new Error(`Failed to fetch from GitHub: ${res.status}`);
        }
      } catch (err) {
        console.warn(`[Transactional Read] Attempt ${attempt} failed to fetch from GitHub:`, err);
        if (attempt === maxRetries) {
          currentData = await readJson<T>(filename, fallback);
        } else {
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
          continue;
        }
      }
    } else {
      currentData = await readJson<T>(filename, fallback);
    }

    // 2. Apply transformation
    const transformedData = await transform(currentData);
    const jsonString = JSON.stringify(transformedData, null, 2);

    // 3. Write locally (both /tmp and data/ directories)
    try {
      await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
      await fs.writeFile(path.join(DATA_DIR, safeName), jsonString, 'utf-8');
      await fs.mkdir(TMP_DIR, { recursive: true }).catch(() => {});
      await fs.writeFile(path.join(TMP_DIR, safeName), jsonString, 'utf-8');
    } catch (err) {
      console.warn('[Transactional Write] Local write warning:', err);
    }

    // 4. Commit to GitHub with SHA (Compare-And-Swap)
    if (ghToken) {
      try {
        const contentBase64 = Buffer.from(jsonString).toString('base64');
        const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${safeName}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Vainilla-CRM'
          },
          body: JSON.stringify({
            message: `auto-sync: transactional update data/${safeName}`,
            content: contentBase64,
            sha
          })
        });

        if (res.ok) {
          return transformedData;
        } else if (res.status === 409 || res.status === 422) {
          console.warn(`[Transactional Write] Conflict detected (status ${res.status}) on ${safeName}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          continue;
        } else {
          const errText = await res.text().catch(() => '');
          throw new Error(`GitHub API error ${res.status}: ${errText}`);
        }
      } catch (err) {
        console.error(`[Transactional Write] Attempt ${attempt} failed to write to GitHub:`, err);
        if (attempt === maxRetries) {
          return transformedData;
        }
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        continue;
      }
    } else {
      return transformedData;
    }
  }

  throw new Error(`[Transactional Write] Exceeded maximum retries (${maxRetries}) for ${filename}`);
}
