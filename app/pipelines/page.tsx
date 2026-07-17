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
  CulturalPillar: { bg: 'rgba(234,179,8,0.25)', text: '#fde047' },
  HouseholdName: { bg: 'rgba(59,130,246,0.25)', text: '#93c5fd' },
  Popular: { bg: 'rgba(34,197,94,0.25)', text: '#86efac' },
  Respected: { bg: 'rgba(168,85,247,0.2)', text: '#d8b4fe' },
  NicheInterest: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
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

type ViewMode = 'team' | 'region';
type SortKey = 'team' | 'conference' | 'value' | 'level';

const P4 = new Set(['ACC', 'Big 12', 'Big Ten', 'SEC']);
const G5 = new Set(['American', 'CUSA', 'MAC', 'MWC', 'Sun Belt', 'Pac-12']);

export default function PipelinesPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [minLevel, setMinLevel] = useState('NicheInterest');

  useEffect(() => {
    fetch('/api/seasons').then(r => r.json()).then((s: Season[]) => {
      setSeasons(s);
      if (s.length) setSelectedSeasonId(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) return;
    setLoading(true);
    fetch(`/api/pipelines?seasonId=${selectedSeasonId}`)
      .then(r => r.json())
      .then((data: PipelineRow[]) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedSeasonId]);

  // All unique team names for the team selector
  const teamNames = useMemo(() => {
    const names = [...new Set(rows.map(r => r.team.name))].sort();
    return names;
  }, [rows]);

  // All unique region keys present in data
  const regionKeys = useMemo(() => {
    const keys = [...new Set(rows.map(r => r.pipeline))].sort((a, b) =>
      (PIPELINE_LABELS[a] ?? a).localeCompare(PIPELINE_LABELS[b] ?? b)
    );
    return keys;
  }, [rows]);

  // Initialize selectors when data loads
  useEffect(() => {
    if (teamNames.length && !selectedTeam) setSelectedTeam(teamNames[0]);
  }, [teamNames, selectedTeam]);

  useEffect(() => {
    if (regionKeys.length && !selectedRegion) setSelectedRegion(regionKeys[0]);
  }, [regionKeys, selectedRegion]);

  // Team view: pipelines for selected team
  const teamViewRows = useMemo(() => {
    if (viewMode !== 'team' || !selectedTeam) return [];
    return rows
      .filter(r => r.team.name === selectedTeam)
      .sort((a, b) => b.value - a.value);
  }, [rows, viewMode, selectedTeam]);

  // Region view: all teams ranked in selected region
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

  // All conferences for the filter
  const conferences = useMemo(() => {
    return [...new Set(rows.map(r => r.team.conference))].sort();
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        style={{ cursor: 'pointer', userSelect: 'none', padding: '8px 12px', textAlign: 'left',
          color: active ? 'var(--ocean-100)' : 'var(--ocean-400)', fontWeight: active ? 700 : 400,
          fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label} {active ? (sortAsc ? '▲' : '▼') : ''}
      </th>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedSeasonId}
          onChange={e => setSelectedSeasonId(e.target.value)}
          style={{ background: 'var(--ocean-800)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-700)',
            borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem' }}
        >
          {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ocean-700)' }}>
          {(['team', 'region'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === m ? 'var(--ocean-600)' : 'var(--ocean-800)',
                color: viewMode === m ? 'var(--ocean-100)' : 'var(--ocean-400)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {m === 'team' ? 'By Team' : 'By Region'}
            </button>
          ))}
        </div>

        {viewMode === 'team' && (
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            style={{ background: 'var(--ocean-800)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-700)',
              borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem' }}
          >
            {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}

        {viewMode === 'region' && (
          <>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              style={{ background: 'var(--ocean-800)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-700)',
                borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              {regionKeys.map(k => <option key={k} value={k}>{PIPELINE_LABELS[k] ?? k}</option>)}
            </select>

            <select
              value={minLevel}
              onChange={e => setMinLevel(e.target.value)}
              style={{ background: 'var(--ocean-800)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-700)',
                borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              <option value="CulturalPillar">Cultural Pillar+</option>
              <option value="HouseholdName">Household Name+</option>
              <option value="Popular">Popular+</option>
              <option value="Respected">Respected+</option>
              <option value="NicheInterest">Niche Interest+</option>
            </select>

            <select
              value={conferenceFilter}
              onChange={e => setConferenceFilter(e.target.value)}
              style={{ background: 'var(--ocean-800)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-700)',
                borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              <option value="All">All Conferences</option>
              <option value="Power 4">Power 4</option>
              <option value="Group of 5">Group of 5</option>
              <option disabled>──────────</option>
              {conferences.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
      </div>

      {loading && <p style={{ color: 'var(--ocean-400)' }}>Loading…</p>}
      {!loading && rows.length === 0 && selectedSeasonId && (
        <p style={{ color: 'var(--ocean-400)' }}>No pipeline data found. Re-import your save to populate this data.</p>
      )}

      {/* Team view */}
      {viewMode === 'team' && teamViewRows.length > 0 && (
        <div>
          <h2 style={{ color: 'var(--ocean-100)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
            {selectedTeam} — Pipeline Profile
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ocean-700)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Region</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tier</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Influence</th>
                </tr>
              </thead>
              <tbody>
                {teamViewRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--ocean-800)' }}>
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

      {/* Region view */}
      {viewMode === 'region' && (
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
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ocean-400)', fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', width: 30 }}>#</th>
                  <SortHeader label="School" k="team" />
                  <SortHeader label="Conference" k="conference" />
                  <SortHeader label="Tier" k="level" />
                  <SortHeader label="Influence" k="value" />
                </tr>
              </thead>
              <tbody>
                {regionViewRows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--ocean-800)' }}>
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
                    <td style={{ padding: '7px 12px', color: 'var(--ocean-300)', fontVariantNumeric: 'tabular-nums' }}>{r.value}</td>
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
    </div>
  );
}
