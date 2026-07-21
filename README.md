# Ghost City RLT

**Ghost City's Recruiting Landscape Tracker** — a local desktop app for tracking recruiting classes, transfer portal activity, program grades, and team ratings across every season of your **EA Sports College Football 27** dynasty. Also includes a Toolbox for bulk-editing your save file (school grades, prestige, rosters, NIL, and history resets).

Built for dynasty nerds who want more than what the game shows you.

---

## Features

### Tracking (read-only — your save file is never touched)

- **Dashboard** — sortable table of every FBS team with OVR, prestige, recruiting rank, star breakdowns, transfer in/out/net, and program grades
- **Star filter** — toggle between All / High School+JUCO / Transfer Portal; star columns update accordingly
- **Grades panel** — toggle to show Atmosphere, Brand, Budget, Traditions, Conference Prestige, and Facilities grades per team
- **Power 4 / Group of 5 filters** — quick conference group filtering above individual conferences
- **Pipelines** — track regional recruiting influence levels and HS recruit hauls by pipeline, with year-over-year history
- **Charts** — trend lines per team, recruit composition stacked bars, plus three national charts (OVR band distribution, unsigned recruits by star/source, transfer portal volume)
- **Unsigned recruits page** — tracks unsigned prospects at snapshot time, split by HS/JUCO and Transfer Portal with per-star breakdowns
- **CSV export** — export dashboard stats, unsigned recruits, pipeline influence, or HS recruits to CSV (buttons on Dashboard, Charts, Pipelines, and Unsigned pages)
- **Season delete** — remove any imported season from the Import page
- **JUCO fix** — junior college recruits counted in the HS bucket, matching the game's own grouping

### Toolbox — writes directly to your save file

Unlike everything above, **Toolbox edits your live dynasty save file** the next time you load it in-game. There's no in-app undo — see [Save file safety](#save-file-safety-toolbox) before using it.

- **Rebalance Rosters** — bulk-adjusts player attribute ratings (fixed value or tightened toward a midpoint) to blunt the snowball effect; skips free agents and unsigned recruits
- **Zero NIL Demands** — sets NIL value to 0 for every unsigned recruit
- **Program Setup → School Grades** — bulk-edit team grades (fixed, tighten toward a midpoint, preserve, custom per-school, or reset to the game's year-zero defaults)
- **Program Setup → Prestige (direct)** — bulk-edit team prestige scores directly
- **Program Setup → History** — zeroes every team's historical record (wins/losses/championships/bowls/recruiting classes/accolades) and coach career stats, and resets pro-potential grades to C+, for a clean-slate start

---

## Download

Grab the latest **Ghost City RLT Portable.exe** from the [Releases page](https://github.com/ghostcitydev/ghostcity-recruiting-tracker/releases). No installer — just download it and double-click. Put it anywhere you like (Desktop, a folder, wherever).

Your data is stored in `%AppData%\ghost-city-rlt\cfb27.db`. It survives app updates — moving or deleting the exe won't touch your data. Back that file up if you want to preserve your history long-term.

---

## Requirements

- Windows 10/11 (64-bit)
- EA Sports College Football 27 on PC with an active dynasty save

No Node.js. No database setup. No config files. Just run the exe.

---

## Importing your save

1. Open the app and click **Import** in the nav bar
2. Pick your dynasty save from the dropdown (auto-detects saves in `Documents\EA SPORTS College Football 27\saves\`)
3. Click **Import Save** — takes about 10–20 seconds
4. Navigate to **Dashboard** to see your data

Importing is read-only — the save file itself is never modified. Import after **National Signing Day** each season to capture recruit commitments, using the same autosave file each time; the tracker detects the season year automatically.

---

## Save file safety (Toolbox)

Everything under **Toolbox** writes changes directly into your dynasty save file — the same file EA Sports College Football 27 loads. Those changes take effect the next time you load that dynasty in-game. This is different from every other page in the app, which only reads data.

A few things worth knowing:

- Toolbox always edits the save file tied to your **most recently imported season** (by in-game year) — not whatever save is currently selected on the Import page.
- Every destructive Toolbox action shows an in-app confirmation before writing, but there's no in-app undo once you confirm.
- **Back up your save file before using Toolbox**, especially the first time. Copy the file from `Documents\EA SPORTS College Football 27\saves\` somewhere safe before running Rebalance Rosters, Zero NIL Demands, or any Program Setup action.
- Toolbox actions are best run right before the specific game phase they target (e.g. Rebalance Rosters before *Encourage Transfers*, Zero NIL Demands before recruiting opens) — see the in-app description on each card for timing.

---

## Updating

Download the new exe from the Releases page and run it — your data carries over automatically.

---

## Troubleshooting

**Blank screen on launch**
- Wait 5–10 seconds; the app server starts in the background on first launch
- If it stays blank, close and reopen the app

**Import fails with an error**
- Make sure the dynasty is saved in-game before importing
- Try importing again — some saves take two attempts on first run

**Data looks wrong / facilities score is blank**
- Delete the old season from the Import page and re-import

**Toolbox says "No save file path found" or "Save file not found"**
- Import a season first — Toolbox edits the save file tied to your most recent import, so it needs at least one imported season to know which file to write to
- If you moved or deleted the original save file since importing, Toolbox can't find it — re-import from its new location

---

## How it works

The app reads your save file using the [`madden-franchise`](https://github.com/WiiExpertise/madden-franchise) library, which understands the binary Frostbite format EA uses.

- **Importing** (Import page) extracts per-team stats, recruiting data, grades, pipeline info, and transfer portal data and stores a snapshot in a local SQLite database. The save file itself is never touched.
- **Toolbox** goes the other direction — it opens your most-recently-imported save file and writes changes back into it directly, which the game picks up next time you load that dynasty.

Nothing leaves your machine either way — no network calls, no telemetry.

---

## Dev setup (source)

If you want to run from source or contribute:

```
git clone https://github.com/ghostcitydev/ghostcity-recruiting-tracker.git
cd ghostcity-recruiting-tracker
setup.bat
```

Requires Node.js 18+. `setup.bat` installs dependencies, creates the local SQLite database, and opens the app at `http://localhost:3000`. After that, use `start.bat` to launch it again.

**Working on the Electron app itself?**

- `npm run dev` — plain Next.js dev server at `http://localhost:3000`, open in any browser. Fastest loop for UI/API work.
- `npm run electron:dev` — opens the real Electron desktop window pointed at a live dev server. Use this when testing anything Electron-specific (window behavior, native dialogs, packaging-sensitive code paths). Hot reload works.
- `npm run dist` — builds the production portable exe (`.next/standalone` output + electron-builder). Only needed when cutting an actual release; not required for day-to-day development.

---

## Credits

- Save file parsing: [`madden-franchise`](https://github.com/WiiExpertise/madden-franchise) by WiiExpertise
- Built with Next.js, Prisma, Chart.js, and Tailwind CSS
- Logo & brand: Ghost City RLT
