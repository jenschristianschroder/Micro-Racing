import { angleDiff, nearest } from './engine.js?v=power-race-1';

export function enablePowers(car){
 car.effects={boosts:1,oil:0,boost:0,shield:0,slow:0};
}
export function useBoost(car){
 const e=car.effects;
 if(car.finished||!e||e.boosts<=0||e.boost>0)return false;
 e.boosts--;e.boost=2;return true;
}
export function dropOil(world,car){
 const e=car.effects;
 if(!world||car.finished||!e||e.oil<=0)return false;
 e.oil--;
 world.oils.push({x:car.x-Math.cos(car.angle)*65,y:car.y-Math.sin(car.angle)*65,owner:car.id,life:8});
 return true;
}
export function createPowerRace(track,cars){
 cars.forEach(enablePowers);
 const types=['boost','shield','oil'];
 const pickups=Array.from({length:9},(_,i)=>{
  const p=track.samples[Math.floor((i+.7)*track.samples.length/9)%track.samples.length];
  return {x:p.x,y:p.y,type:types[i%3],cooldown:0};
 });
 track.shortcuts.forEach(lane=>{const p=lane.samples[Math.floor(lane.samples.length/2)];pickups.push({x:p.x,y:p.y,type:'boost',cooldown:0});});
 return {pickups,oils:[]};
}
export function updatePowerRace(world,cars,track,dt){
 for(const pickup of world.pickups){
  pickup.cooldown=Math.max(0,pickup.cooldown-dt);
  if(pickup.cooldown>0)continue;
  for(const car of cars){
   if(car.finished||!car.effects||Math.hypot(car.x-pickup.x,car.y-pickup.y)>40)continue;
   const e=car.effects;
   if(pickup.type==='boost')e.boosts=Math.min(3,e.boosts+1);
   if(pickup.type==='oil')e.oil=Math.min(2,e.oil+1);
   if(pickup.type==='shield'){e.shield=6;e.slow=0;}
   pickup.cooldown=7;break;
  }
 }
 for(const oil of world.oils){
  oil.life-=dt;if(oil.life<=0)continue;
  for(const car of cars){
   if(car.finished||!car.effects||car.id===oil.owner||Math.hypot(car.x-oil.x,car.y-oil.y)>35)continue;
   if(car.effects.shield>0)car.effects.shield=0;
   else car.effects.slow=3;
   oil.life=0;break;
  }
 }
 world.oils=world.oils.filter(o=>o.life>0);
 for(const car of cars){
  if(!car.bot||car.finished||!car.effects)continue;
  const aim=track.samples[(nearest(track,car.x,car.y).index+25)%track.samples.length];
  if(!car.offroad&&Math.abs(angleDiff(Math.atan2(aim.y-car.y,aim.x-car.x),car.angle))<.15)useBoost(car);
  if(cars.some(other=>other!==car&&!other.finished&&Math.hypot(other.x-car.x,other.y-car.y)<240&&(other.x-car.x)*Math.cos(car.angle)+(other.y-car.y)*Math.sin(car.angle)<-40))dropOil(world,car);
 }
}
