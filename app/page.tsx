'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Season = { id: string; year: number; label: string };
type Settings = {
  cpuTransferChance: number | null;
  userTransferChance: number | null;
  maxTransfersPerTeam: number | null;
  recruitFlipping: boolean | null;
  skillLevel: string | null;
  progressionFreq: string | null;
  talentProgressSpeed: string | null;
  xpPenalty: number | null;
  xpQB: number | null; xpHB: number | null; xpWR: number | null; xpTE: number | null;
  xpT: number | null; xpG: number | null; xpC: number | null;
  xpDE: number | null; xpDT: number | null; xpOLB: number | null; xpMLB: number | null;
  xpCB: number | null; xpFS: number | null; xpSS: number | null;
  xpK: number | null; xpP: number | null;
} | null;
type TeamStat = {
  id: string;
  overall: number | null;
  prestige: number | null;
  prestigeRank: number | null;
  recruitingRank: number | null;
  teamRank: number | null;
  wins: number | null;
  losses: number | null;
  transfersIn: number | null;
  transfersOut: number | null;
  recruitCount: number | null;
  fiveStars: number | null; fourStars: number | null; threeStars: number | null; twoStars: number | null; oneStars: number | null;
  fiveStarsHS: number | null; fourStarsHS: number | null; threeStarsHS: number | null; twoStarsHS: number | null; oneStarsHS: number | null;
  fiveStarsXfer: number | null; fourStarsXfer: number | null; threeStarsXfer: number | null; twoStarsXfer: number | null; oneStarsXfer: number | null;
  hsRecruits: number | null;
  transferRecruits: number | null;
  rosterSize: number | null;
  gradeAtmosphere: string | null;
  gradeBrand: string | null;
  gradeBudget: string | null;
  gradeTraditions: string | null;
  gradeConference: string | null;
  gradeFacilities: string | null;
  facilitiesScore: number | null;
  avgGrade: number | null;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    conference: string;
    logoUrl: string | null;
  };
};

type SortKey =
  | 'name' | 'conference' | 'overall' | 'prestige' | 'recruitingRank'
  | 'record' | 'transfersIn' | 'transfersOut' | 'netTransfers' | 'recruitCount'
  | 'fiveStars' | 'fourStars' | 'threeStars' | 'twoStars' | 'oneStars'
  | 'avgGrade';

export default function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [stats, setStats] = useState<TeamStat[]>([]);
  const [settings, setSettings] = useState<Settings>(null);
  const [loading, setLoading] = useState(true);
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [recruitTypeFilter, setRecruitTypeFilter] = useState<'all' | 'hs' | 'transfer'>('all');
  const [showGrades, setShowGrades] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/seasons').then((r) => r.json()).then((data: Season[]) => {
      setSeasons(data);
      if (data.length) setSeasonId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    fetch(`/api/stats?seasonId=${seasonId}`).then((r) => r.json()).then(setStats);
    fetch(`/api/settings?seasonId=${seasonId}`).then((r) => r.json()).then(setSettings);
  }, [seasonId]);

  const conferences = useMemo(() => {
    const set = new Set(stats.map((s) => s.team.conference));
    return ['All', ...Array.from(set).sort()];
  }, [stats]);

  const rows = useMemo(() => {
    let filtered = conferenceFilter === 'All' ? stats : stats.filter((s) => s.team.conference === conferenceFilter);
    filtered = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return dir * a.team.name.localeCompare(b.team.name);
        case 'conference': return dir * a.team.conference.localeCompare(b.team.conference) || a.team.name.localeCompare(b.team.name);
        case 'overall': return dir * ((a.overall ?? -1) - (b.overall ?? -1));
        case 'prestige': return dir * ((a.prestige ?? -1) - (b.prestige ?? -1));
        case 'recruitingRank': {
          const av = a.recruitingRank ?? 9999, bv = b.recruitingRank ?? 9999;
          return -dir * (av - bv);
        }
        case 'record': return dir * ((a.wins ?? 0) - (a.losses ?? 0) - ((b.wins ?? 0) - (b.losses ?? 0)));
        case 'transfersIn': return dir * ((a.transfersIn ?? -1) - (b.transfersIn ?? -1));
        case 'transfersOut': return dir * ((a.transfersOut ?? -1) - (b.transfersOut ?? -1));
        case 'netTransfers': return dir * (((a.transfersIn ?? 0) - (a.transfersOut ?? 0)) - ((b.transfersIn ?? 0) - (b.transfersOut ?? 0)));
        case 'recruitCount': return dir * ((a.recruitCount ?? -1) - (b.recruitCount ?? -1));
        case 'fiveStars': return dir * ((a.fiveStars ?? -1) - (b.fiveStars ?? -1));
        case 'fourStars': return dir * ((a.fourStars ?? -1) - (b.fourStars ?? -1));
        case 'threeStars': return dir * ((a.threeStars ?? -1) - (b.threeStars ?? -1));
        case 'twoStars': return dir * ((a.twoStars ?? -1) - (b.twoStars ?? -1));
        case 'oneStars': return dir * ((a.oneStars ?? -1) - (b.oneStars ?? -1));
        case 'avgGrade': return dir * ((a.avgGrade ?? -1) - (b.avgGrade ?? -1));
        default: return 0;
      }
    });
    return filtered;
  }, [stats, conferenceFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;

  if (!seasons.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ocean-100)' }}>No seasons imported yet</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--ocean-400)' }}>
          Import your CFB 27 dynasty save to see team overalls, recruiting ranks, transfers, and more.
        </p>
        <Link
          href="/import"
          className="mt-8 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--ocean-600)' }}
        >
          Import a save file
        </Link>
      </div>
    );
  }

  const xpPositions = [
    ['QB', settings?.xpQB], ['HB', settings?.xpHB], ['WR', settings?.xpWR], ['TE', settings?.xpTE],
    ['T', settings?.xpT], ['G', settings?.xpG], ['C', settings?.xpC],
    ['DE', settings?.xpDE], ['DT', settings?.xpDT], ['OLB', settings?.xpOLB], ['MLB', settings?.xpMLB],
    ['CB', settings?.xpCB], ['FS', settings?.xpFS], ['SS', settings?.xpSS],
    ['K', settings?.xpK], ['P', settings?.xpP],
  ] as const;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Settings panel */}
      {settings && (
        <div
          className="mb-4 rounded-lg border px-4 py-3"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ocean-400)' }}>Dynasty Settings</h2>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <SettingPill label="Difficulty" value={settings.skillLevel?.replace('_', ' ') ?? '—'} />
            <SettingPill label="CPU Transfer %" value={`${settings.cpuTransferChance ?? '—'}%`} />
            <SettingPill label="User Transfer %" value={`${settings.userTransferChance ?? '—'}%`} />
            <SettingPill label="Max Transfers/Team" value={String(settings.maxTransfersPerTeam ?? '—')} />
            <SettingPill label="Recruit Flipping" value={settings.recruitFlipping ? 'ON' : 'OFF'} />
            <SettingPill label="CPU Progression" value={settings.progressionFreq ?? '—'} />
            <SettingPill label="Talent Speed" value={settings.talentProgressSpeed ?? '—'} />
            <SettingPill label="Manual XP Penalty" value={`${settings.xpPenalty ?? '—'}%`} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>XP Sliders</span>
            {xpPositions.map(([pos, val]) => (
              <span
                key={pos}
                className="rounded px-1.5 py-0.5 text-xs tabular-nums"
                style={{
                  background: val !== 100 ? 'rgba(251,191,36,0.15)' : 'var(--ocean-800)',
                  color: val !== 100 ? '#fbbf24' : 'var(--ocean-400)',
                }}
              >
                {pos} {val ?? '—'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
      >
        <ControlGroup label="Season">
          <Select value={seasonId} onChange={setSeasonId}>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </ControlGroup>

        <ControlGroup label="Conference">
          <Select value={conferenceFilter} onChange={setConferenceFilter}>
            {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </ControlGroup>

        <ControlGroup label="Recruits">
          <Select value={recruitTypeFilter} onChange={(v) => setRecruitTypeFilter(v as 'all' | 'hs' | 'transfer')}>
            <option value="all">All</option>
            <option value="hs">High School</option>
            <option value="transfer">Transfers</option>
          </Select>
        </ControlGroup>

        <label className="flex cursor-pointer items-center gap-1.5 text-xs" style={{ color: 'var(--ocean-300)' }}>
          <input type="checkbox" checked={showGrades} onChange={() => setShowGrades(!showGrades)} className="accent-blue-500" />
          Show Grades
        </label>

        <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'var(--ocean-400)' }}>
          <span>{rows.length} teams</span>
          <a
            href="/api/export?type=stats"
            download
            className="rounded px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--ocean-800)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'var(--ocean-900)' }}>
              <th className="w-10 px-3 py-2.5"></th>
              <Th label="Team" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Conf" k="conference" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="OVR" k="overall" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Prestige" k="prestige" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Rank" k="recruitingRank" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Record" k="record" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              {!showGrades && <>
                <Th label="In" k="transfersIn" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Out" k="transfersOut" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Net" k="netTransfers" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★5" k="fiveStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★4" k="fourStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★3" k="threeStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★2" k="twoStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★1" k="oneStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              <Th label="Signed" k="recruitCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>HS</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>XFER</th>
              {showGrades && (
                <>
                  <Th label="Avg" k="avgGrade" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Atm</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Brand</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Budget</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Trad</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Conf</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>Facilities</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isHS = recruitTypeFilter === 'hs';
              const isXfer = recruitTypeFilter === 'transfer';
              const s5 = isHS ? r.fiveStarsHS : isXfer ? r.fiveStarsXfer : r.fiveStars;
              const s4 = isHS ? r.fourStarsHS : isXfer ? r.fourStarsXfer : r.fourStars;
              const s3 = isHS ? r.threeStarsHS : isXfer ? r.threeStarsXfer : r.threeStars;
              const s2 = isHS ? r.twoStarsHS : isXfer ? r.twoStarsXfer : r.twoStars;
              const s1 = isHS ? r.oneStarsHS : isXfer ? r.oneStarsXfer : r.oneStars;
              return (
              <tr
                key={r.id}
                className="transition-colors"
                style={{ background: i % 2 === 0 ? 'var(--ocean-950)' : 'rgba(13,31,60,0.5)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ocean-800)'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'var(--ocean-950)' : 'rgba(13,31,60,0.5)'}
              >
                <td className="px-3 py-2">
                  {r.team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div style={{ width: 28, height: 28, flexShrink: 0 }}>
                      <img src={r.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.35)) drop-shadow(0 0 1px rgba(255,255,255,0.5))' }} />
                    </div>
                  ) : <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 4, background: 'var(--ocean-800)' }} />}
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--ocean-100)' }}>{r.team.name}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-400)' }}>{r.team.conference}</td>
                <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: ovrColor(r.overall) }}>{r.overall ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.prestige ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.recruitingRank ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.wins ?? 0}-{r.losses ?? 0}</td>
                {!showGrades && <>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#34d399' }}>{r.transfersIn ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#fb7185' }}>{r.transfersOut ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: netColor((r.transfersIn ?? 0) - (r.transfersOut ?? 0)) }}>
                    {formatNet((r.transfersIn ?? 0) - (r.transfersOut ?? 0))}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium" style={{ color: '#fbbf24' }}>{s5 || '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#a78bfa' }}>{s4 || '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#60a5fa' }}>{s3 || '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#34d399' }}>{s2 || '—'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#94a3b8' }}>{s1 || '—'}</td>
                </>}
                <td className="px-3 py-2 tabular-nums font-medium" style={{ color: 'var(--ocean-200)' }}>
                  {isHS ? (r.hsRecruits ?? '—') : isXfer ? (r.transferRecruits ?? '—') : (r.recruitCount ?? '—')}
                </td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--ocean-300)' }}>{r.hsRecruits ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--ocean-300)' }}>{r.transferRecruits ?? '—'}</td>
                {showGrades && (
                  <>
                    <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: gradeColor(r.avgGrade) }}>{r.avgGrade?.toFixed(1) ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeAtmosphere ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBrand ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBudget ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeTraditions ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeConference ?? '—'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ocean-200)' }}>
                      {r.gradeFacilities ?? '—'}{r.facilitiesScore != null ? ` (${r.facilitiesScore})` : ''}
                    </td>
                  </>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function netColor(n: number): string {
  if (n > 0) return '#34d399';
  if (n < 0) return '#fb7185';
  return 'var(--ocean-400)';
}

function formatNet(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function ovrColor(ovr: number | null): string {
  if (ovr == null) return 'var(--ocean-400)';
  if (ovr >= 88) return '#34d399';
  if (ovr >= 80) return '#60a5fa';
  if (ovr >= 72) return '#fbbf24';
  return '#fb7185';
}

function gradeColor(avg: number | null): string {
  if (avg == null) return 'var(--ocean-400)';
  if (avg >= 3.7) return '#34d399';
  if (avg >= 3.0) return '#60a5fa';
  if (avg >= 2.0) return '#fbbf24';
  return '#fb7185';
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ color: 'var(--ocean-500)' }}>{label}:</span>
      <span className="font-medium" style={{ color: 'var(--ocean-200)' }}>{value}</span>
    </span>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
      style={{
        background: 'var(--ocean-800)',
        borderColor: 'var(--ocean-700)',
        color: 'var(--ocean-100)',
      }}
    >
      {children}
    </select>
  );
}

function Th({ label, k, sortKey, sortDir, onClick }: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onClick(k)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide transition-colors"
      style={{ color: active ? 'var(--ocean-100)' : 'var(--ocean-500)' }}
    >
      {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}
