import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS } from '../dist/engine.js';
import { TARGETS, normalizeProgress, medalFor, medalCount, isUnlocked, progressionSummary, recordFinish } from '../dist/progression.js';
const fresh=()=>normalizeProgress(null);
const finish=(p,extra={})=>recordFinish(p,{trackId:'coast',mode:'race',time:70,completed:true,...extra});

test('all twelve circuits are available immediately, including for legacy saves',()=>{
 assert.equal(TRACKS.length,12);
 for(const p of [fresh(),normalizeProgress({races:1,best:{coast:40}}),normalizeProgress({races:20})]){
  assert.deepEqual(progressionSummary(p).unlocked.map(t=>t.id),TRACKS.map(t=>t.id));
  assert.equal(progressionSummary(p).next,null);
  for(const t of TRACKS)assert.equal(isUnlocked(t,p),true);
 }
});
test('legacy saves retain race totals, preferences, and best trial times',()=>{
 const p=normalizeProgress({best:{coast:40,desert:84},races:10,sound:true});
 assert.equal(p.races,10);assert.equal(p.sound,true);assert.equal(p.best.coast,40);
 assert.equal(p.version,2);assert.equal(medalCount(p),2);
 assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p))),p);
});
test('invalid stored values cannot grant medals or race counts',()=>{
 for(const v of [null,[],false,'bad',{races:-1,best:{coast:-1}},{races:Infinity,best:{coast:'20',desert:null,night:NaN}},{races:2.7,best:{unknown:10}}]){
  const p=normalizeProgress(v);assert.equal(p.races,0);assert.equal(medalCount(p),0);assert.equal(progressionSummary(p).unlocked.length,12);
 }
});
test('every circuit records finishes in every mode without requiring prior races',()=>{
 for(const t of TRACKS)for(const mode of ['race','trial','duo']){
  const r=finish(fresh(),{trackId:t.id,mode,time:TARGETS[t.id].gold});
  assert.equal(r.progress.races,1);assert.equal(r.newlyUnlocked.length,0);
  assert.equal(r.progress.best[t.id],mode==='trial'?TARGETS[t.id].gold:undefined);
 }
});
test('time-trial medals count distinct circuits and improvements retain one medal',()=>{
 let p=fresh();
 for(const t of TRACKS){p=finish(p,{trackId:t.id,mode:'trial',time:TARGETS[t.id].bronze}).progress;}
 assert.equal(p.races,12);assert.equal(medalCount(p),12);
 const upgrade=finish(p,{mode:'trial',time:TARGETS.coast.gold});
 assert.equal(medalCount(upgrade.progress),12);assert.equal(upgrade.medal,'gold');assert.equal(upgrade.medalImproved,true);
 assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p))),p);
});
test('exact medal boundaries count and slower repeats do not overwrite records',()=>{
 for(const t of TRACKS){const v=TARGETS[t.id];assert.ok(v.gold<v.silver&&v.silver<v.bronze);assert.equal(medalFor(t.id,v.gold),'gold');assert.equal(medalFor(t.id,v.silver),'silver');assert.equal(medalFor(t.id,v.bronze),'bronze');assert.equal(medalFor(t.id,v.bronze+.01),null);}
 const first=finish(fresh(),{mode:'trial',time:40}),again=finish(first.progress,{mode:'trial',time:70});
 assert.equal(again.progress.best.coast,40);assert.equal(again.personalBest,false);assert.equal(again.medalImproved,false);assert.equal(again.progress.races,2);
});
test('race and multiplayer finishes count once but never earn trial medals',()=>{
 for(const mode of ['race','duo']){const r=finish(fresh(),{mode,time:30});assert.equal(r.progress.races,1);assert.equal(medalCount(r.progress),0);assert.deepEqual(r.progress.best,{});}
});
test('abandoned and invalid results grant no progress',()=>{
 for(const extra of [{completed:false},{time:NaN},{time:0},{trackId:'unknown'},{mode:'unknown'}]){
  const p=fresh(),r=finish(p,extra);assert.deepEqual(r.progress,p);assert.equal(r.newlyUnlocked.length,0);
 }
});
test('recordFinish leaves the prior save untouched and clearing keeps every circuit available',()=>{
 const p=fresh(),copy=structuredClone(p);finish(p,{mode:'trial',time:40});assert.deepEqual(p,copy);
 const reset=normalizeProgress(null);assert.equal(progressionSummary(reset).unlocked.length,12);assert.equal(reset.races,0);
});
