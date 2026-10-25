import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS } from '../dist/engine.js';
import { TARGETS, normalizeProgress, medalFor, medalCount, isUnlocked, progressionSummary, recordFinish } from '../dist/progression.js';
const fresh=()=>normalizeProgress(null);
const finish=(p,extra={})=>recordFinish(p,{trackId:'coast',mode:'race',time:70,completed:true,...extra});

test('new players retain the original three circuits and see the first unlock',()=>{
 const p=fresh(),s=progressionSummary(p);
 assert.deepEqual(s.unlocked.map(t=>t.id),['coast','desert','night']);
 assert.equal(s.next.id,'alpine');
});
test('legacy saves retain race totals, preferences, and best trial times',()=>{
 const p=normalizeProgress({best:{coast:40,desert:84},races:10,sound:true});
 assert.equal(p.races,10);assert.equal(p.sound,true);assert.equal(p.best.coast,40);
 assert.equal(p.version,2);assert.equal(progressionSummary(p).unlocked.length,6);
 assert.equal(medalCount(p),2);
 assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p))),p);
});
test('invalid stored values cannot grant tracks or medals',()=>{
 for(const v of [null,[],false,'bad',{races:-1,best:{coast:-1}},{races:Infinity,best:{coast:'20',desert:null,night:NaN}},{races:2.7,best:{unknown:10}}]){
  const p=normalizeProgress(v);assert.equal(p.races,0);assert.equal(medalCount(p),0);assert.equal(progressionSummary(p).unlocked.length,3);
 }
});
test('finishing races unlocks tracks at each threshold regardless of time',()=>{
 let p=fresh();
 for(let n=1;n<=20;n++){
  const r=finish(p);p=r.progress;assert.equal(p.races,n);
  const expected=TRACKS.filter(t=>!t.unlock||t.unlock.races<=n);
  assert.equal(progressionSummary(p).unlocked.length,expected.length);
  assert.equal(r.newlyUnlocked.length,[3,6,10,15,20].includes(n)?1:0);
 }
 assert.equal(progressionSummary(p).next,null);
});
test('time-trial medals independently unlock tracks, one medal per distinct circuit',()=>{
 let p=fresh();
 for(const id of ['coast','desert','night','alpine','harbor']){
  const r=finish(p,{trackId:id,mode:'trial',time:TARGETS[id].bronze});p=r.progress;
  assert.equal(r.newlyUnlocked.length,1);
 }
 assert.equal(p.races,5);assert.equal(medalCount(p),5);assert.equal(progressionSummary(p).unlocked.length,8);
 const upgrade=finish(p,{mode:'trial',time:TARGETS.coast.gold});
 assert.equal(medalCount(upgrade.progress),5);assert.equal(upgrade.medal,'gold');assert.equal(upgrade.medalImproved,true);
});
test('exact medal boundaries count and slower repeats do not overwrite records',()=>{
 for(const t of TRACKS){const v=TARGETS[t.id];assert.ok(v.gold<v.silver&&v.silver<v.bronze);assert.equal(medalFor(t.id,v.gold),'gold');assert.equal(medalFor(t.id,v.silver),'silver');assert.equal(medalFor(t.id,v.bronze),'bronze');assert.equal(medalFor(t.id,v.bronze+.01),null);}
 const first=finish(fresh(),{mode:'trial',time:40}),again=finish(first.progress,{mode:'trial',time:70});
 assert.equal(again.progress.best.coast,40);assert.equal(again.personalBest,false);assert.equal(again.medalImproved,false);assert.equal(again.progress.races,2);
});
test('race and multiplayer finishes count once but never earn trial medals',()=>{
 for(const mode of ['race','duo']){const r=finish(fresh(),{mode,time:30});assert.equal(r.progress.races,1);assert.equal(medalCount(r.progress),0);assert.deepEqual(r.progress.best,{});}
});
test('abandoned, invalid, and locked-track results grant no progress',()=>{
 for(const extra of [{completed:false},{time:NaN},{time:0},{trackId:'summit'},{trackId:'unknown'},{mode:'unknown'}]){
  const p=fresh(),r=finish(p,extra);assert.deepEqual(r.progress,p);assert.equal(r.newlyUnlocked.length,0);
 }
});
test('recordFinish leaves the prior save untouched and clearing resets progression',()=>{
 const p=fresh(),copy=structuredClone(p);finish(p,{mode:'trial',time:40});assert.deepEqual(p,copy);
 const reset=normalizeProgress(null);assert.equal(progressionSummary(reset).unlocked.length,3);assert.equal(reset.races,0);
});
