# Micro Racing

A dependency-free, mobile-first browser racing game. No game accounts, ads, trackers, cloud saves, or third-party scripts.

## Play modes

- **Quick race:** three laps against three on-device computer opponents.
- **Time trial:** three-lap personal records stored in the browser, plus shareable circuit-and-time challenge links.
- **Two players:** simultaneous local split-screen racing on one device, with independent touch and keyboard controls. This is not live online multiplayer. Both drivers can race for up to 30 seconds after the first finishes; an unfinished driver is marked DNF.

Eight circuits: Coastline Run, Dust Valley, Midnight Loop, Alpine Pass, Harbor Sprint, Pinewood Rally, Redrock Canyon, and Summit Grand Prix.

## Track progression

The original three circuits are always available. New circuits unlock through **either** completed races **or** time-trial medals on distinct circuits:

| Circuit | Completed races | Or medaled circuits |
| --- | --- | --- |
| Alpine Pass | 3 | 1 |
| Harbor Sprint | 6 | 2 |
| Pinewood Rally | 10 | 3 |
| Redrock Canyon | 15 | 4 |
| Summit Grand Prix | 20 | 5 |

All three modes count toward completed races. A two-player event counts once when at least one driver finishes; abandoned races do not count. Only time trials earn medals. Bronze, silver, and gold thresholds are shown for every track and apply to the full three-lap time, including recovery penalties. Improving a medal on the same circuit does not increase the distinct-circuit count.

The garage shows both routes to the next unlock, previews locked tracks, and disables starting a locked track in all modes, including challenge links. Results announce newly earned medals and tracks. Existing local race counts and best times automatically carry forward; no account, cloud data, or extra payment is required. Clearing local records resets progression to the original three tracks.

## Run locally

Requires Python 3 for this example server; the game itself has no runtime dependencies.

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Any static web host can serve `dist/` unchanged. No build step is needed.

## Deploy to GitHub Pages

The `Deploy to GitHub Pages` workflow validates JavaScript and runs the engine tests before publishing only `dist/`. Pull requests run validation without deploying. Pushes to `main` deploy automatically; you can also select **Actions → Deploy to GitHub Pages → Run workflow**, using the `main` branch.

One-time setup: in **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. Then merge the workflow PR into `main`. If the workflow was merged before enabling Pages, rerun it manually after enabling Pages. The workflow uses GitHub's built-in token; no personal access token or repository secrets are needed.

The deployed URL appears in the workflow's `github-pages` environment. Assets use relative paths, so the game works under the repository's Pages subdirectory without a build or base-path rewrite.

## Controls

Cars accelerate automatically. Steering is relative to the car; the camera follows its heading. Brake before tight bends. Complete checkpoints in order, then cross the finish line.

| Action | Player 1 / solo | Player 2 |
| --- | --- | --- |
| Steer | Left / right arrows (A / D also work in solo) | A / D |
| Brake | Space or down arrow | S |
| Recover | R or on-screen reset | On-screen reset |
| Pause | P or Escape | P or Escape |

Touch controls appear for each driver. Recovery resets to the previous checkpoint and adds three seconds. Leaving the tab pauses the whole race.

## Privacy and storage

Best trial times, sound preference, race count, and a save-format version are stored in localStorage under `micro-racing-v1`. If storage is blocked, gameplay continues and results explain that they could not be saved. Track unlocks and medals are derived from these records. Settings provide record export and deletion. Active races do not survive closing/reloading the page.

Challenge links contain only a track identifier and target time. They do not upload progress and are for friendly competition, not verified leaderboards. Separate-device live multiplayer is not implemented. The web host can process ordinary page requests; the game makes no analytics or third-party requests.

## Tests

Requires Node.js 20+.

```sh
npm test
```

Tests cover all 24 computer-driver/circuit combinations completing their races, checkpoint enforcement, independent controls, recovery penalties, finish ordering, time formatting, legacy-save migration, both unlock routes, exact medal thresholds, replay behavior, and invalid or unfinished results.

## Files

- `dist/engine.js`: track geometry, physics, computer drivers, checkpoints, ranking.
- `dist/progression.js`: save migration, medal targets, track unlocks, and completion rewards.
- `dist/app.js`: canvas rendering, race lifecycle, controls, storage, challenge sharing.
- `dist/style.css`: responsive garage and race interface.
- `dist/index.html`: application shell.
- `tests/engine.test.mjs`: deterministic engine tests.
- `tests/progression.test.mjs`: progression and save-migration tests.

All artwork is drawn locally with canvas and SVG. No external assets or packages are required.

