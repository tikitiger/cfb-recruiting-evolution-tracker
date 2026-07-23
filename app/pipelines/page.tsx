'use client';

import { useEffect, useMemo, useState } from 'react';

type Season = { id: string; year: number; label: string };

type PipelineRow = {
  id: string;
  teamId: string;
  seasonId: string;
  pipeline: string;
  level: string;
  value: number;
  team: { name: string; conference: string; logoUrl: string | null };
};

type RecruitRow = {
  id: string;
  teamId: string;
  seasonId: string;
  pipeline: string;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStars: number;
  total: number;
  team: { name: string; conference: string; logoUrl: string | null; stats: { prestige: number | null }[] };
};

type PipelinePosRow = {
  teamId: string;
  pipeline: string;
  posGroup: string;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStars: number;
  total: number;
};

const POS_GROUPS = ['QB', 'HB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'] as const;

const PIPELINE_LABELS: Record<string, string> = {
  Alabama: 'Alabama', Arizona: 'Arizona', Arkansas: 'Arkansas',
  BigApple: 'New York Metro', BigSky: 'Big Sky (MT/ID/WY)', CentralFlorida: 'Central Florida',
  Colorado: 'Colorado', EastTexas: 'East Texas', Hawaii: 'Hawaii',
  Illinois: 'Illinois', Indiana: 'Indiana', Iowa: 'Iowa', Kansas: 'Kansas',
  Kentucky: 'Kentucky', Louisiana: 'Louisiana', MetroAtlanta: 'Metro Atlanta',
  Michigan: 'Michigan', Minnesota: 'Minnesota', Mississippi: 'Mississippi',
  Missouri: 'Missouri', Nebraska: 'Nebraska', Nevada: 'Nevada',
  NewEngland: 'New England', NewMexico: 'New Mexico', NorthCarolina: 'North Carolina',
  NorthFlorida: 'North Florida', NorthTexas: 'North Texas', NorthernCalifornia: 'Northern California',
  Ohio: 'Ohio', Oklahoma: 'Oklahoma', PacificNorthwest: 'Pacific Northwest',
  Pennsylvania: 'Pennsylvania', SouthCarolina: 'South Carolina', SouthFlorida: 'South Florida',
  SouthGeorgia: 'South Georgia', SouthernCalifornia: 'Southern California',
  SouthwestTexas: 'Southwest Texas', Tennessee: 'Tennessee', Tidewater: 'Tidewater (VA/NC)',
  Utah: 'Utah', WestVirginia: 'West Virginia', Wisconsin: 'Wisconsin',
};

const LEVEL_ORDER: Record<string, number> = {
  CulturalPillar: 6, HouseholdName: 5, Popular: 4, Respected: 3, NicheInterest: 2, Unrecognized: 1,
};

const LEVEL_LABELS: Record<string, string> = {
  CulturalPillar: 'Cultural Pillar', HouseholdName: 'Household Name', Popular: 'Popular',
  Respected: 'Respected', NicheInterest: 'Niche Interest', Unrecognized: 'Unrecognized',
};

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  CulturalPillar: { bg: 'rgba(0,63,92,0.1)',   text: '#003f5c' },
  HouseholdName:  { bg: 'rgba(0,107,113,0.1)', text: '#006b71' },
  Popular:        { bg: 'rgba(0,148,70,0.1)',   text: '#007a3a' },
  Respected:      { bg: 'rgba(101,163,28,0.1)', text: '#4a7a00' },
  NicheInterest:  { bg: 'rgba(177,170,0,0.1)',  text: '#7a7200' },
};

function LevelBadge({ level }: { level: string }) {
  const c = LEVEL_COLORS[level] ?? { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' };
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
      padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
    }}>
      {LEVEL_LABELS[level] ?? level}
    </span>
  );
}

function StarCell({ n, color }: { n: number; color: string }) {
  if (n === 0) return <span style={{ color: 'var(--ocean-600)', fontVariantNumeric: 'tabular-nums' }}>—</span>;
  return <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{n}</span>;
}

type ViewMode = 'team' | 'region';
type DataMode = 'influence' | 'recruits';
type SortKey = 'team' | 'conference' | 'value' | 'level' | 'total' | 'points' | 'fiveStars' | 'fourStars' | 'threeStars';

const P4 = new Set(['ACC', 'Big 12', 'Big Ten', 'SEC']);
const G5 = new Set(['American', 'CUSA', 'MAC', 'MWC', 'Sun Belt', 'Pac-12']);

const TH_STYLE = {
  padding: '8px 12px', textAlign: 'left' as const,
  color: 'var(--ocean-400)', fontWeight: 400,
  fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
};

export default function PipelinesPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [recruitRows, setRecruitRows] = useState<RecruitRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const [dataMode, setDataMode] = useState<DataMode>('influence');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [minLevel, setMinLevel] = useState('NicheInterest');
  const [pipelinePosRows, setPipelinePosRows] = useState<PipelinePosRow[]>([]);
  const [posGroupFilter, setPosGroupFilter] = useState('All');

  useEffect(() => {
    fetch('/api/seasons').then(r => r.json()).then((s: Season[]) => {
      setSeasons(s);
      if (s.length) setSelectedSeasonId(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/pipelines?seasonId=${selectedSeasonId}`).then(r => r.json()),
      fetch(`/api/pipeline-recruits?seasonId=${selectedSeasonId}`).then(r => r.json()),
      fetch(`/api/pipeline-pos-recruits?seasonId=${selectedSeasonId}`).then(r => r.json()),
    ]).then(([pipelineData, recruitData, posData]: [PipelineRow[], RecruitRow[], PipelinePosRow[]]) => {
      setRows(pipelineData);
      setRecruitRows(recruitData);
      setPipelinePosRows(posData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedSeasonId]);

  const teamNames = useMemo(() => {
    const names = [...new Set(rows.map(r => r.team.name))].sort();
    return names;
  }, [rows]);

  const regionKeys = useMemo(() => {
    const keys = [...new Set(rows.map(r => r.pipeline))].sort((a, b) =>
      (PIPELINE_LABELS[a] ?? a).localeCompare(PIPELINE_LABELS[b] ?? b)
    );
    return keys;
  }, [rows]);

  useEffect(() => {
    if (teamNames.length && !selectedTeam) setSelectedTeam(teamNames[0]);
  }, [teamNames, selectedTeam]);

  useEffect(() => {
    if (regionKeys.length && !selectedRegion) setSelectedRegion(regionKeys[0]);
  }, [regionKeys, selectedRegion]);

  // Reset sort key when switching data modes
  useEffect(() => {
    if (dataMode === 'influence') setSortKey('value');
    else setSortKey('total');
    setSortAsc(false);
  }, [dataMode]);

  const teamViewRows = useMemo(() => {
    if (viewMode !== 'team' || !selectedTeam) return [];
    return rows
      .filter(r => r.team.name === selectedTeam)
      .sort((a, b) => b.value - a.value);
  }, [rows, viewMode, selectedTeam]);

  // Reset pos group filter when switching to influence mode
  useEffect(() => {
    if (dataMode === 'influence') setPosGroupFilter('All');
  }, [dataMode]);

  // Lookup map: teamId|pipeline → posGroup → PipelinePosRow
  const posFilterMap = useMemo(() => {
    const m = new Map<string, Map<string, PipelinePosRow>>();
    for (const r of pipelinePosRows) {
      const key = `${r.teamId}|${r.pipeline}`;
      if (!m.has(key)) m.set(key, new Map());
      m.get(key)!.set(r.posGroup, r);
    }
    return m;
  }, [pipelinePosRows]);

  // Lookup map: teamName|pipeline → { level, value } from influence rows
  const influenceByTeamPipeline = useMemo(() => {
    const m = new Map<string, { level: string; value: number }>();
    for (const r of rows) m.set(`${r.team.name}|${r.pipeline}`, { level: r.level, value: r.value });
    return m;
  }, [rows]);

  const pts = (r: RecruitRow) => r.fiveStars * 5 + r.fourStars * 3 + r.threeStars * 1;

  // Team recruit view: per-pipeline breakdown for selected team
  const teamRecruitRows = useMemo(() => {
    if (viewMode !== 'team' || !selectedTeam) return [];
    return recruitRows
      .filter(r => r.team.name === selectedTeam)
      .sort((a, b) => b.total - a.total);
  }, [recruitRows, viewMode, selectedTeam]);

  const minLevelOrder = LEVEL_ORDER[minLevel] ?? 2;

  const regionViewRows = useMemo(() => {
    if (viewMode !== 'region' || !selectedRegion) return [];
    let filtered = rows.filter(r =>
      r.pipeline === selectedRegion &&
      (LEVEL_ORDER[r.level] ?? 0) >= minLevelOrder
    );

    if (conferenceFilter === 'Power 4') filtered = filtered.filter(r => P4.has(r.team.conference));
    else if (conferenceFilter === 'Group of 5') filtered = filtered.filter(r => G5.has(r.team.conference));
    else if (conferenceFilter !== 'All') filtered = filtered.filter(r => r.team.conference === conferenceFilter);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'value') cmp = a.value - b.value;
      else if (sortKey === 'level') cmp = (LEVEL_ORDER[a.level] ?? 0) - (LEVEL_ORDER[b.level] ?? 0);
      else if (sortKey === 'team') cmp = a.team.name.localeCompare(b.team.name);
      else if (sortKey === 'conference') cmp = a.team.conference.localeCompare(b.team.conference);
      return sortAsc ? cmp : -cmp;
    });
    return filtered;
  }, [rows, viewMode, selectedRegion, conferenceFilter, sortKey, sortAsc, minLevelOrder]);

  // Region recruit view: all schools that recruited from selected region
  const regionRecruitRows = useMemo(() => {
    if (viewMode !== 'region' || !selectedRegion) return [];
    let filtered = recruitRows.filter(r => r.pipeline === selectedRegion);

    if (conferenceFilter === 'Power 4') filtered = filtered.filter(r => P4.has(r.team.conference));
    else if (conferenceFilter === 'Group of 5') filtered = filtered.filter(r => G5.has(r.team.conference));
    else if (conferenceFilter !== 'All') filtered = filtered.filter(r => r.team.conference === conferenceFilter);

    filtered.sort((a, b) => {
      const infA = influenceByTeamPipeline.get(`${a.team.name}|${a.pipeline}`);
      const infB = influenceByTeamPipeline.get(`${b.team.name}|${b.pipeline}`);
      let cmp = 0;
      if (sortKey === 'total') cmp = a.total - b.total;
      else if (sortKey === 'points') cmp = pts(a) - pts(b);
      else if (sortKey === 'fiveStars') cmp = a.fiveStars - b.fiveStars;
      else if (sortKey === 'fourStars') cmp = a.fourStars - b.fourStars;
      else if (sortKey === 'threeStars') cmp = a.threeStars - b.threeStars;
      else if (sortKey === 'team') cmp = a.team.name.localeCompare(b.team.name);
      else if (sortKey === 'conference') cmp = a.team.conference.localeCompare(b.team.conference);
      else if (sortKey === 'value') cmp = (infA?.value ?? -1) - (infB?.value ?? -1);
      else if (sortKey === 'level') cmp = (LEVEL_ORDER[infA?.level ?? ''] ?? 0) - (LEVEL_ORDER[infB?.level ?? ''] ?? 0);
      return sortAsc ? cmp : -cmp;
    });
    return filtered;
  }, [recruitRows, influenceByTeamPipeline, viewMode, selectedRegion, conferenceFilter, sortKey, sortAsc]);

  const conferences = useMemo(() => {
    return [...new Set(rows.map(r => r.team.conference))].sort();
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortHeader({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        style={{
          cursor: 'pointer', userSelect: 'none', padding: '8px 12px',
          textAlign: right ? 'right' : 'left',
          color: active ? 'var(--ocean-100)' : 'var(--ocean-400)',
          fontWeight: active ? 700 : 400,
          fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}
      >
        {label} {active ? (sortAsc ? '▲' : '▼') : ''}
      </th>
    );
  }

  const selStyle = {
    background: 'var(--ocean-800)', color: 'var(--ocean-100)',
    border: '1px solid var(--ocean-700)', borderRadius: 6,
    padding: '6px 10px', fontSize: '0.875rem',
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 500,
    background: active ? 'var(--ocean-600)' : 'var(--ocean-800)',
    color: active ? '#fff' : 'var(--ocean-400)',
    border: 'none',
    cursor: 'pointer',
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} style={selStyle}>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ocean-700)' }}>
          {(['team', 'region'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={toggleBtnStyle(viewMode === m)}>
              {m === 'team' ? 'By Team' : 'By Region'}
            </button>
          ))}
        </div>

        {/* Data mode toggle */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ocean-700)' }}>
          {([['influence', 'Pipeline Influence'], ['recruits', 'HS Recruits']] as [DataMode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setDataMode(m)} style={toggleBtnStyle(dataMode === m)}>
              {label}
            </button>
          ))}
        </div>

        {dataMode === 'recruits' && (
          <select value={posGroupFilter} onChange={e => setPosGroupFilter(e.target.value)} style={selStyle}>
            <option value="All">All Positions</option>
            {POS_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}

        {viewMode === 'team' && (
          <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={selStyle}>
            {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}

        {viewMode === 'region' && (
          <>
            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} style={selStyle}>
              {regionKeys.map(k => <option key={k} value={k}>{PIPELINE_LABELS[k] ?? k}</option>)}
            </select>

            {dataMode === 'influence' && (
              <select value={minLevel} onChange={e => setMinLevel(e.target.value)} style={selStyle}>
                <option value="CulturalPillar">Cultural Pillar+</option>
                <option value="HouseholdName">Household Name+</option>
                <option value="Popular">Popular+</option>
                <option value="Respected">Respected+</option>
                <option value="NicheInterest">Niche Interest+</option>
              </select>
            )}

            <select value={conferenceFilter} onChange={e => setConferenceFilter(e.target.value)} style={selStyle}>
              <option value="All">All Conferences</option>
              <option value="Power 4">Power 4</option>
              <option value="Group of 5">Group of 5</option>
              <option disabled>──────────</option>
              {conferences.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-4">
        <a
          href="/api/export?type=pipelines"
          style={{
            background: 'var(--ocean-800)', color: 'var(--ocean-300)',
            border: '1px solid var(--ocean-700)', borderRadius: 6,
            padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          ↓ Export Pipeline Influence CSV
        </a>
        <a
          href="/api/export?type=pipeline-recruits"
          style={{
            background: 'var(--ocean-800)', color: 'var(--ocean-300)',
            border: '1px solid var(--ocean-700)', borderRadius: 6,
            padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          ↓ Export HS Recruits CSV
        </a>
      </div>

      {loading && <p style={{ color: 'var(--ocean-400)' }}>Loading…</p>}
      {!loading && rows.length === 0 && selectedSeasonId && (
        <p style={{ color: 'var(--ocean-400)' }}>No pipeline data found. Re-import your save to populate this data.</p>
      )}

      {/* Team / Influence view */}
      {viewMode === 'team' && dataMode === 'influence' && teamViewRows.length > 0 && (
        <div>
          <h2 style={{ color: 'var(--ocean-100)', fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {teamViewRows[0]?.team.logoUrl && (
              <img src={teamViewRows[0].team.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            )}
            {selectedTeam} — Pipeline Influence
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ocean-700)' }}>
                  <th style={TH_STYLE}>Region</th>
                  <th style={TH_STYLE}>Tier</th>
                  <th style={{ ...TH_STYLE, textAlign: 'right' }}>Influence</th>
                </tr>
              </thead>
              <tbody>
                {teamViewRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)', borderBottom: '1px solid var(--ocean-700)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-100)' }}>{PIPELINE_LABELS[r.pipeline] ?? r.pipeline}</td>
                    <td style={{ padding: '7px 12px' }}><LevelBadge level={r.level} /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team / Recruits view */}
      {viewMode === 'team' && dataMode === 'recruits' && (
        <div>
          <h2 style={{ color: 'var(--ocean-100)', fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {teamRecruitRows[0]?.team.logoUrl && (
              <img src={teamRecruitRows[0].team.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            )}
            {selectedTeam} — HS Recruits by Pipeline
          </h2>
          <p style={{ color: 'var(--ocean-600)', fontSize: '0.72rem', marginBottom: 10 }}>
            Pts: ★★★★★ = 5 &nbsp;·&nbsp; ★★★★ = 3 &nbsp;·&nbsp; ★★★ = 1 &nbsp;·&nbsp; ★★ / ★ = 0
          </p>
          {teamRecruitRows.length === 0 ? (
            <p style={{ color: 'var(--ocean-400)' }}>No HS recruit data for this team. Re-import your save to populate.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ocean-700)' }}>
                    <th style={TH_STYLE}>Region</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>Prestige</th>
                    <th style={TH_STYLE}>Tier</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>Influence</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>★★★★★</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>★★★★</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>★★★</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>★★</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>★</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>Total</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRecruitRows.map((r, i) => {
                    const inf = influenceByTeamPipeline.get(`${r.team.name}|${r.pipeline}`);
                    const ZERO_COUNTS = { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0, total: 0 };
                    const posRow = posGroupFilter !== 'All' ? posFilterMap.get(`${r.teamId}|${r.pipeline}`)?.get(posGroupFilter) : null;
                    const d = posGroupFilter !== 'All' ? (posRow ?? ZERO_COUNTS) : r;
                    return (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)', borderBottom: '1px solid var(--ocean-700)' }}>
                      <td style={{ padding: '7px 12px', color: 'var(--ocean-100)' }}>{PIPELINE_LABELS[r.pipeline] ?? r.pipeline}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{r.team.stats[0]?.prestige ?? '—'}</td>
                      <td style={{ padding: '7px 12px' }}>{inf ? <LevelBadge level={inf.level} /> : <span style={{ color: 'var(--ocean-600)' }}>—</span>}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{inf?.value ?? '—'}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.fiveStars} color="#003f5c" /></td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.fourStars} color="#006b71" /></td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.threeStars} color="#009446" /></td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.twoStars} color="#65a31c" /></td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.oneStars} color="#b1aa00" /></td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-200)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.total}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#003f5c', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pts(d)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Region / Influence view */}
      {viewMode === 'region' && dataMode === 'influence' && (
        <div>
          <h2 style={{ color: 'var(--ocean-100)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
            {PIPELINE_LABELS[selectedRegion] ?? selectedRegion} — School Rankings
            <span style={{ color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.8rem', marginLeft: 10 }}>
              ({regionViewRows.length} schools)
            </span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ocean-700)' }}>
                  <th style={{ ...TH_STYLE, width: 30 }}>#</th>
                  <SortHeader label="School" k="team" />
                  <SortHeader label="Conference" k="conference" />
                  <SortHeader label="Tier" k="level" />
                  <SortHeader label="Influence" k="value" right />
                </tr>
              </thead>
              <tbody>
                {regionViewRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)', borderBottom: '1px solid var(--ocean-700)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-500)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.team.logoUrl && (
                          <div style={{ width: 22, height: 22, flexShrink: 0 }}>
                            <img src={r.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' }} />
                          </div>
                        )}
                        <span style={{ color: 'var(--ocean-100)' }}>{r.team.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-300)' }}>{r.team.conference}</td>
                    <td style={{ padding: '7px 12px' }}><LevelBadge level={r.level} /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{r.value}</td>
                  </tr>
                ))}
                {regionViewRows.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px 12px', color: 'var(--ocean-500)', textAlign: 'center' }}>No schools at or above selected tier in this region.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Region / Recruits view */}
      {viewMode === 'region' && dataMode === 'recruits' && (
        <div>
          <h2 style={{ color: 'var(--ocean-100)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
            {PIPELINE_LABELS[selectedRegion] ?? selectedRegion} — HS Recruits by School
            <span style={{ color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.8rem', marginLeft: 10 }}>
              ({regionRecruitRows.length} schools)
            </span>
          </h2>
          <p style={{ color: 'var(--ocean-600)', fontSize: '0.72rem', marginBottom: 10 }}>
            Pts: ★★★★★ = 5 &nbsp;·&nbsp; ★★★★ = 3 &nbsp;·&nbsp; ★★★ = 1 &nbsp;·&nbsp; ★★ / ★ = 0
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ocean-700)' }}>
                  <th style={{ ...TH_STYLE, width: 30 }}>#</th>
                  <SortHeader label="School" k="team" />
                  <SortHeader label="Conference" k="conference" />
                  <th style={{ ...TH_STYLE, textAlign: 'right' }}>Prestige</th>
                  <SortHeader label="Tier" k="level" />
                  <SortHeader label="Influence" k="value" right />
                  <SortHeader label="★★★★★" k="fiveStars" right />
                  <SortHeader label="★★★★" k="fourStars" right />
                  <SortHeader label="★★★" k="threeStars" right />
                  <th style={{ ...TH_STYLE, textAlign: 'right' }}>★★</th>
                  <th style={{ ...TH_STYLE, textAlign: 'right' }}>★</th>
                  <SortHeader label="Total" k="total" right />
                  <SortHeader label="Pts" k="points" right />
                </tr>
              </thead>
              <tbody>
                {regionRecruitRows.map((r, i) => {
                    const inf = influenceByTeamPipeline.get(`${r.team.name}|${r.pipeline}`);
                    const ZERO_COUNTS = { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0, total: 0 };
                    const posRow = posGroupFilter !== 'All' ? posFilterMap.get(`${r.teamId}|${r.pipeline}`)?.get(posGroupFilter) : null;
                    const d = posGroupFilter !== 'All' ? (posRow ?? ZERO_COUNTS) : r;
                    return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)', borderBottom: '1px solid var(--ocean-700)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-500)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.team.logoUrl && (
                          <div style={{ width: 22, height: 22, flexShrink: 0 }}>
                            <img src={r.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' }} />
                          </div>
                        )}
                        <span style={{ color: 'var(--ocean-100)' }}>{r.team.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-300)' }}>{r.team.conference}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{r.team.stats[0]?.prestige ?? '—'}</td>
                    <td style={{ padding: '7px 12px' }}>{inf ? <LevelBadge level={inf.level} /> : <span style={{ color: 'var(--ocean-600)' }}>—</span>}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{inf?.value ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.fiveStars} color="#003f5c" /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.fourStars} color="#006b71" /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.threeStars} color="#009446" /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.twoStars} color="#65a31c" /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}><StarCell n={d.oneStars} color="#b1aa00" /></td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ocean-200)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.total}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', color: '#003f5c', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pts(d)}</td>
                  </tr>
                  );
                })}
                {regionRecruitRows.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: '20px 12px', color: 'var(--ocean-500)', textAlign: 'center' }}>No HS recruit data for this region.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
