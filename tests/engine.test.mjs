import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,makeTrack,createCar,updateCar,recoverCar,raceOrder,formatTime} from '../dist/engine.js';
test('all computer drivers can finish every circuit without shortcuts',()=>{for(const def of TRACKS){const t=makeTrack(def);for(let id=1;id<4;id++){const c=createCar(t,id,true);let elapsed=0;while(!c.finished&&elapsed<180){elapsed+=1/60;updateCar(c,t,{},1/60,elapsed)}assert.ok(c.finished,`${def.id} bot ${id} did not finish: lap ${c.lap}, gate ${c.nextGate}`);assert.equal(c.passed,36);assert.ok(c.finishTime>20);}}});
test('crossing the finish without visiting gates does not award a lap',()=>{const t=makeTrack(TRACKS[0]),c=createCar(t,0);for(let i=0;i<10;i++){c.x=t.samples[0].x;c.y=t.samples[0].y;updateCar(c,t,{},1/120,i)}assert.equal(c.lap,0);assert.equal(c.passed,0)});
test('recover returns to previous gate and adds a penalty without advancing',()=>{const t=makeTrack(TRACKS[0]),c=createCar(t,0);c.nextGate=4;c.passed=3;recoverCar(c,t);assert.equal(c.penalty,3);assert.equal(c.nextGate,4);assert.equal(c.passed,3);assert.equal(c.x,t.samples[t.gates[3]].x)});
test('players have independent controls',()=>{const t=makeTrack(TRACKS[0]),a=createCar(t,0),b=createCar(t,1),aa=a.angle,ba=b.angle;updateCar(a,t,{steer:-1},.1,.1);updateCar(b,t,{steer:1},.1,.1);assert.ok(a.angle<aa);assert.ok(b.angle>ba)});
test('finished cars rank by time including penalties',()=>{const t=makeTrack(TRACKS[0]),a=createCar(t,0),b=createCar(t,1);a.finished=b.finished=true;a.finishTime=70;b.finishTime=66;assert.equal(raceOrder([a,b],t)[0],b)});
test('time formatting handles missing values and minutes',()=>{assert.equal(formatTime(undefined),'—');assert.equal(formatTime(65.12),'1:05.12')});
