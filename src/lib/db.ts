import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';

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
        // Fetch current file SHA
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

        // Commit and push update directly to GitHub Repository
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
    // 3. Local background git auto-commit if running locally
    exec(`git add data/${filename} && git commit -m "auto-sync: update ${filename}"`, () => {});
  }
}
