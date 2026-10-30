export const TRACKS = [
 {id:'coast',name:'Coastline Run',tag:'THE OPENING LAP',difficulty:'Easy',theme:'coast',description:'Sea breeze. Sweeping bends. Full throttle.',points:[[380,250],[800,180],[1260,260],[1380,560],[1150,850],[680,900],[260,740],[210,440]],width:169},
 {id:'desert',name:'Dust Valley',tag:'TAKE THE INSIDE LINE',difficulty:'Medium',theme:'desert',description:'Warm asphalt and a wicked double hairpin.',points:[[330,260],[730,200],[1200,240],[1380,500],[1150,660],[900,480],[710,720],[420,900],[200,680],[180,420]],width:151},
 {id:'night',name:'Midnight Loop',tag:'AFTER HOURS',difficulty:'Hard',theme:'night',description:'Neon corners. Close calls. One more lap.',points:[[330,230],[800,180],[1300,250],[1380,500],[1100,540],[1160,850],[760,930],[560,680],[240,800],[180,500]],width:143},
 {id:'alpine',name:'Alpine Pass',tag:'THIN AIR. FAST LAPS.',difficulty:'Medium',theme:'alpine',description:'Snow-dusted peaks and long, flowing switchbacks.',points:[[350,230],[760,170],[1230,230],[1370,450],[1160,660],[920,870],[530,900],[230,720],[300,470]],width:156},
 {id:'harbor',name:'Harbor Sprint',tag:'BETWEEN THE DOCKS',difficulty:'Medium',theme:'harbor',description:'Dockside straights with sharp warehouse corners.',points:[[340,230],[820,200],[1260,220],[1350,460],[1100,500],[1070,820],[790,900],[470,820],[220,760],[200,450]],width:151},
 {id:'forest',name:'Pinewood Rally',tag:'INTO THE GREEN',difficulty:'Hard',theme:'forest',description:'Find a rhythm through a winding forest ribbon.',points:[[340,220],[680,180],[950,330],[1260,260],[1390,540],[1190,800],[850,900],[640,720],[340,840],[170,600],[260,400]],width:143},
 {id:'canyon',name:'Redrock Canyon',tag:'HOLD YOUR NERVE',difficulty:'Hard',theme:'canyon',description:'Sun-baked rock, deep bends, and room to find your racing line.',points:[[330,220],[780,160],[1300,260],[1400,510],[1120,650],[1230,880],[820,930],[660,640],[420,800],[200,700],[180,400]],width:138},
 {id:'summit',name:'Summit Grand Prix',tag:'THE FINAL CLIMB',difficulty:'Expert',theme:'summit',description:'A technical finale for your growing trophy cabinet.',points:[[350,210],[730,160],[990,300],[1300,220],[1400,480],[1190,620],[1270,860],[910,920],[710,690],[440,870],[190,690],[220,400]],width:135},

 {id:'meadow',name:'Meadow Cross',tag:'TAKE THE QUIET ROAD',difficulty:'Medium',theme:'forest',description:'Wide woodland curves with two narrow infield shortcuts. Follow their marked lanes to rejoin ahead.',points:[[350,220],[700,170],[1100,200],[1360,400],[1370,720],[1120,900],[760,940],[400,900],[200,700],[160,500],[200,320],[260,250]],width:151,shortcuts:[{from:2,to:5,width:62,points:[[1140,440],[1140,670]]},{from:7,to:10,width:62,points:[[400,670],[340,510]]}]},
 {id:'quarry',name:'Quarry Cut',tag:'RISK A TIGHTER LINE',difficulty:'Hard',theme:'canyon',description:'Broad quarry roads surround two winding cuts. The narrow lanes save distance when you hold your line.',points:[[340,240],[680,160],[1050,200],[1370,360],[1400,650],[1220,860],[880,940],[580,810],[350,920],[180,730],[170,460],[260,350]],width:148,shortcuts:[{from:3,to:6,width:68,points:[[1150,510],[1060,720]]},{from:8,to:11,width:60,points:[[370,660],[290,510]]}]}

];
export const COLORS=['#ff704a','#74e6ca','#b5a2ff','#f4ce6e'];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function sampleRoad(points,closed=true){
 const pts=[],n=points.length;
 const at=i=>points[closed?(i+n)%n:clamp(i,0,n-1)];
 for(let i=0;i<(closed?n:n-1);i++)for(let j=0;j<40;j++){
  const t=j/40,t2=t*t,t3=t2*t,a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
  const f=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
  pts.push({x:f(0),y:f(1)});
 }
 if(!closed)pts.push({x:points[n-1][0],y:points[n-1][1]});
 pts.forEach((p,i)=>{const last=!closed&&i===pts.length-1,a=last?pts[i-1]:p,q=last?p:pts[(i+1)%pts.length];p.angle=Math.atan2(q.y-a.y,q.x-a.x)});
 return pts;
}
export function makeTrack(def){
 const samples=sampleRoad(def.points),gates=Array.from({length:12},(_,i)=>Math.floor(i*samples.length/12));
 const shortcuts=(def.shortcuts||[]).map(route=>{
  const from=samples[gates[route.from]],to=samples[gates[route.to]];
  const points=[[from.x,from.y],...route.points,[to.x,to.y]],lane=sampleRoad(points,false);
  return {...route,closed:false,samples:lane,gates:points.map((_,i)=>i*40)};
 });
 return {...def,samples,gates,shortcuts};
}
export function checkpointFor(c,track){
 if(c.shortcut){const lane=track.shortcuts[c.shortcut.index];return lane.samples[lane.gates[c.shortcut.next]];}
 return track.samples[track.gates[c.nextGate]];
}
function advanceGate(c,track,time,laps){
 c.passed++;c.nextGate=(c.nextGate+1)%track.gates.length;
 if(c.nextGate===1){c.lap++;if(c.lap>=laps){c.finished=true;c.finishTime=time+c.penalty;}}
}
export function nearest(track,x,y){let index=0,dist=Infinity;track.samples.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;index=i}});return {index,distance:Math.sqrt(dist),point:track.samples[index]};}
export function createCar(track,id,bot=false){const p=track.samples[0],side=(id%2?1:-1)*23,back=Math.floor(id/2)*48;return {id,bot,name:bot?['','','Nova','Kit'][id]||'Rival':id===0?'You':'Player 2',color:COLORS[id],x:p.x-Math.cos(p.angle)*back-Math.sin(p.angle)*side,y:p.y-Math.sin(p.angle)*back+Math.cos(p.angle)*side,angle:p.angle,speed:0,lap:0,nextGate:1,passed:0,finished:false,finishTime:null,penalty:0,offroad:false,distance:0,shortcut:null};}
export function updateCar(c,track,input,dt,time,laps=3){
 if(c.finished)return;
 if(c.effects)for(const key of ['boost','shield','slow'])c.effects[key]=Math.max(0,c.effects[key]-dt);
 const n=nearest(track,c.x,c.y); c.offroad=n.distance>track.width*.46&&!track.shortcuts.some(lane=>nearest(lane,c.x,c.y).distance<=lane.width*.46);
 let steer=input.steer||0,brake=!!input.brake;
 if(c.bot){const ahead=track.samples[(n.index+Math.round(10+c.speed/25))%track.samples.length];const diff=angleDiff(Math.atan2(ahead.y-c.y,ahead.x-c.x),c.angle);steer=clamp(diff*2.5,-1,1);brake=Math.abs(diff)>.65;}
 const target=(c.offroad?105:c.effects?.slow>0?110:brake?150:c.effects?.boost>0?420:c.bot?255-c.id*8:285);
 c.speed+=(target-c.speed)*Math.min(1,dt*(brake?5:1.7));
 c.angle+=steer*(1.45+c.speed/230)*dt;
 c.x+=Math.cos(c.angle)*c.speed*dt;c.y+=Math.sin(c.angle)*c.speed*dt;c.distance+=c.speed*dt;
 c.x=clamp(c.x,35,1565);c.y=clamp(c.y,35,1065);
 // A shortcut only counts after its entrance and every lane checkpoint, in order.
 if(c.shortcut){
  const state=c.shortcut,lane=track.shortcuts[state.index],gate=checkpointFor(c,track);
  if(Math.hypot(c.x-gate.x,c.y-gate.y)<lane.width*.7){
   state.next++;
   if(state.next===lane.gates.length){
    const count=(lane.to-lane.from+track.gates.length)%track.gates.length;
    for(let i=0;i<count;i++)advanceGate(c,track,time,laps);
    c.shortcut=null;
   }
  }
  return;
 }
 if(!c.bot){
  for(let i=0;i<track.shortcuts.length;i++){
   const lane=track.shortcuts[i],entry=lane.samples[lane.gates[1]];
   if(c.nextGate===(lane.from+1)%track.gates.length&&Math.hypot(c.x-entry.x,c.y-entry.y)<lane.width*.7){c.shortcut={index:i,next:2};return;}
  }
 }
 const gate=checkpointFor(c,track);
 if(Math.hypot(c.x-gate.x,c.y-gate.y)<track.width*.7)advanceGate(c,track,time,laps);
}
export function recoverCar(c,track){
 let p;
 if(c.shortcut){const lane=track.shortcuts[c.shortcut.index];p=lane.samples[lane.gates[c.shortcut.next-1]];}
 else{const previous=(c.nextGate+track.gates.length-1)%track.gates.length;p=track.samples[track.gates[previous]];}
 c.x=p.x;c.y=p.y;c.angle=p.angle;c.speed=0;c.penalty+=3;if(c.effects){c.effects.boost=0;c.effects.slow=0;}
}
export function raceOrder(cars,track){
 const progress=c=>{
  if(!c.shortcut)return c.passed;
  const lane=track.shortcuts[c.shortcut.index];
  return c.passed+(lane.to-lane.from)*(c.shortcut.next-1)/(lane.gates.length-1);
 };
 return [...cars].sort((a,b)=>{
  if(a.finished&&b.finished)return a.finishTime-b.finishTime;
  if(a.finished)return -1;if(b.finished)return 1;
  const delta=progress(b)-progress(a);if(delta)return delta;
  const ga=checkpointFor(a,track),gb=checkpointFor(b,track);
  return Math.hypot(a.x-ga.x,a.y-ga.y)-Math.hypot(b.x-gb.x,b.y-gb.y);
 });
}
export function formatTime(t){if(!Number.isFinite(t))return '—';return `${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;}
