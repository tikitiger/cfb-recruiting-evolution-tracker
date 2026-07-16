'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SaveFile = { name: string; path: string };
type ImportResult = {
  seasonYear: number;
  teamsImported: number;
  teamsSkipped: string[];
};

export default function ImportPage() {
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [saveDir, setSaveDir] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/saves')
      .then((r) => r.json())
      .then((data: { dir: string; saves: SaveFile[]; error?: string }) => {
        setSaveDir(data.dir);
        setSaves(data.saves);
        if (data.saves.length) setSelectedPath(data.saves[0].path);
        if (data.error) setLoadError(data.error);
      });
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPath) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-bold" style={{ color: 'var(--ocean-100)' }}>Import Dynasty Save</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ocean-400)' }}>
        Select a dynasty save file below. Read-only — the file is never modified.
        <br />
        <span className="mt-1 inline-block">
          Import after <strong style={{ color: 'var(--ocean-200)' }}>National Signing Day</strong> each season to capture recruit commitments.
          Import from the same autosave file each time — the tracker detects the season year automatically.
        </span>
      </p>

      <form onSubmit={handleImport} className="mt-6 flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>
            Save File
          </label>
          {saves.length > 0 ? (
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--ocean-900)',
                borderColor: 'var(--ocean-700)',
                color: 'var(--ocean-100)',
              }}
            >
              {saves.map((s) => (
                <option key={s.path} value={s.path}>{s.name}</option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-400)' }}>
              {loadError || 'No dynasty save files found'}
            </div>
          )}
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>
            Looking in: {saveDir}
          </p>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !selectedPath}
          className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--ocean-600)' }}
        >
          {status === 'loading' ? 'Importing…' : 'Import Save'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#991b1b', background: 'rgba(153,27,27,0.15)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {status === 'done' && result && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-200)' }}>
          <p>Imported season <strong style={{ color: 'var(--ocean-100)' }}>{result.seasonYear}</strong> — {result.teamsImported} teams with recruit breakdowns.</p>
          {result.teamsSkipped.length > 0 && (
            <p className="mt-1" style={{ color: 'var(--ocean-400)' }}>Skipped: {result.teamsSkipped.join(', ')}</p>
          )}
          <button
            onClick={() => router.push('/')}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--ocean-600)' }}
          >
            View Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
