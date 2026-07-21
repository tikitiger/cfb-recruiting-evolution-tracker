# Ghost City RLT

**Ghost City's Recruiting Landscape Tracker** — a local desktop app for tracking recruiting classes, transfer portal activity, program grades, and team ratings across every season of your **EA Sports College Football 27** dynasty.

Built for dynasty nerds who want more than what the game shows you.

---

## Features

- **Dashboard** — sortable table of all 134 teams with OVR, prestige, recruiting rank, star breakdowns, transfer in/out/net, and program grades
- **Star filter** — toggle between All / High School+JUCO / Transfer Portal; star columns update accordingly
- **Grades panel** — toggle to show Atmosphere, Brand, Budget, Traditions, Conference Prestige, and Facilities grades per team
- **Power 4 / Group of 5 filters** — quick conference group filtering above individual conferences
- **Pipelines** — track regional recruiting influence levels and HS recruit hauls by pipeline, with year-over-year history
- **CSV export** — export dashboard stats, unsigned recruits, pipeline influence, or HS recruits to CSV
- **Charts** — trend lines per team, recruit composition stacked bars, plus three national charts:
  - OVR band distribution (how many teams sit in each tier nationally)
  - Unsigned recruits 5★/4★/3★ split by HS vs Transfer Portal
  - Transfer portal volume nationally (in vs out per season)
- **Unsigned recruits page** — tracks unsigned prospects at snapshot time, split by HS/JUCO and Transfer Portal with per-star breakdowns
- **Toolbox** — bulk-edit school grades with fine-grained controls (fixed, tighten, preserve, or reset to game defaults per school)
- **Season delete** — remove any imported season from the Import page
- **JUCO fix** — junior college recruits counted in the HS bucket, matching the game's own grouping

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

Import after each season to build up a history over time.

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

---

## How it works

The app reads your save file using the [`madden-franchise`](https://github.com/WiiExpertise/madden-franchise) library, which understands the binary Frostbite format EA uses. It extracts per-team stats, recruiting data, grades, pipeline info, and transfer portal data and stores them in a local SQLite database. Nothing leaves your machine.

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
