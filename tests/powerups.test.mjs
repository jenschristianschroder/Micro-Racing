import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,makeTrack,createCar,updateCar} from '../dist/engine.js';
import {createPowerRace,enablePowers,useBoost,dropOil,updatePowerRace} from '../dist/powerups.js';
import {normalizeProgress,recordFinish} from '../dist/progression.js';
const track=()=>makeTrack(TRACKS[0]);
test('boost consumes one charge, increases road speed, expires and cannot stack',()=>{
 const t=track(),c=createCar(t,0);enablePowers(c);c.speed=285;
 assert.equal(useBoost(c),true);assert.equal(useBoost(c),false);assert.equal(c.effects.boosts,0);
 updateCar(c,t,{},.1,.1);assert.ok(c.speed>285);assert.ok(c.effects.boost<2);
 c.x=t.samples[0].x;c.y=t.samples[0].y;updateCar(c,t,{},2,2.1);
 assert.equal(c.effects.boost,0);assert.equal(useBoost(c),false);
});
test('boost respects braking and off-road speed limits; normal modes have no powers',()=>{
 const t=track(),c=createCar(t,0);assert.equal(c.effects,undefined);assert.equal(useBoost(c),false);
 enablePowers(c);useBoost(c);c.speed=285;updateCar(c,t,{brake:true},.1,.1);assert.ok(c.speed<285);
 c.x=800;c.y=550;c.speed=285;updateCar(c,t,{},.1,.2);assert.equal(c.offroad,true);assert.ok(c.speed<285);
});
test('pickups cap inventory, respawn after seven running seconds, and shield clears slow',()=>{
 const t=track(),c=createCar(t,0);enablePowers(c);
 const world={pickups:[{x:c.x,y:c.y,type:'boost',cooldown:0}],oils:[]};
 for(let i=0;i<5;i++)updatePowerRace(world,[c],t,7);
 assert.equal(c.effects.boosts,3);assert.equal(world.pickups[0].cooldown,7);
 c.effects.boosts=0;updatePowerRace(world,[c],t,1);assert.equal(c.effects.boosts,0);
 updatePowerRace(world,[c],t,6);assert.equal(c.effects.boosts,1);
 world.pickups=[{x:c.x,y:c.y,type:'shield',cooldown:0}];c.effects.slow=2;
 updatePowerRace(world,[c],t,0);assert.equal(c.effects.shield,6);assert.equal(c.effects.slow,0);
 world.pickups=[{x:c.x,y:c.y,type:'oil',cooldown:0}];c.effects.oil=2;
 updatePowerRace(world,[c],t,0);assert.equal(c.effects.oil,2);
});
test('oil ignores its owner, shield blocks one hit, and an unshielded rival slows',()=>{
 const t=track(),a=createCar(t,0),b=createCar(t,1),world=createPowerRace(t,[a,b]);world.pickups=[];
 a.effects.oil=2;assert.equal(dropOil(world,a),true);
 const spot=world.oils[0];a.x=b.x=spot.x;a.y=b.y=spot.y;b.effects.shield=6;
 updatePowerRace(world,[a,b],t,0);
 assert.equal(a.effects.slow,0);assert.equal(b.effects.shield,0);assert.equal(b.effects.slow,0);assert.equal(world.oils.length,0);
 assert.equal(dropOil(world,a),true);b.x=world.oils[0].x;b.y=world.oils[0].y;
 updatePowerRace(world,[a,b],t,0);assert.equal(b.effects.slow,3);assert.equal(a.effects.slow,0);
 assert.equal(dropOil(world,a),false);
 updateCar(b,t,{},3,3);assert.equal(b.effects.slow,0);
});
test('hazards expire, finished drivers cannot use or collect items, and restart resets state',()=>{
 const t=track(),c=createCar(t,0),world=createPowerRace(t,[c]);world.pickups=[];c.effects.oil=1;dropOil(world,c);
 updatePowerRace(world,[c],t,8);assert.equal(world.oils.length,0);
 c.finished=true;assert.equal(useBoost(c),false);assert.equal(dropOil(world,c),false);
 world.pickups=[{x:c.x,y:c.y,type:'shield',cooldown:0}];updatePowerRace(world,[c],t,0);assert.equal(c.effects.shield,0);
 const fresh=createCar(t,0),restart=createPowerRace(t,[fresh]);assert.equal(fresh.effects.boosts,1);assert.equal(fresh.effects.shield,0);assert.equal(restart.oils.length,0);assert.ok(restart.pickups.every(p=>p.cooldown===0));
});
test('both power-up modes count race finishes without changing trial records or medals',()=>{
 for(const mode of ['power','powerduo']){
  const p=normalizeProgress({best:{coast:50},steeringSides:['right','left']});
  const r=recordFinish(p,{trackId:'coast',mode,time:20,completed:true});
  assert.equal(r.progress.races,1);assert.equal(r.progress.best.coast,50);assert.equal(r.personalBest,false);assert.equal(r.medalImproved,false);
  assert.deepEqual(r.progress.steeringSides,['right','left']);
 }
});
test('all computer opponents complete every circuit with power-ups enabled',()=>{
 for(const def of TRACKS){
  const t=makeTrack(def),cars=[1,2,3].map(id=>createCar(t,id,true)),world=createPowerRace(t,cars);let time=0;
  while(cars.some(c=>!c.finished)&&time<180){time+=1/60;cars.forEach(c=>updateCar(c,t,{},1/60,time));updatePowerRace(world,cars,t,1/60);}
  for(const c of cars){assert.ok(c.finished,`${def.id} bot ${c.id} missed gate ${c.nextGate}`);assert.equal(c.passed,36);}
 }
});
