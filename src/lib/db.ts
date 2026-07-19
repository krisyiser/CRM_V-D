import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import type { Reservation } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Reads a JSON file from local data/ directory or GitHub API if configured.
 */
export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO; // e.g. "krisyiser/CRM_V-D"

  // Attempt reading from GitHub API if token and repo are configured
  if (ghToken && ghRepo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${filename}`, {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Vainilla-CRM'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const text = await res.text();
        return JSON.parse(text) as T;
      }
    } catch (e) {
      console.error(`[GitHub DB] Error fetching ${filename} from GitHub API:`, e);
    }
  }

  // Fallback to local data/ directory
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

/**
 * Writes data to data/ directory and automatically syncs with GitHub Repository in real-time.
 */
export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);

  // 1. Write to local file system
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (error) {
    console.error(`Error writing to local data/${filename}:`, error);
  }

  // 2. Real-time background sync with GitHub Repo API if configured
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO || 'krisyiser/CRM_V-D';

  if (ghToken) {
    (async () => {
      try {
        const metaRes = await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${filename}`, {
          headers: {
            'Authorization': `Bearer ${ghToken}`,
            'User-Agent': 'Vainilla-CRM'
          }
        });
        
        let sha: string | undefined;
        if (metaRes.ok) {
          const meta = await metaRes.json();
          sha = meta.sha;
        }

        const contentBase64 = Buffer.from(jsonString).toString('base64');
        await fetch(`https://api.github.com/repos/${ghRepo}/contents/data/${filename}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Vainilla-CRM'
          },
          body: JSON.stringify({
            message: `auto-sync: update data/${filename}`,
            content: contentBase64,
            sha
          })
        });
      } catch (err) {
        console.error(`[GitHub DB Sync] Error committing ${filename} to GitHub:`, err);
      }
    })();
  } else {
    exec(`git add data/${filename} && git commit -m "auto-sync: update ${filename}"`, () => {});
  }
}

/**
 * Fetches online reservations created by guests on the public website's GitHub repository.
 */
export async function fetchWebsiteReservationsFromGitHub(): Promise<Reservation[]> {
  const websiteRepo = process.env.WEBSITE_GITHUB_REPO || process.env.GITHUB_REPO || 'krisyiser/CRM_V-D';
  const ghToken = process.env.GITHUB_TOKEN;

  const pathsToTry = [
    `https://raw.githubusercontent.com/${websiteRepo}/main/data/web_reservations.json`,
    `https://raw.githubusercontent.com/${websiteRepo}/main/data/reservations.json`,
    `https://api.github.com/repos/${websiteRepo}/contents/data/web_reservations.json`,
    `https://api.github.com/repos/${websiteRepo}/contents/data/reservations.json`
  ];

  for (const targetUrl of pathsToTry) {
    try {
      const headers: Record<string, string> = { 'User-Agent': 'Vainilla-CRM' };
      if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;
      if (targetUrl.includes('api.github.com')) headers['Accept'] = 'application/vnd.github.v3.raw';

      const res = await fetch(targetUrl, { headers, cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any, index: number) => ({
            id: item.id || `web_res_${index}_${Date.now()}`,
            room_id: String(item.room_id || item.roomId || '101'),
            guest_id: item.guest_id || null,
            guest_name: item.guest_name || item.guestName || item.name || 'Huésped Web',
            check_in: item.check_in || item.checkIn || (item.dates?.split(' - ')[0] ?? ''),
            check_out: item.check_out || item.checkOut || (item.dates?.split(' - ')[1] ?? ''),
            dates: item.dates || `${item.check_in || item.checkIn} - ${item.check_out || item.checkOut}`,
            total_price: Number(item.total_price || item.totalPrice || item.total || 0),
            notes: item.notes ? `Reserva Web | ${item.notes}` : 'Reserva Web desde Sitio Oficial',
            payment_status: item.payment_status || 'paid',
            status: item.status || 'Confirmed',
            external_id: item.external_id || item.id || 'WEB_SITE',
            created_at: item.created_at || new Date().toISOString()
          }));
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }

  return [];
}
