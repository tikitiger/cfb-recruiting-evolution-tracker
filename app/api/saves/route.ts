import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_SAVE_DIR = join(homedir(), 'Documents', 'EA SPORTS College Football 27', 'saves');

export async function GET() {
  try {
    const entries = await readdir(DEFAULT_SAVE_DIR, { withFileTypes: true });
    const saves = entries
      .filter((e) => !e.isDirectory() && e.name.startsWith('DYNASTY'))
      .map((e) => ({
        name: e.name,
        path: join(DEFAULT_SAVE_DIR, e.name),
      }))
      .sort((a, b) => b.name.localeCompare(a.name));

    return Response.json({ dir: DEFAULT_SAVE_DIR, saves });
  } catch {
    return Response.json({ dir: DEFAULT_SAVE_DIR, saves: [], error: 'Could not read saves directory' });
  }
}
