import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,makeTrack,createCar,updateCar,recoverCar,raceOrder,formatTime} from '../dist/engine.js';
test('all computer drivers can finish every circuit without shortcuts',()=>{for(const def of TRACKS){const t=makeTrack(def);for(let id=1;id<4;id++){const c=createCar(t,id,true);let elapsed=0;while(!c.finished&&elapsed<180){elapsed+=1/60;updateCar(c,t,{},1/60,elapsed)}assert.ok(c.finished,`${def.id} bot ${id} did not finish: lap ${c.lap}, gate ${c.nextGate}`);assert.equal(c.passed,t.gates.length*3);assert.ok(c.finishTime>20);}}});
test('crossing the finish without visiting gates does not award a lap',()=>{const t=makeTrack(TRACKS[0]),c=createCar(t,0);for(let i=0;i<10;i++){c.x=t.samples[0].x;c.y=t.samples[0].y;updateCar(c,t,{},1/120,i)}assert.equal(c.lap,0);assert.equal(c.passed,0)});
test('recover returns to previous gate and adds a penalty without advancing',()=>{const t=makeTrack(TRACKS[0]),c=createCar(t,0);c.nextGate=4;c.passed=3;recoverCar(c,t);assert.equal(c.penalty,3);assert.equal(c.nextGate,4);assert.equal(c.passed,3);assert.equal(c.x,t.samples[t.gates[3]].x)});
test('players have independent controls',()=>{const t=makeTrack(TRACKS[0]),a=createCar(t,0),b=createCar(t,1),aa=a.angle,ba=b.angle;updateCar(a,t,{steer:-1},.1,.1);updateCar(b,t,{steer:1},.1,.1);assert.ok(a.angle<aa);assert.ok(b.angle>ba)});
test('finished cars rank by time including penalties',()=>{const t=makeTrack(TRACKS[0]),a=createCar(t,0),b=createCar(t,1);a.finished=b.finished=true;a.finishTime=70;b.finishTime=66;assert.equal(raceOrder([a,b],t)[0],b)});
test('time formatting handles missing values and minutes',()=>{assert.equal(formatTime(undefined),'—');assert.equal(formatTime(65.12),'1:05.12')});

const visit=(c,t,p)=>{c.x=p.x;c.y=p.y;c.speed=0;updateCar(c,t,{},0,60);};
const reach=(c,t,gate)=>{while(c.nextGate!==gate+1)visit(c,t,t.samples[t.gates[c.nextGate]]);};
test('new shortcut lanes are narrower and shorter than the bypassed main route',()=>{
 const additions=TRACKS.filter(t=>t.shortcuts);
 assert.equal(additions.length,2);
 const length=pts=>pts.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-pts[i].x,p.y-pts[i].y),0);
 for(const def of additions){
  const t=makeTrack(def);assert.equal(t.shortcuts.length,2);
  for(const lane of t.shortcuts){
   assert.ok(lane.width<t.width/2);
   assert.ok(length(lane.samples)<length(t.samples.slice(t.gates[lane.from],t.gates[lane.to]+1)));
   for(const p of lane.samples)assert.ok(p.x>35&&p.x<1565&&p.y>35&&p.y<1065);
  }
 }
});
test('following each complete shortcut credits only the bypassed ordered checkpoints',()=>{
 for(const def of TRACKS.filter(t=>t.shortcuts)){
  const t=makeTrack(def);
  for(const lane of t.shortcuts){
   const c=createCar(t,0);reach(c,t,lane.from);
   const before=c.passed;
   for(const gate of lane.gates.slice(1))visit(c,t,lane.samples[gate]);
   assert.equal(c.shortcut,null);assert.equal(c.nextGate,(lane.to+1)%t.gates.length);
   assert.equal(c.passed,before+lane.to-lane.from);assert.equal(c.lap,0);
  }
 }
});
test('shortcut exits and out-of-order lane checkpoints cannot bypass entrance checks',()=>{
 for(const def of TRACKS.filter(t=>t.shortcuts)){
  const t=makeTrack(def);
  for(const lane of t.shortcuts){
   const c=createCar(t,0);reach(c,t,lane.from);const before=c.passed;
   visit(c,t,lane.samples.at(-1));assert.equal(c.passed,before);assert.equal(c.shortcut,null);
   visit(c,t,lane.samples[lane.gates[2]]);assert.equal(c.passed,before);assert.equal(c.shortcut,null);
   const wrong=createCar(t,0);visit(wrong,t,lane.samples[lane.gates[1]]);assert.equal(wrong.shortcut,null);assert.equal(wrong.passed,0);
  }
 }
});
test('narrow roads are drivable and recovery preserves shortcut progress with a penalty',()=>{
 for(const def of TRACKS.filter(t=>t.shortcuts)){
  const t=makeTrack(def);
  for(const lane of t.shortcuts){
   const c=createCar(t,0);reach(c,t,lane.from);
   const p=lane.samples[lane.gates[1]];visit(c,t,p);
   assert.equal(c.offroad,false);assert.ok(c.shortcut);
   const state={...c.shortcut},passed=c.passed;recoverCar(c,t);
   assert.equal(c.x,p.x);assert.equal(c.y,p.y);assert.equal(c.penalty,3);
   assert.deepEqual(c.shortcut,state);assert.equal(c.passed,passed);
   visit(c,t,{x:800,y:550});assert.equal(c.offroad,true);
  }
 }
});
test('three laps using both shortcuts still require the full lap checkpoint count',()=>{
 for(const def of TRACKS.filter(t=>t.shortcuts)){
  const t=makeTrack(def),c=createCar(t,0);let steps=0;
  while(!c.finished&&steps++<100){
   const lane=t.shortcuts.find(s=>c.nextGate===s.from+1);
   if(lane){for(const gate of lane.gates.slice(1))visit(c,t,lane.samples[gate]);}
   else visit(c,t,t.samples[t.gates[c.nextGate]]);
  }
  assert.equal(c.finished,true);assert.equal(c.lap,3);assert.equal(c.passed,36);
 }
});
