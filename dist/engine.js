export const TRACKS = [
 {id:'coast',name:'Coastline Run',tag:'THE OPENING LAP',difficulty:'Easy',theme:'coast',description:'Sea breeze. Sweeping bends. Full throttle.',points:[[380,250],[800,180],[1260,260],[1380,560],[1150,850],[680,900],[260,740],[210,440]],width:130},
 {id:'desert',name:'Dust Valley',tag:'TAKE THE INSIDE LINE',difficulty:'Medium',theme:'desert',description:'Warm asphalt and a wicked double hairpin.',points:[[330,260],[730,200],[1200,240],[1380,500],[1150,660],[900,480],[710,720],[420,900],[200,680],[180,420]],width:116},
 {id:'night',name:'Midnight Loop',tag:'AFTER HOURS',difficulty:'Hard',theme:'night',description:'Neon corners. Close calls. One more lap.',points:[[330,230],[800,180],[1300,250],[1380,500],[1100,540],[1160,850],[760,930],[560,680],[240,800],[180,500]],width:110},
 {id:'alpine',name:'Alpine Pass',tag:'THIN AIR. FAST LAPS.',difficulty:'Medium',theme:'alpine',description:'Snow-dusted peaks and long, flowing switchbacks.',points:[[350,230],[760,170],[1230,230],[1370,450],[1160,660],[920,870],[530,900],[230,720],[300,470]],width:120,unlock:{races:3,medals:1}},
 {id:'harbor',name:'Harbor Sprint',tag:'BETWEEN THE DOCKS',difficulty:'Medium',theme:'harbor',description:'Dockside straights with sharp warehouse corners.',points:[[340,230],[820,200],[1260,220],[1350,460],[1100,500],[1070,820],[790,900],[470,820],[220,760],[200,450]],width:116,unlock:{races:6,medals:2}},
 {id:'forest',name:'Pinewood Rally',tag:'INTO THE GREEN',difficulty:'Hard',theme:'forest',description:'Find a rhythm through a winding forest ribbon.',points:[[340,220],[680,180],[950,330],[1260,260],[1390,540],[1190,800],[850,900],[640,720],[340,840],[170,600],[260,400]],width:110,unlock:{races:10,medals:3}},
 {id:'canyon',name:'Redrock Canyon',tag:'HOLD YOUR NERVE',difficulty:'Hard',theme:'canyon',description:'Sun-baked rock, deep bends, and a narrow racing line.',points:[[330,220],[780,160],[1300,260],[1400,510],[1120,650],[1230,880],[820,930],[660,640],[420,800],[200,700],[180,400]],width:106,unlock:{races:15,medals:4}},
 {id:'summit',name:'Summit Grand Prix',tag:'THE FINAL CLIMB',difficulty:'Expert',theme:'summit',description:'A technical finale for your growing trophy cabinet.',points:[[350,210],[730,160],[990,300],[1300,220],[1400,480],[1190,620],[1270,860],[910,920],[710,690],[440,870],[190,690],[220,400]],width:104,unlock:{races:20,medals:5}}
];
export const COLORS=['#ff704a','#74e6ca','#b5a2ff','#f4ce6e'];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function makeTrack(def){
 const pts=[],p=def.points,n=p.length;
 for(let i=0;i<n;i++)for(let j=0;j<40;j++){
  const t=j/40,t2=t*t,t3=t2*t,a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],d=p[(i+2)%n];
  const f=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
  pts.push({x:f(0),y:f(1)});
 }
 pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];p.angle=Math.atan2(q.y-p.y,q.x-p.x)});
 return {...def,samples:pts,gates:Array.from({length:12},(_,i)=>Math.floor(i*pts.length/12))};
}
export function nearest(track,x,y){let index=0,dist=Infinity;track.samples.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;index=i}});return {index,distance:Math.sqrt(dist),point:track.samples[index]};}
export function createCar(track,id,bot=false){const p=track.samples[0],side=(id%2?1:-1)*23,back=Math.floor(id/2)*48;return {id,bot,name:bot?['','','Nova','Kit'][id]||'Rival':id===0?'You':'Player 2',color:COLORS[id],x:p.x-Math.cos(p.angle)*back-Math.sin(p.angle)*side,y:p.y-Math.sin(p.angle)*back+Math.cos(p.angle)*side,angle:p.angle,speed:0,lap:0,nextGate:1,passed:0,finished:false,finishTime:null,penalty:0,offroad:false,distance:0};}
export function updateCar(c,track,input,dt,time,laps=3){
 if(c.finished)return;
 const n=nearest(track,c.x,c.y); c.offroad=n.distance>track.width*.46;
 let steer=input.steer||0,brake=!!input.brake;
 if(c.bot){const ahead=track.samples[(n.index+Math.round(10+c.speed/25))%track.samples.length];const diff=angleDiff(Math.atan2(ahead.y-c.y,ahead.x-c.x),c.angle);steer=clamp(diff*2.5,-1,1);brake=Math.abs(diff)>.65;}
 const target=(c.offroad?105:brake?150:c.bot?255-c.id*8:285);
 c.speed+=(target-c.speed)*Math.min(1,dt*(brake?5:1.7));
 c.angle+=steer*(1.45+c.speed/230)*dt;
 c.x+=Math.cos(c.angle)*c.speed*dt;c.y+=Math.sin(c.angle)*c.speed*dt;c.distance+=c.speed*dt;
 c.x=clamp(c.x,35,1565);c.y=clamp(c.y,35,1065);
 const gate=track.samples[track.gates[c.nextGate]];
 if(Math.hypot(c.x-gate.x,c.y-gate.y)<track.width*.7){
  c.passed++;c.nextGate=(c.nextGate+1)%track.gates.length;
  if(c.nextGate===1){c.lap++;if(c.lap>=laps){c.finished=true;c.finishTime=time+c.penalty;}}
 }
}
export function recoverCar(c,track){const previous=(c.nextGate+track.gates.length-1)%track.gates.length;const p=track.samples[track.gates[previous]];c.x=p.x;c.y=p.y;c.angle=p.angle;c.speed=0;c.penalty+=3;}
export function raceOrder(cars,track){return [...cars].sort((a,b)=>{if(a.finished&&b.finished)return a.finishTime-b.finishTime;if(a.finished)return -1;if(b.finished)return 1;if(a.passed!==b.passed)return b.passed-a.passed;const g=track.samples[track.gates[a.nextGate]];return Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y)});}
export function formatTime(t){if(!Number.isFinite(t))return '—';return `${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;}
