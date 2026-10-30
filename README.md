# Micro Racing

A dependency-free, mobile-first browser racing game. No game accounts, ads, trackers, cloud saves, or third-party scripts.

## Play modes

- **Quick race:** three laps against three on-device computer opponents.
- **Time trial:** three-lap personal records stored in the browser, plus shareable circuit-and-time challenge links.
- **Two players:** simultaneous local split-screen racing on one device, with independent touch and keyboard controls. This is not live online multiplayer. Both drivers can race for up to 30 seconds after the first finishes; an unfinished driver is marked DNF.

Ten circuits: Coastline Run, Dust Valley, Midnight Loop, Alpine Pass, Harbor Sprint, Pinewood Rally, Redrock Canyon, Summit Grand Prix, Meadow Cross, and Quarry Cut.

The original eight circuits have roads about 30% wider than their original layouts, providing more room to steer and overtake. The wider road also increases the drivable area used by the physics.

Meadow Cross and Quarry Cut each offer two optional narrow-road shortcuts, highlighted in mint on the track and mini-map. Each lane is less than half the width of the main road and saves distance. Pass its entrance on the main circuit, then follow every lane checkpoint to its exit to earn the bypassed checkpoint credit. Driving straight to the exit or across the grass does not count. Recovery inside a shortcut returns to the previous lane checkpoint with the usual penalty. Computer opponents follow the wide main circuit.

## Tracks and medals

**All 10 tracks are unlocked immediately in every mode**, including challenge links. No race or medal requirement applies. Clearing local records keeps every circuit available, and existing race counts, preferences, medals, and best times carry forward.

All three modes count toward completed races. A two-player event counts once when at least one driver finishes; abandoned races do not count. Only time trials earn medals. Bronze, silver, and gold thresholds are shown for every track and apply to the full three-lap time, including recovery penalties. Improving a medal on the same circuit does not increase the distinct-circuit count.

The garage shows race totals, medaled circuits, and the complete track collection. Results announce earned medals and personal bests.

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

Touch controls appear for each driver. Drag the steering slider for proportional steering: small movements make gentle turns and the ends apply full steering. Releasing it returns steering to the centre. Each split-screen driver has an independent slider, oriented toward them. Brake and recovery buttons remain available alongside it. Recovery resets to the previous checkpoint and adds three seconds. Leaving the tab pauses the whole race.

## Privacy and storage

Best trial times, sound preference, race count, and a save-format version are stored in localStorage under `micro-racing-v1`. If storage is blocked, gameplay continues and results explain that they could not be saved. Medals are derived from these records; track availability is unconditional. Settings provide record export and deletion. Active races do not survive closing/reloading the page.

Challenge links contain only a track identifier and target time. They do not upload progress and are for friendly competition, not verified leaderboards. Separate-device live multiplayer is not implemented. The web host can process ordinary page requests; the game makes no analytics or third-party requests.

## Tests

Requires Node.js 20+.

```sh
npm test
```

Tests cover all 30 computer-driver/circuit combinations completing their races, checkpoint enforcement, independent controls, recovery penalties, finish ordering, time formatting, legacy-save migration, immediate access to all circuits, shortcut distance and width, ordered shortcut traversal, recovery inside lanes, exact medal thresholds, replay behavior, and invalid or unfinished results.

## Files

- `dist/engine.js`: track geometry, physics, computer drivers, checkpoints, ranking.
- `dist/progression.js`: save migration, medal targets, track availability, and completion rewards.
- `dist/app.js`: canvas rendering, race lifecycle, controls, storage, challenge sharing.
- `dist/style.css`: responsive garage and race interface.
- `dist/index.html`: application shell.
- `tests/engine.test.mjs`: deterministic engine tests.
- `tests/progression.test.mjs`: progression and save-migration tests.

All artwork is drawn locally with canvas and SVG. No external assets or packages are required.
