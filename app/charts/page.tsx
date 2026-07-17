'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type HistoryRow = {
  overall: number | null;
  prestige: number | null;
  recruitingRank: number | null;
  transfersIn: number | null;
  transfersOut: number | null;
  recruitCount: number | null;
  fiveStars: number | null;
  fourStars: number | null;
  threeStars: number | null;
  twoStars: number | null;
  oneStars: number | null;
  avgGrade: number | null;
  facilitiesScore: number | null;
  gradeAcademic: string | null;
  gradeCampus: string | null;
  gradeCoachStability: string | null;
  gradeCoachPrestige: string | null;
  gradeChampion: string | null;
  gradeProQB: string | null; gradeProRB: string | null; gradeProWR: string | null;
  gradeProTE: string | null; gradeProOL: string | null; gradeProDL: string | null;
  gradeProLB: string | null; gradeProDB: string | null; gradeProK: string | null; gradeProP: string | null;
  team: { id: string; name: string; conference: string };
  season: { id: string; year: number };
};

type SeasonSetting = {
  seasonId: string;
  year: number;
  unsignedHSFiveStar: number | null;
  unsignedHSFourStar: number | null;
  unsignedHSThreeStar: number | null;
  unsignedXferFiveStar: number | null;
  unsignedXferFourStar: number | null;
  unsignedXferThreeStar: number | null;
};

const GRADE_NUM: Record<string, number> = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};

const LINE_INDICATORS = [
  { key: 'overall', label: 'Overall Rating' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'recruitingRank', label: 'Recruiting Class Rank' },
  { key: 'transfersIn', label: 'Transfers In' },
  { key: 'transfersOut', label: 'Transfers Out' },
  { key: 'recruitCount', label: 'Recruits Signed' },
  { key: 'fiveStars', label: '5-Star Recruits' },
  { key: 'fourStars', label: '4-Star Recruits' },
  { key: 'threeStars', label: '3-Star Recruits' },
  { key: 'twoStars', label: '2-Star Recruits' },
  { key: 'oneStars', label: '1-Star Recruits' },
  { key: 'netTransfers', label: 'Net Transfers (In − Out)' },
  { key: 'avgGrade', label: 'Avg School Grade' },
  { key: 'facilitiesScore', label: 'Facilities Score (0–100)' },
  { key: 'gradeAcademic', label: 'Academic Prestige Grade' },
  { key: 'gradeCampus', label: 'Campus Lifestyle Grade' },
  { key: 'gradeChampion', label: 'Championship Contender Grade' },
  { key: 'gradeCoachStability', label: 'Coach Stability Grade' },
  { key: 'gradeCoachPrestige', label: 'Coach Prestige Grade' },
  { key: 'gradeProQB', label: 'Pro Potential: QB' },
  { key: 'gradeProRB', label: 'Pro Potential: RB' },
  { key: 'gradeProWR', label: 'Pro Potential: WR' },
  { key: 'gradeProTE', label: 'Pro Potential: TE' },
  { key: 'gradeProOL', label: 'Pro Potential: OL' },
  { key: 'gradeProDL', label: 'Pro Potential: DL' },
  { key: 'gradeProLB', label: 'Pro Potential: LB' },
  { key: 'gradeProDB', label: 'Pro Potential: DB' },
  { key: 'gradeProK', label: 'Pro Potential: K' },
  { key: 'gradeProP', label: 'Pro Potential: P' },
] as const;
type IndicatorKey = (typeof LINE_INDICATORS)[number]['key'];

const COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#f97316', '#818cf8', '#4ade80'];

const STAR_COLORS = {
  fiveStars: '#fbbf24',
  fourStars: '#a78bfa',
  threeStars: '#60a5fa',
  twoStars: '#34d399',
  oneStars: '#94a3b8',
};

const OVR_BANDS = [
  { label: '90–99', min: 90, max: 99, color: '#34d399' },
  { label: '80–89', min: 80, max: 89, color: '#60a5fa' },
  { label: '70–79', min: 70, max: 79, color: '#fbbf24' },
  { label: '60–69', min: 60, max: 69, color: '#f97316' },
  { label: '<60',   min: 0,  max: 59, color: '#fb7185' },
];

const AXIS_STYLE = { ticks: { color: '#5a9ad4' }, grid: { color: 'rgba(19,45,84,0.8)' } };
const LEGEND_STYLE = { labels: { color: '#b8d8f2' } };

type ChartMode = 'line' | 'composition' | 'ovr-bands' | 'unsigned-national' | 'net-transfers-national';

const NATIONAL_MODES: ChartMode[] = ['ovr-bands', 'unsigned-national', 'net-transfers-national'];

export default function ChartsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [settings, setSettings] = useState<SeasonSetting[]>([]);
  const [mode, setMode] = useState<ChartMode>('line');
  const [indicator, setIndicator] = useState<IndicatorKey>('overall');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/history').then((r) => r.json()),
      fetch('/api/seasons').then((r) => r.json()),
    ]).then(async ([histData, seasons]: [HistoryRow[], { id: string; year: number }[]]) => {
      setHistory(histData);
      const settled = await Promise.all(
        seasons.map((s) =>
          fetch(`/api/settings?seasonId=${s.id}`)
            .then((r) => r.json())
            .then((d) => (d ? { ...d, seasonId: s.id, year: s.year } : null))
        )
      );
      setSettings(settled.filter(Boolean) as SeasonSetting[]);
      setLoading(false);
    });
  }, []);

  const isNational = NATIONAL_MODES.includes(mode);

  const conferences = useMemo(() => {
    const set = new Set(history.map((h) => h.team.conference));
    return ['All', ...Array.from(set).sort()];
  }, [history]);

  const teamsInConference = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of history) {
      if (conferenceFilter === 'All' || h.team.conference === conferenceFilter) {
        map.set(h.team.id, h.team.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [history, conferenceFilter]);

  useEffect(() => {
    setSelectedTeams(teamsInConference.slice(0, 5).map(([id]) => id));
  }, [teamsInConference]);

  const seasonYears = useMemo(() => {
    const set = new Set(history.map((h) => h.season.year));
    return Array.from(set).sort((a, b) => a - b);
  }, [history]);

  const allSelected = selectedTeams.length === teamsInConference.length;
  function toggleSelectAll() {
    if (allSelected) setSelectedTeams([]);
    else setSelectedTeams(teamsInConference.map(([id]) => id));
  }
  function toggleTeam(id: string) {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  // ── Per-team charts ──────────────────────────────────────────────────────

  const lineChartData = useMemo(() => {
    const datasets = selectedTeams.map((teamId, i) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const data = seasonYears.map((year) => {
        const row = teamRows.find((r) => r.season.year === year);
        if (!row) return null;
        if (indicator === 'netTransfers') return (row.transfersIn ?? 0) - (row.transfersOut ?? 0);
        const val = row[indicator as keyof typeof row];
        if (typeof val === 'string') return GRADE_NUM[val] ?? null;
        return val as number | null;
      });
      return { label: teamName, data, borderColor: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length], spanGaps: true, tension: 0.25 };
    });
    return { labels: seasonYears, datasets };
  }, [selectedTeams, history, seasonYears, indicator]);

  const compositionCharts = useMemo(() => {
    return selectedTeams.map((teamId) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const starKeys = ['fiveStars', 'fourStars', 'threeStars', 'twoStars', 'oneStars'] as const;
      const starLabels = ['5★', '4★', '3★', '2★', '1★'];
      const datasets = starKeys.map((key, i) => ({
        label: starLabels[i],
        data: seasonYears.map((year) => {
          const row = teamRows.find((r) => r.season.year === year);
          return row ? (row[key] ?? 0) : 0;
        }),
        backgroundColor: STAR_COLORS[key],
      }));
      return { teamName, data: { labels: seasonYears, datasets } };
    });
  }, [selectedTeams, history, seasonYears]);

  // ── National charts ──────────────────────────────────────────────────────

  // 1. OVR bands — count of teams in each band per season
  const ovrBandsData = useMemo(() => {
    const datasets = OVR_BANDS.map((band) => ({
      label: band.label,
      data: seasonYears.map((year) => {
        const rows = history.filter((h) => h.season.year === year && h.overall != null);
        return rows.filter((h) => h.overall! >= band.min && h.overall! <= band.max).length;
      }),
      backgroundColor: band.color,
    }));
    return { labels: seasonYears, datasets };
  }, [history, seasonYears]);

  // 2. Unsigned recruits national — HS vs Transfer, 5★/4★/3★ only
  const unsignedNationalData = useMemo(() => {
    const sorted = [...settings].sort((a, b) => a.year - b.year);
    const labels = sorted.map((s) => s.year);
    return {
      labels,
      datasets: [
        { label: 'HS 5★',   data: sorted.map((s) => s.unsignedHSFiveStar ?? 0),   backgroundColor: '#fbbf24', stack: 'hs' },
        { label: 'HS 4★',   data: sorted.map((s) => s.unsignedHSFourStar ?? 0),   backgroundColor: '#a78bfa', stack: 'hs' },
        { label: 'HS 3★',   data: sorted.map((s) => s.unsignedHSThreeStar ?? 0),  backgroundColor: '#60a5fa', stack: 'hs' },
        { label: 'Xfer 5★', data: sorted.map((s) => s.unsignedXferFiveStar ?? 0), backgroundColor: '#fbbf2480', stack: 'xfer' },
        { label: 'Xfer 4★', data: sorted.map((s) => s.unsignedXferFourStar ?? 0), backgroundColor: '#a78bfa80', stack: 'xfer' },
        { label: 'Xfer 3★', data: sorted.map((s) => s.unsignedXferThreeStar ?? 0),backgroundColor: '#60a5fa80', stack: 'xfer' },
      ],
    };
  }, [settings]);

  // 3. Net transfers national — total In and Out per season
  const netTransfersNationalData = useMemo(() => {
    const datasets = [
      {
        label: 'Transfers In',
        data: seasonYears.map((year) =>
          history.filter((h) => h.season.year === year).reduce((s, h) => s + (h.transfersIn ?? 0), 0)
        ),
        backgroundColor: '#34d399',
      },
      {
        label: 'Transfers Out',
        data: seasonYears.map((year) =>
          history.filter((h) => h.season.year === year).reduce((s, h) => s + (h.transfersOut ?? 0), 0)
        ),
        backgroundColor: '#fb7185',
      },
    ];
    return { labels: seasonYears, datasets };
  }, [history, seasonYears]);

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;
  if (!history.length) return <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-400)' }}>No data yet — import a save first.</div>;

  const indicatorLabel = LINE_INDICATORS.find((i) => i.key === indicator)?.label ?? indicator;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Chart</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as ChartMode)}
            className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
            style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}>
            <option value="line">Trend Line</option>
            <option value="composition">Recruit Composition</option>
            <option disabled>──────────</option>
            <option value="ovr-bands">National: OVR Bands</option>
            <option value="unsigned-national">National: Unsigned Recruits</option>
            <option value="net-transfers-national">National: Net Transfers</option>
          </select>
        </div>

        {mode === 'line' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Indicator</span>
            <select value={indicator} onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
              className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
              style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}>
              {LINE_INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>
        )}

        {!isNational && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Conference</span>
            <select value={conferenceFilter} onChange={(e) => setConferenceFilter(e.target.value)}
              className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
              style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}>
              {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="ml-auto">
          <a href="/api/export?type=stats" download
            className="rounded px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}>
            Export CSV
          </a>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isNational ? '' : 'lg:grid-cols-[1fr_260px]'}`}>
        {/* Chart area */}
        <div>
          {/* ── Trend line ── */}
          {mode === 'line' && (
            <div className="rounded-lg border p-5" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>{indicatorLabel} by Season</h2>
              <Line data={lineChartData} options={{
                responsive: true,
                scales: {
                  x: AXIS_STYLE,
                  y: { reverse: indicator === 'recruitingRank', ...AXIS_STYLE },
                },
                plugins: { legend: LEGEND_STYLE },
              }} />
            </div>
          )}

          {/* ── Recruit composition ── */}
          {mode === 'composition' && (
            <div className="flex flex-col gap-4">
              {compositionCharts.length === 0 && (
                <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)', color: 'var(--ocean-400)' }}>
                  Select teams to see recruit composition
                </div>
              )}
              {compositionCharts.map(({ teamName, data }) => (
                <div key={teamName} className="rounded-lg border p-5" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
                  <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>{teamName} — Recruit Composition</h2>
                  <div style={{ height: 200 }}>
                    <Bar data={data} options={{
                      responsive: true, maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true, ...AXIS_STYLE },
                        y: { stacked: true, ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 }, title: { display: true, text: 'Recruits', color: '#5a9ad4' } },
                      },
                      plugins: { legend: LEGEND_STYLE },
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── National: OVR bands ── */}
          {mode === 'ovr-bands' && (
            <div className="rounded-lg border p-5" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
              <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Overall Rating Distribution by Season</h2>
              <p className="mb-4 text-xs" style={{ color: 'var(--ocean-500)' }}>Number of teams in each OVR band nationally</p>
              <Bar data={ovrBandsData} options={{
                responsive: true,
                scales: {
                  x: { stacked: true, ...AXIS_STYLE },
                  y: { stacked: true, ...AXIS_STYLE, title: { display: true, text: 'Teams', color: '#5a9ad4' } },
                },
                plugins: { legend: LEGEND_STYLE },
              }} />
            </div>
          )}

          {/* ── National: Unsigned recruits ── */}
          {mode === 'unsigned-national' && (
            <div className="rounded-lg border p-5" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
              <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Unsigned Recruits — National (5★ / 4★ / 3★)</h2>
              <p className="mb-4 text-xs" style={{ color: 'var(--ocean-500)' }}>Solid = High School / JUCO &nbsp;·&nbsp; Faded = Transfer Portal</p>
              {settings.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: 'var(--ocean-400)' }}>No unsigned data — import a save first.</div>
              ) : (
                <Bar data={unsignedNationalData} options={{
                  responsive: true,
                  scales: {
                    x: AXIS_STYLE,
                    y: { ...AXIS_STYLE, title: { display: true, text: 'Unsigned', color: '#5a9ad4' } },
                  },
                  plugins: { legend: LEGEND_STYLE },
                }} />
              )}
            </div>
          )}

          {/* ── National: Net transfers ── */}
          {mode === 'net-transfers-national' && (
            <div className="rounded-lg border p-5" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
              <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Transfer Portal Volume — National</h2>
              <p className="mb-4 text-xs" style={{ color: 'var(--ocean-500)' }}>Total players entering and leaving each school nationally per season</p>
              <Bar data={netTransfersNationalData} options={{
                responsive: true,
                scales: {
                  x: AXIS_STYLE,
                  y: { ...AXIS_STYLE, title: { display: true, text: 'Players', color: '#5a9ad4' } },
                },
                plugins: { legend: LEGEND_STYLE },
              }} />
            </div>
          )}
        </div>

        {/* Team selector — hidden for national charts */}
        {!isNational && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Teams</h2>
            <div className="flex max-h-[500px] flex-col gap-1 overflow-y-auto text-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded border-b px-2 py-1.5 font-semibold" style={{ color: 'var(--ocean-100)', borderColor: 'var(--ocean-800)' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-blue-500" />
                Select All
              </label>
              {teamsInConference.map(([id, name]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors" style={{ color: 'var(--ocean-200)' }}>
                  <input type="checkbox" checked={selectedTeams.includes(id)} onChange={() => toggleTeam(id)} className="accent-blue-500" />
                  {name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
