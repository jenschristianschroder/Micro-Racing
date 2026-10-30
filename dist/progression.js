import { TRACKS } from './engine.js';

// Targets are full three-lap times in seconds, including recovery penalties.
export const TARGETS = {
  coast: { gold: 40, silver: 55, bronze: 75 },
  desert: { gold: 43, silver: 60, bronze: 85 },
  night: { gold: 48, silver: 65, bronze: 90 },
  alpine: { gold: 40, silver: 55, bronze: 75 },
  harbor: { gold: 44, silver: 60, bronze: 85 },
  forest: { gold: 45, silver: 62, bronze: 85 },
  canyon: { gold: 50, silver: 68, bronze: 95 },
  summit: { gold: 48, silver: 65, bronze: 90 },
  tidal: { gold: 85, silver: 110, bronze: 145 },
  foundry: { gold: 85, silver: 110, bronze: 145 },
  viper: { gold: 90, silver: 120, bronze: 155 },
  evergreen: { gold: 95, silver: 125, bronze: 160 },
};

export function normalizeProgress(value) {
  const result = { version: 2, best: {}, sound: false, races: 0 };
  if (!value || typeof value !== 'object') return result;
  result.sound = value.sound === true;
  if (Number.isSafeInteger(value.races) && value.races >= 0) result.races = value.races;
  if (value.best && typeof value.best === 'object') {
    for (const track of TRACKS) {
      const time = value.best[track.id];
      if (Number.isFinite(time) && time > 0) result.best[track.id] = time;
    }
  }
  return result;
}

export function medalFor(trackId, time) {
  if (!Number.isFinite(time) || time <= 0 || !TARGETS[trackId]) return null;
  for (const medal of ['gold', 'silver', 'bronze']) {
    if (time <= TARGETS[trackId][medal]) return medal;
  }
  return null;
}

export function medalCount(progress) {
  return TRACKS.filter(track => medalFor(track.id, progress.best[track.id])).length;
}

export function isUnlocked(track) {
  return TRACKS.some(candidate => candidate.id === track.id);
}

export function progressionSummary(progress) {
  return {
    races: progress.races,
    medals: medalCount(progress),
    unlocked: TRACKS.filter(track => isUnlocked(track, progress)),
    next: TRACKS.find(track => !isUnlocked(track, progress)) || null,
  };
}

export function recordFinish(progress, { trackId, mode, time, completed }) {
  const next = normalizeProgress(progress);
  const track = TRACKS.find(track => track.id === trackId);
  const unlockedBefore = new Set(progressionSummary(next).unlocked.map(track => track.id));
  const previousMedal = medalFor(trackId, next.best[trackId]);
  let personalBest = false;
  // Abandoned races and invalid results award no progress.
  if (!completed || !track || !isUnlocked(track, next) ||
      !['race', 'trial', 'duo'].includes(mode) || !Number.isFinite(time) || time <= 0) {
    return { progress: next, personalBest, medal: previousMedal, medalImproved: false, newlyUnlocked: [] };
  }
  next.races = Math.min(Number.MAX_SAFE_INTEGER, next.races + 1);
  if (mode === 'trial' && (!next.best[trackId] || time < next.best[trackId])) {
    next.best[trackId] = time;
    personalBest = true;
  }
  const medal = medalFor(trackId, next.best[trackId]);
  return {
    progress: next,
    personalBest,
    medal,
    medalImproved: medal !== null && medal !== previousMedal,
    newlyUnlocked: progressionSummary(next).unlocked.filter(track => !unlockedBefore.has(track.id)),
  };
}
