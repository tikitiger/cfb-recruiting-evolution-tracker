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
  team: { id: string; name: string; conference: string };
  season: { id: string; year: number };
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

type ChartMode = 'line' | 'composition';

export default function ChartsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [mode, setMode] = useState<ChartMode>('line');
  const [indicator, setIndicator] = useState<IndicatorKey>('overall');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((data: HistoryRow[]) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

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

  // Line chart data
  const lineChartData = useMemo(() => {
    const datasets = selectedTeams.map((teamId, i) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const data = seasonYears.map((year) => {
        const row = teamRows.find((r) => r.season.year === year);
        if (!row) return null;
        if (indicator === 'netTransfers') return (row.transfersIn ?? 0) - (row.transfersOut ?? 0);
        return row[indicator] as number | null;
      });
      return {
        label: teamName,
        data,
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length],
        spanGaps: true,
        tension: 0.25,
      };
    });
    return { labels: seasonYears, datasets };
  }, [selectedTeams, history, seasonYears, indicator]);

  // Composition chart data — one stacked bar chart per selected team
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

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;

  if (!history.length) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-400)' }}>No data yet — import a save first.</div>;
  }

  const indicatorLabel = LINE_INDICATORS.find((i) => i.key === indicator)?.label ?? indicator;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Controls */}
      <div
        className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Chart</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ChartMode)}
            className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
            style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
          >
            <option value="line">Trend Line</option>
            <option value="composition">Recruit Composition</option>
          </select>
        </div>

        {mode === 'line' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Indicator</span>
            <select
              value={indicator}
              onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
              className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
              style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
            >
              {LINE_INDICATORS.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Conference</span>
          <select
            value={conferenceFilter}
            onChange={(e) => setConferenceFilter(e.target.value)}
            className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
            style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
          >
            {conferences.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        {/* Chart area */}
        <div>
          {mode === 'line' ? (
            <div
              className="rounded-lg border p-5"
              style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>{indicatorLabel} by Season</h2>
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  scales: {
                    x: { ticks: { color: '#5a9ad4' }, grid: { color: 'rgba(19,45,84,0.8)' } },
                    y: {
                      reverse: indicator === 'recruitingRank',
                      ticks: { color: '#5a9ad4' },
                      grid: { color: 'rgba(19,45,84,0.8)' },
                    },
                  },
                  plugins: { legend: { labels: { color: '#b8d8f2' } } },
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {compositionCharts.length === 0 && (
                <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)', color: 'var(--ocean-400)' }}>
                  Select teams to see recruit composition
                </div>
              )}
              {compositionCharts.map(({ teamName, data }) => (
                <div
                  key={teamName}
                  className="rounded-lg border p-5"
                  style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
                >
                  <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>{teamName} — Recruit Composition</h2>
                  <div style={{ height: 200 }}>
                    <Bar
                      data={data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            stacked: true,
                            ticks: { color: '#5a9ad4' },
                            grid: { color: 'rgba(19,45,84,0.8)' },
                          },
                          y: {
                            stacked: true,
                            ticks: { color: '#5a9ad4', stepSize: 1 },
                            grid: { color: 'rgba(19,45,84,0.8)' },
                            title: { display: true, text: 'Recruits', color: '#5a9ad4' },
                          },
                        },
                        plugins: {
                          legend: { labels: { color: '#b8d8f2' } },
                        },
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team selector */}
        <div
          className="rounded-lg border p-4"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Teams</h2>
          <div className="flex max-h-[500px] flex-col gap-1 overflow-y-auto text-sm">
            {/* Select All */}
            <label
              className="flex cursor-pointer items-center gap-2 rounded border-b px-2 py-1.5 font-semibold"
              style={{ color: 'var(--ocean-100)', borderColor: 'var(--ocean-800)' }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="accent-blue-500"
              />
              Select All
            </label>
            {teamsInConference.map(([id, name]) => (
              <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors" style={{ color: 'var(--ocean-200)' }}>
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(id)}
                  onChange={() => toggleTeam(id)}
                  className="accent-blue-500"
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
