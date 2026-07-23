'use client';

import { useEffect, useMemo, useState } from 'react';
import { safeJson } from '@/lib/safeFetch';

type Season = { id: string; year: number; label: string };

type PosRecruit = {
  id: string;
  posGroup: string;
  total: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStars: number;
  hs: number;
  xfer: number;
  team: { id: string; name: string; conference: string; logoUrl: string | null };
};

type PlayerRating = {
  id: string;
  posGroup: string;
  r95_99: number;
  r90_94: number;
  r85_89: number;
  r80_84: number;
  r75_79: number;
  r70_74: number;
  rSub70: number;
  total: number;
  team: { id: string; name: string; conference: string; logoUrl: string | null };
};

type PlayersData = {
  posRecruits: PosRecruit[];
  playerRatings: PlayerRating[];
};

type TeamStat = { id: string; prestige: number | null; team: { name: string; conference: string } };
type PipelineRow = { teamId: string; pipeline: string; total: number };
type SignedRecruitRow = { teamId: string; firstName: string; lastName: string; position: string; posGroup: string; starRating: string; overall: number | null; recruitType: string };
type RosterPlayerRow = { teamId: string; firstName: string; lastName: string; position: string; posGroup: string; overall: number | null; starRating: string | null; schoolYear: string | null };

const POS_GROUPS = ['QB', 'HB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'] as const;
type PosGroup = typeof POS_GROUPS[number];

// Ideal combined roster+recruit depth ranges per position (lo, hi)
const IDEAL_DEPTH: Record<PosGroup, [number, number]> = {
  QB:  [3,  6],
  HB:  [5,  9],
  WR:  [9,  14],
  TE:  [3,  6],
  OL:  [12, 18],
  DL:  [10, 16],
  LB:  [8,  13],
  DB:  [11, 17],
  K:   [1,  3],
  P:   [1,  3],
};

function calcBalanceScore(posMap: Map<PosGroup, number>): number {
  let penalty = 0;
  for (const pos of POS_GROUPS) {
    const [lo, hi] = IDEAL_DEPTH[pos];
    const count = posMap.get(pos) ?? 0;
    const dev = Math.max(0, lo - count) + Math.max(0, count - hi);
    penalty += Math.min(1, dev * 0.15);
  }
  return Math.max(0, Math.round((10 - penalty) * 10) / 10);
}

function balanceBubble(score: number): React.CSSProperties {
  // 10 = navy (best), lower = amber (worst)
  const idx = Math.min(HEAT_PALETTE.length - 1, Math.floor((10 - score) / 2));
  const { rgb, text } = HEAT_PALETTE[HEAT_PALETTE.length - 1 - idx];
  return {
    display: 'inline-block',
    background: `rgba(${rgb},0.14)`,
    color: text,
    borderRadius: 4,
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 700,
    minWidth: 22,
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  };
}

// Each position gets a fixed color from the 6-color palette, cycling for offense → defense → ST
const POS_COLORS: Record<PosGroup, string> = {
  QB: '#003f5c',
  HB: '#006b71',
  WR: '#009446',
  TE: '#65a31c',
  OL: '#b1aa00',
  DL: '#ffa600',
  LB: '#003f5c',
  DB: '#006b71',
  K:  '#009446',
  P:  '#65a31c',
};

// Heat palette — low → high (recruiting value range)
const HEAT_PALETTE = [
  { rgb: '177,170,0',   text: '#7a7200' },
  { rgb: '101,163,28',  text: '#4a7a00' },
  { rgb: '0,148,70',    text: '#007a3a' },
  { rgb: '0,107,113',   text: '#006b71' },
  { rgb: '0,63,92',     text: '#003f5c' },
] as const;

// Rating bucket styles — index 0 = 95-99 (highest) → index 6 = <70 (lowest)
const BUCKET_STYLES = [
  { rgb: '0,63,92',     text: '#003f5c' },
  { rgb: '0,107,113',   text: '#006b71' },
  { rgb: '0,148,70',    text: '#007a3a' },
  { rgb: '101,163,28',  text: '#4a7a00' },
  { rgb: '177,170,0',   text: '#7a7200' },
  { rgb: '255,166,0',   text: '#b06000' },
  { rgb: '160,160,180', text: '#5a5a7a' },
] as const;

function heatBubble(val: number, min: number, max: number): React.CSSProperties {
  const t = max === min ? 1 : (val - min) / (max - min);
  const idx = Math.min(Math.floor(t * HEAT_PALETTE.length), HEAT_PALETTE.length - 1);
  const { rgb, text } = HEAT_PALETTE[idx];
  return {
    display: 'inline-block',
    background: `rgba(${rgb},0.14)`,
    color: text,
    borderRadius: 4,
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 600,
    minWidth: 22,
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  };
}

function bucketBubble(bucketIdx: number): React.CSSProperties {
  const { rgb, text } = BUCKET_STYLES[Math.min(bucketIdx, BUCKET_STYLES.length - 1)];
  return {
    display: 'inline-block',
    background: `rgba(${rgb},0.14)`,
    color: text,
    borderRadius: 4,
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: 600,
    minWidth: 22,
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  };
}

const P4 = new Set(['ACC', 'Big 12', 'Big Ten', 'SEC']);
const G5 = new Set(['American', 'CUSA', 'MAC', 'MWC', 'Sun Belt', 'Pac-12']);

type StarFilter = 'all' | '5' | '4' | '3' | '2' | '1';
type RecruitTypeFilter = 'All' | 'HS' | 'Transfer';
type RecruitSortKey = 'name' | 'conf' | PosGroup | 'total';
type RatingsSortKey = 'name' | 'conf' | 'r95_99' | 'r90_94' | 'r85_89' | 'r80_84' | 'r75_79' | 'r70_74' | 'rSub70';

const RATING_BUCKETS: { key: keyof PlayerRating; label: string }[] = [
  { key: 'r95_99', label: '95–99' },
  { key: 'r90_94', label: '90–94' },
  { key: 'r85_89', label: '85–89' },
  { key: 'r80_84', label: '80–84' },
  { key: 'r75_79', label: '75–79' },
  { key: 'r70_74', label: '70–74' },
  { key: 'rSub70', label: '<70' },
];

export default function PlayersPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [data, setData] = useState<PlayersData | null>(null);
  const [stats, setStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [confFilter, setConfFilter] = useState('All');
  const [pipelineFilter, setPipelineFilter] = useState('All');
  const [recruitTypeFilter, setRecruitTypeFilter] = useState<RecruitTypeFilter>('All');
  const [pipelineRows, setPipelineRows] = useState<PipelineRow[]>([]);
  const [signedRecruits, setSignedRecruits] = useState<SignedRecruitRow[]>([]);
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayerRow[]>([]);
  const [tooltip, setTooltip] = useState<{ teamId: string; posGroup: string; x: number; y: number } | null>(null);
  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [view, setView] = useState<'recruiting' | 'ratings' | 'depth'>('recruiting');
  const [ratingsPos, setRatingsPos] = useState<PosGroup | 'ALL'>('ALL');

  const [recruitSort, setRecruitSort] = useState<{ key: RecruitSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [ratingsSort, setRatingsSort] = useState<{ key: RatingsSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [depthSort, setDepthSort] = useState<{ key: RecruitSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  useEffect(() => {
    safeJson<Season[]>('/api/seasons').then((res) => {
      const s = res.ok ? (res.data ?? []) : [];
      setSeasons(s);
      if (s.length) setSeasonId(s[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setData(null);
    setPipelineRows([]);
    setSignedRecruits([]);
    setRosterPlayers([]);
    Promise.all([
      safeJson<PlayersData>(`/api/players?seasonId=${seasonId}`),
      safeJson<TeamStat[]>(`/api/stats?seasonId=${seasonId}`),
      safeJson<PipelineRow[]>(`/api/pipeline-recruits?seasonId=${seasonId}`),
      safeJson<SignedRecruitRow[]>(`/api/recruits?seasonId=${seasonId}`),
      safeJson<RosterPlayerRow[]>(`/api/roster-players?seasonId=${seasonId}`),
    ]).then(([playerRes, statsRes, pipelineRes, recruitsRes, rosterRes]) => {
      if (playerRes.ok && playerRes.data) setData(playerRes.data);
      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (pipelineRes.ok && pipelineRes.data) setPipelineRows(pipelineRes.data);
      if (recruitsRes.ok && recruitsRes.data) setSignedRecruits(recruitsRes.data);
      if (rosterRes.ok && rosterRes.data) setRosterPlayers(rosterRes.data);
    });
  }, [seasonId]);

  const conferences = useMemo(() => {
    if (!data) return ['All'];
    const set = new Set(data.posRecruits.map((r) => r.team.conference));
    return ['All', 'Power 4', 'Group of 5', ...Array.from(set).sort()];
  }, [data]);

  const pipelineNames = useMemo(() => {
    const names = new Set(pipelineRows.map((r) => r.pipeline));
    return ['All', ...Array.from(names).sort()];
  }, [pipelineRows]);

  // teamId → set of pipelines they have recruits from
  const teamPipelineMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of pipelineRows) {
      if (r.total > 0) {
        if (!map.has(r.teamId)) map.set(r.teamId, new Set());
        map.get(r.teamId)!.add(r.pipeline);
      }
    }
    return map;
  }, [pipelineRows]);

  const filteredTeamIds = useMemo(() => {
    if (!data) return new Set<string>();
    const all = data.posRecruits.map((r) => r.team);
    const unique = Array.from(new Map(all.map((t) => [t.id, t])).values());
    let filtered = unique;
    if (confFilter === 'Power 4') filtered = filtered.filter((t) => P4.has(t.conference));
    else if (confFilter === 'Group of 5') filtered = filtered.filter((t) => G5.has(t.conference));
    else if (confFilter !== 'All') filtered = filtered.filter((t) => t.conference === confFilter);
    if (pipelineFilter !== 'All') {
      filtered = filtered.filter((t) => teamPipelineMap.get(t.id)?.has(pipelineFilter));
    }
    return new Set(filtered.map((t) => t.id));
  }, [data, confFilter, pipelineFilter, teamPipelineMap]);

  const pivot = useMemo(() => {
    if (!data) return new Map<string, Map<PosGroup, number>>();
    const map = new Map<string, Map<PosGroup, number>>();
    for (const r of data.posRecruits) {
      if (!filteredTeamIds.has(r.team.id)) continue;
      if (!map.has(r.team.id)) map.set(r.team.id, new Map());
      const byType =
        recruitTypeFilter === 'HS' ? r.hs
        : recruitTypeFilter === 'Transfer' ? r.xfer
        : null;
      const val = byType !== null ? byType
        : starFilter === 'all' ? r.total
        : starFilter === '5' ? r.fiveStars
        : starFilter === '4' ? r.fourStars
        : starFilter === '3' ? r.threeStars
        : starFilter === '2' ? r.twoStars
        : r.oneStars;
      if (POS_GROUPS.includes(r.posGroup as PosGroup)) {
        map.get(r.team.id)!.set(r.posGroup as PosGroup, val);
      }
    }
    return map;
  }, [data, filteredTeamIds, starFilter, recruitTypeFilter]);

  // All unique teams in filtered set (with team object for logo)
  const baseTeams = useMemo(() => {
    if (!data) return new Map<string, PosRecruit['team']>();
    const map = new Map<string, PosRecruit['team']>();
    for (const r of data.posRecruits) {
      if (filteredTeamIds.has(r.team.id)) map.set(r.team.id, r.team);
    }
    return map;
  }, [data, filteredTeamIds]);


  const teamRows = useMemo(() => {
    let teams = Array.from(baseTeams.values());
    // Exclude teams with all-zero counts when star filter is active
    if (starFilter !== 'all') {
      teams = teams.filter((t) => POS_GROUPS.some((p) => (pivot.get(t.id)?.get(p) ?? 0) > 0));
    }
    const { key, dir } = recruitSort;
    const mul = dir === 'asc' ? 1 : -1;
    return [...teams].sort((a, b) => {
      if (key === 'name') return mul * a.name.localeCompare(b.name);
      if (key === 'conf') return mul * a.conference.localeCompare(b.conference);
      if (key === 'total') {
        const aT = POS_GROUPS.reduce((s, p) => s + (pivot.get(a.id)?.get(p) ?? 0), 0);
        const bT = POS_GROUPS.reduce((s, p) => s + (pivot.get(b.id)?.get(p) ?? 0), 0);
        return mul * (aT - bT);
      }
      return mul * ((pivot.get(a.id)?.get(key as PosGroup) ?? 0) - (pivot.get(b.id)?.get(key as PosGroup) ?? 0));
    });
  }, [baseTeams, pivot, starFilter, recruitSort]);

  const totals = useMemo(() => {
    const t: Record<PosGroup, number> = {} as Record<PosGroup, number>;
    for (const pos of POS_GROUPS) {
      t[pos] = teamRows.reduce((s, team) => s + (pivot.get(team.id)?.get(pos) ?? 0), 0);
    }
    return t;
  }, [teamRows, pivot]);

  const ratingsRows = useMemo(() => {
    if (!data) return [];
    const filtered = data.playerRatings.filter(
      (r) => (ratingsPos === 'ALL' || r.posGroup === ratingsPos) && filteredTeamIds.has(r.team.id)
    );
    // Aggregate across all positions when ALL is selected
    const rows: PlayerRating[] = ratingsPos !== 'ALL' ? filtered : (() => {
      const agg = new Map<string, PlayerRating>();
      for (const r of filtered) {
        const existing = agg.get(r.team.id);
        if (!existing) {
          agg.set(r.team.id, { ...r });
        } else {
          for (const { key } of RATING_BUCKETS) {
            (existing[key] as number) += r[key] as number;
          }
          existing.total += r.total;
        }
      }
      return Array.from(agg.values());
    })();
    const { key, dir } = ratingsSort;
    const mul = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (key === 'name') return mul * a.team.name.localeCompare(b.team.name);
      if (key === 'conf') return mul * a.team.conference.localeCompare(b.team.conference);
      return mul * ((a[key] as number) - (b[key] as number));
    });
  }, [data, ratingsPos, filteredTeamIds, ratingsSort]);


  const ratingTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const { key } of RATING_BUCKETS) t[key as string] = ratingsRows.reduce((s, r) => s + (r[key] as number), 0);
    return t;
  }, [ratingsRows]);

  // Per-position min/max for heat coloring (non-zero values only)
  const colStats = useMemo(() => {
    const stats: Record<PosGroup, { min: number; max: number }> = {} as Record<PosGroup, { min: number; max: number }>;
    for (const pos of POS_GROUPS) {
      const vals = teamRows.map((t) => pivot.get(t.id)?.get(pos) ?? 0).filter((v) => v > 0);
      stats[pos] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };
    }
    return stats;
  }, [teamRows, pivot]);

  // Lookup maps for tooltip: teamId+posGroup → records
  const recruitsByKey = useMemo(() => {
    const m = new Map<string, SignedRecruitRow[]>();
    for (const r of signedRecruits) {
      const k = `${r.teamId}|${r.posGroup}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [signedRecruits]);

  // Positional depth: teamId → posGroup → total count (existing roster + signed recruits)
  const depthPivot = useMemo(() => {
    const map = new Map<string, Map<PosGroup, number>>();
    const add = (teamId: string, pg: string, n = 1) => {
      if (!filteredTeamIds.has(teamId)) return;
      if (!POS_GROUPS.includes(pg as PosGroup)) return;
      if (!map.has(teamId)) map.set(teamId, new Map());
      map.get(teamId)!.set(pg as PosGroup, (map.get(teamId)!.get(pg as PosGroup) ?? 0) + n);
    };
    for (const r of rosterPlayers) add(r.teamId, r.posGroup);
    for (const r of signedRecruits) add(r.teamId, r.posGroup);
    return map;
  }, [rosterPlayers, signedRecruits, filteredTeamIds]);

  const depthTeams = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, PosRecruit['team']>();
    for (const r of data.posRecruits) {
      if (filteredTeamIds.has(r.team.id)) seen.set(r.team.id, r.team);
    }
    const teams = Array.from(seen.values());
    const { key, dir } = depthSort;
    const mul = dir === 'asc' ? 1 : -1;
    return [...teams].sort((a, b) => {
      if (key === 'name') return mul * a.name.localeCompare(b.name);
      if (key === 'conf') return mul * a.conference.localeCompare(b.conference);
      if (key === 'total') {
        const aT = POS_GROUPS.reduce((s, p) => s + (depthPivot.get(a.id)?.get(p) ?? 0), 0);
        const bT = POS_GROUPS.reduce((s, p) => s + (depthPivot.get(b.id)?.get(p) ?? 0), 0);
        return mul * (aT - bT);
      }
      return mul * ((depthPivot.get(a.id)?.get(key as PosGroup) ?? 0) - (depthPivot.get(b.id)?.get(key as PosGroup) ?? 0));
    });
  }, [data, filteredTeamIds, depthPivot, depthSort]);

  const colDepthStats = useMemo(() => {
    const stats: Record<PosGroup, { min: number; max: number }> = {} as Record<PosGroup, { min: number; max: number }>;
    for (const pos of POS_GROUPS) {
      const vals = depthTeams.map((t) => depthPivot.get(t.id)?.get(pos) ?? 0).filter((v) => v > 0);
      stats[pos] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };
    }
    return stats;
  }, [depthTeams, depthPivot]);

  const depthTotals = useMemo(() => {
    const t: Record<PosGroup, number> = {} as Record<PosGroup, number>;
    for (const pos of POS_GROUPS) {
      t[pos] = depthTeams.reduce((s, team) => s + (depthPivot.get(team.id)?.get(pos) ?? 0), 0);
    }
    return t;
  }, [depthTeams, depthPivot]);

  const rosterByKey = useMemo(() => {
    const m = new Map<string, RosterPlayerRow[]>();
    for (const r of rosterPlayers) {
      const k = `${r.teamId}|${r.posGroup}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [rosterPlayers]);

  function toggleRecruitSort(key: string) {
    setRecruitSort((prev) =>
      prev.key === key ? { key: key as RecruitSortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: key as RecruitSortKey, dir: 'desc' }
    );
  }
  function toggleDepthSort(key: string) {
    setDepthSort((prev) =>
      prev.key === key ? { key: key as RecruitSortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: key as RecruitSortKey, dir: 'desc' }
    );
  }
  function toggleRatingsSort(key: string) {
    setRatingsSort((prev) =>
      prev.key === key ? { key: key as RatingsSortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: key as RatingsSortKey, dir: 'desc' }
    );
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-500)' }}>Loading…</div>;
  if (!seasons.length) return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-500)' }}>
      No seasons imported — import a save first.
    </div>
  );

  const hasPlayerData = data && (data.posRecruits.length > 0 || data.playerRatings.length > 0);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)' }}>
        <ControlGroup label="Season">
          <Select value={seasonId} onChange={setSeasonId}>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </ControlGroup>
        <ControlGroup label="Conference">
          <Select value={confFilter} onChange={setConfFilter}>
            {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </ControlGroup>
        <ControlGroup label="Stars">
          <Select value={starFilter} onChange={(v) => setStarFilter(v as StarFilter)}>
            <option value="all">All</option>
            <option value="5">5★ only</option>
            <option value="4">4★ only</option>
            <option value="3">3★ only</option>
            <option value="2">2★ only</option>
            <option value="1">1★ only</option>
          </Select>
        </ControlGroup>
        {view === 'recruiting' && pipelineNames.length > 1 && (
          <ControlGroup label="Pipeline">
            <Select value={pipelineFilter} onChange={setPipelineFilter}>
              {pipelineNames.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </ControlGroup>
        )}
        {view === 'recruiting' && (
          <ControlGroup label="Type">
            <Select value={recruitTypeFilter} onChange={(v) => setRecruitTypeFilter(v as RecruitTypeFilter)}>
              <option value="All">All</option>
              <option value="HS">HS / JUCO</option>
              <option value="Transfer">Transfer</option>
            </Select>
          </ControlGroup>
        )}
        {/* View toggle */}
        <div className="ml-auto flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--ocean-700)' }}>
          {(['recruiting', 'ratings', 'depth'] as const).map((v, i, arr) => (
            <button key={v} onClick={() => { setView(v); if (v !== 'recruiting') { setPipelineFilter('All'); setRecruitTypeFilter('All'); } }}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: view === v ? 'var(--ocean-600)' : 'var(--ocean-800)',
                color: view === v ? '#fff' : 'var(--ocean-400)',
                borderRight: i < arr.length - 1 ? '1px solid var(--ocean-700)' : undefined,
              }}>
              {v === 'recruiting' ? 'Recruiting' : v === 'ratings' ? 'Roster Ratings' : 'Positional Depth'}
            </button>
          ))}
        </div>
      </div>

      {!hasPlayerData ? (
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--ocean-700)', color: 'var(--ocean-500)' }}>
          No player data for this season — re-import your save to populate Players data.
        </div>
      ) : view === 'recruiting' ? (
        <>
          <SectionHeader>Position Recruiting — {recruitTypeFilter !== 'All' ? `${recruitTypeFilter === 'HS' ? 'HS / JUCO' : 'Transfer'} · ` : ''}{starFilter === 'all' ? 'All Stars' : `${starFilter}★`}</SectionHeader>
          <div className="overflow-x-auto rounded-lg border mb-8" style={{ borderColor: 'var(--ocean-700)' }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'var(--ocean-800)', borderBottom: '2px solid var(--ocean-700)' }}>
                  <th className="w-8 px-2 py-2.5" />
                  <SortTh label="Team"  sortKey="name"  active={recruitSort} onSort={toggleRecruitSort} left />
                  <SortTh label="Conf"  sortKey="conf"  active={recruitSort} onSort={toggleRecruitSort} left />
                  {POS_GROUPS.map((pos) => (
                    <SortTh key={pos} label={pos} sortKey={pos} active={recruitSort} onSort={toggleRecruitSort} />
                  ))}
                  <SortTh label="Total" sortKey="total" active={recruitSort} onSort={toggleRecruitSort} highlight />
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#EBF2FF', borderBottom: '2px solid var(--ocean-700)' }}>
                  <td />
                  <td className="px-3 py-2 font-bold text-xs uppercase tracking-widest" colSpan={2} style={{ color: 'var(--ocean-500)' }}>All Teams</td>
                  {POS_GROUPS.map((pos) => (
                    <td key={pos} className="px-2 py-2 text-center">
                      {totals[pos] > 0
                        ? <span style={heatBubble(totals[pos], colStats[pos].min, colStats[pos].max)}>{totals[pos]}</span>
                        : <span style={{ color: 'var(--ocean-700)', fontSize: '0.75rem' }}>—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center tabular-nums font-bold" style={{ color: 'var(--ocean-100)' }}>
                    {POS_GROUPS.reduce((s, p) => s + (totals[p] ?? 0), 0) || '—'}
                  </td>
                </tr>
                {teamRows.map((team, i) => {
                  const posMap = pivot.get(team.id) ?? new Map<PosGroup, number>();
                  const rowTotal = POS_GROUPS.reduce((s, p) => s + (posMap.get(p) ?? 0), 0);
                  const rowBg = i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)';
                  return (
                    <tr key={team.id} style={{ background: rowBg }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#EBF2FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = rowBg}>
                      <td className="px-2 py-1.5">
                        {team.logoUrl
                          ? <img src={team.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                          : <div style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--ocean-700)' }} />}
                      </td>
                      <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--ocean-200)' }}>{team.name}</td>
                      <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>{team.conference}</td>
                      {POS_GROUPS.map((pos) => {
                        const val = posMap.get(pos) ?? 0;
                        return (
                          <td key={pos} className="px-2 py-1.5 text-center"
                            onMouseEnter={val > 0 ? (e) => setTooltip({ teamId: team.id, posGroup: pos, x: e.clientX, y: e.clientY }) : undefined}
                            onMouseMove={val > 0 ? (e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t) : undefined}
                            onMouseLeave={val > 0 ? () => setTooltip(null) : undefined}>
                            {val > 0
                              ? <span style={heatBubble(val, colStats[pos].min, colStats[pos].max)}>{val}</span>
                              : <span style={{ color: 'var(--ocean-700)', fontSize: '0.75rem' }}>—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-center tabular-nums font-semibold" style={{ color: 'var(--ocean-200)' }}>
                        {rowTotal || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : view === 'depth' ? (
        /* Positional Depth view */
        <>
          <SectionHeader>Positional Depth — Existing Roster + Signed Recruits by Position</SectionHeader>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ocean-700)' }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'var(--ocean-800)', borderBottom: '2px solid var(--ocean-700)' }}>
                  <th className="w-8 px-2 py-2.5" />
                  <SortTh label="Team"  sortKey="name"  active={depthSort} onSort={toggleDepthSort} left />
                  <SortTh label="Conf"  sortKey="conf"  active={depthSort} onSort={toggleDepthSort} left />
                  {POS_GROUPS.map((pos) => (
                    <SortTh key={pos} label={pos} sortKey={pos} active={depthSort} onSort={toggleDepthSort} />
                  ))}
                  <SortTh label="Total" sortKey="total" active={depthSort} onSort={toggleDepthSort} highlight />
                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ocean-200)' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#EBF2FF', borderBottom: '2px solid var(--ocean-700)' }}>
                  <td />
                  <td className="px-3 py-2 font-bold text-xs uppercase tracking-widest" colSpan={2} style={{ color: 'var(--ocean-500)' }}>All Teams</td>
                  {POS_GROUPS.map((pos) => (
                    <td key={pos} className="px-2 py-2 text-center">
                      {depthTotals[pos] > 0
                        ? <span style={heatBubble(depthTotals[pos], colDepthStats[pos].min, colDepthStats[pos].max)}>{depthTotals[pos]}</span>
                        : <span style={{ color: 'var(--ocean-600)', fontSize: '0.75rem' }}>0</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center tabular-nums font-bold" style={{ color: 'var(--ocean-100)' }}>
                    {POS_GROUPS.reduce((s, p) => s + depthTotals[p], 0)}
                  </td>
                  <td />
                </tr>
                {depthTeams.length === 0 ? (
                  <tr>
                    <td colSpan={POS_GROUPS.length + 3} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ocean-500)' }}>
                      No roster data — re-import your save to populate this table.
                    </td>
                  </tr>
                ) : depthTeams.map((team, i) => {
                  const posMap = depthPivot.get(team.id) ?? new Map<PosGroup, number>();
                  const rowTotal = POS_GROUPS.reduce((s, p) => s + (posMap.get(p) ?? 0), 0);
                  const rowBg = i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)';
                  return (
                    <tr key={team.id} style={{ background: rowBg }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#EBF2FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = rowBg}>
                      <td className="px-2 py-1.5">
                        {team.logoUrl
                          ? <img src={team.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                          : <div style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--ocean-700)' }} />}
                      </td>
                      <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--ocean-200)' }}>{team.name}</td>
                      <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>{team.conference}</td>
                      {POS_GROUPS.map((pos) => {
                        const val = posMap.get(pos) ?? 0;
                        return (
                          <td key={pos} className="px-2 py-1.5 text-center"
                            onMouseEnter={val > 0 ? (e) => setTooltip({ teamId: team.id, posGroup: pos, x: e.clientX, y: e.clientY }) : undefined}
                            onMouseMove={val > 0 ? (e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t) : undefined}
                            onMouseLeave={val > 0 ? () => setTooltip(null) : undefined}>
                            {val > 0
                              ? <span style={heatBubble(val, colDepthStats[pos].min, colDepthStats[pos].max)}>{val}</span>
                              : <span style={{ color: 'var(--ocean-600)', fontSize: '0.75rem' }}>0</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-center tabular-nums font-semibold" style={{ color: 'var(--ocean-200)' }}>
                        {rowTotal || 0}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span style={balanceBubble(calcBalanceScore(posMap))}>{calcBalanceScore(posMap).toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Roster Ratings view */
        <>
          <div className="mb-3 flex gap-0 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ocean-700)', width: 'fit-content' }}>
            {(['ALL', ...POS_GROUPS] as const).map((pos) => (
              <button key={pos} onClick={() => setRatingsPos(pos)}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: ratingsPos === pos ? 'var(--ocean-600)' : 'var(--ocean-900)',
                  color: ratingsPos === pos ? '#fff' : 'var(--ocean-400)',
                  border: 'none', cursor: 'pointer',
                  borderRight: '1px solid var(--ocean-700)',
                }}>
                {pos}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ocean-700)' }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: 'var(--ocean-800)', borderBottom: '2px solid var(--ocean-700)' }}>
                  <th className="w-8 px-2 py-2.5" />
                  <SortTh label="Team" sortKey="name" active={ratingsSort} onSort={toggleRatingsSort} left />
                  <SortTh label="Conf" sortKey="conf" active={ratingsSort} onSort={toggleRatingsSort} left />
                  {RATING_BUCKETS.map(({ key, label }) => (
                    <SortTh key={key as string} label={label} sortKey={key as string} active={ratingsSort} onSort={toggleRatingsSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#EBF2FF', borderBottom: '2px solid var(--ocean-700)' }}>
                  <td />
                  <td className="px-3 py-2 font-bold text-xs uppercase tracking-widest" colSpan={2} style={{ color: 'var(--ocean-500)' }}>All Teams</td>
                  {RATING_BUCKETS.map(({ key }, idx) => {
                    const val = ratingTotals[key as string] ?? 0;
                    return (
                      <td key={key as string} className="px-2 py-2 text-center">
                        {val > 0
                          ? <span style={bucketBubble(idx)}>{val}</span>
                          : <span style={{ color: 'var(--ocean-700)', fontSize: '0.75rem' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
                {ratingsRows.length === 0 ? (
                  <tr>
                    <td colSpan={RATING_BUCKETS.length + 3} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ocean-500)' }}>
                      No roster data for {ratingsPos} — re-import your save to populate this table.
                    </td>
                  </tr>
                ) : ratingsRows.map((r, i) => {
                  const rowBg = i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)';
                  return (
                    <tr key={r.id} style={{ background: rowBg }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#EBF2FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = rowBg}>
                      <td className="px-2 py-1.5">
                        {r.team.logoUrl
                          ? <img src={r.team.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                          : <div style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--ocean-700)' }} />}
                      </td>
                      <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--ocean-200)' }}>{r.team.name}</td>
                      <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>{r.team.conference}</td>
                      {RATING_BUCKETS.map(({ key }, idx) => {
                        const val = r[key] as number;
                        return (
                          <td key={key as string} className="px-2 py-1.5 text-center">
                            {val > 0
                              ? <span style={bucketBubble(idx)}>{val}</span>
                              : <span style={{ color: 'var(--ocean-700)', fontSize: '0.75rem' }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tooltip && (
        <RecruitTooltip
          x={tooltip.x}
          y={tooltip.y}
          recruits={recruitsByKey.get(`${tooltip.teamId}|${tooltip.posGroup}`) ?? []}
          roster={rosterByKey.get(`${tooltip.teamId}|${tooltip.posGroup}`) ?? []}
          groupByYear={view === 'depth'}
        />
      )}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function SortTh({
  label, sortKey, active, onSort, left, highlight, posColor,
}: {
  label: string;
  sortKey: string;
  active: { key: string; dir: 'asc' | 'desc' };
  onSort: (k: string) => void;
  left?: boolean;
  highlight?: boolean;
  posColor?: string;
}) {
  const isActive = active.key === sortKey;
  const baseColor = posColor ?? (highlight ? 'var(--ocean-200)' : 'var(--ocean-500)');
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="cursor-pointer select-none whitespace-nowrap px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors"
      style={{
        textAlign: left ? 'left' : 'center',
        color: isActive ? (posColor ?? 'var(--ocean-100)') : baseColor,
        borderBottom: posColor ? `2px solid ${posColor}` : undefined,
      }}
    >
      {label}{isActive ? (active.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b pb-2 text-base font-bold" style={{ color: 'var(--ocean-100)', borderColor: 'var(--ocean-700)' }}>
      {children}
    </h2>
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
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
      style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-200)' }}>
      {children}
    </select>
  );
}

const YEAR_ORDER = ['Senior', 'RS Junior', 'Junior', 'RS Sophomore', 'Sophomore', 'RS Freshman', 'Freshman'];
const STAR_ORDER = ['FIVE_STAR', 'FOUR_STAR', 'THREE_STAR', 'TWO_STAR', 'ONE_STAR'];

const STAR_LABEL: Record<string, string> = {
  FIVE_STAR: '★★★★★', FOUR_STAR: '★★★★', THREE_STAR: '★★★', TWO_STAR: '★★', ONE_STAR: '★',
};
const YEAR_SHORT: Record<string, string> = {
  Freshman: 'FR', Sophomore: 'SO', Junior: 'JR', Senior: 'SR',
  'RS Freshman': 'RS FR', 'RS Sophomore': 'RS SO', 'RS Junior': 'RS JR',
};

function RecruitTooltip({ x, y, recruits, roster, groupByYear }: {
  x: number; y: number;
  recruits: SignedRecruitRow[];
  roster: RosterPlayerRow[];
  groupByYear?: boolean;
}) {
  const hasData = recruits.length > 0 || roster.length > 0;
  if (!hasData) return null;

  const sortedRecruits = [...recruits].sort((a, b) =>
    STAR_ORDER.indexOf(a.starRating) - STAR_ORDER.indexOf(b.starRating) || (b.overall ?? 0) - (a.overall ?? 0)
  );

  const divStyle: React.CSSProperties = {
    position: 'fixed', left: x + 12, top: y + 12, zIndex: 9999,
    background: 'var(--ocean-900)', border: '1px solid var(--ocean-700)',
    borderRadius: 8, padding: '10px 14px', minWidth: 220, maxWidth: 340,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', pointerEvents: 'none',
  };

  const PlayerRow = ({ name, year, overall, stars, type }: { name: string; year?: string | null; overall?: number | null; stars?: string; type?: string }) => (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span style={{ color: 'var(--ocean-200)' }}>{name}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        {stars && <span style={{ color: '#b1aa00', fontSize: '0.65rem' }}>{STAR_LABEL[stars] ?? stars}</span>}
        {type && <span style={{ color: 'var(--ocean-500)' }}>{type}</span>}
        {year && <span style={{ color: 'var(--ocean-500)', fontSize: '0.65rem', fontWeight: 600 }}>{YEAR_SHORT[year] ?? year}</span>}
        {overall != null && <span style={{ color: 'var(--ocean-300)', fontWeight: 600 }}>{overall}</span>}
      </span>
    </div>
  );

  const SectionLabel = ({ label, border }: { label: string; border?: boolean }) => (
    <div className="mb-1.5 text-xs font-bold uppercase tracking-wide"
      style={{ color: 'var(--ocean-500)', borderTop: border ? '1px solid var(--ocean-800)' : undefined, paddingTop: border ? 8 : 0 }}>
      {label}
    </div>
  );

  if (groupByYear) {
    // Depth view: existing players grouped by class year, then incoming recruits
    const byYear = new Map<string, RosterPlayerRow[]>();
    for (const r of roster) {
      const yr = r.schoolYear ?? 'Unknown';
      if (!byYear.has(yr)) byYear.set(yr, []);
      byYear.get(yr)!.push(r);
    }
    const yearGroups = YEAR_ORDER.filter((y) => byYear.has(y));
    if (byYear.has('Unknown')) yearGroups.push('Unknown');

    return (
      <div style={divStyle}>
        {yearGroups.map((yr, gi) => (
          <div key={yr} className={gi > 0 ? 'mt-2' : ''}>
            <SectionLabel label={YEAR_SHORT[yr] ?? yr} border={gi > 0} />
            <div className="flex flex-col gap-0.5 mb-1">
              {byYear.get(yr)!.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).map((r, i) => (
                <PlayerRow key={i} name={`${r.firstName} ${r.lastName}`} overall={r.overall} />
              ))}
            </div>
          </div>
        ))}
        {sortedRecruits.length > 0 && (
          <div className={yearGroups.length > 0 ? 'mt-2' : ''}>
            <SectionLabel label="Incoming" border={yearGroups.length > 0} />
            <div className="flex flex-col gap-0.5">
              {sortedRecruits.map((r, i) => (
                <PlayerRow key={i} name={`${r.firstName} ${r.lastName}`} stars={r.starRating} type={r.recruitType} overall={r.overall} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Recruiting view: signed recruits first, then depth chart
  return (
    <div style={divStyle}>
      {sortedRecruits.length > 0 && (
        <>
          <SectionLabel label="Signed Recruits" />
          <div className="flex flex-col gap-0.5 mb-2">
            {sortedRecruits.map((r, i) => (
              <PlayerRow key={i} name={`${r.firstName} ${r.lastName}`} stars={r.starRating} type={r.recruitType} overall={r.overall} />
            ))}
          </div>
        </>
      )}
      {roster.length > 0 && (
        <>
          <SectionLabel label="Depth Chart" border={sortedRecruits.length > 0} />
          <div className="flex flex-col gap-0.5">
            {roster.map((r, i) => (
              <PlayerRow key={i} name={`${r.firstName} ${r.lastName}`} year={r.schoolYear} overall={r.overall} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
