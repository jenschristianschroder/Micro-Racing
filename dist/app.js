import {TRACKS,COLORS,makeTrack,createCar,updateCar,recoverCar,raceOrder,nearest,checkpointFor,formatTime,clamp} from './engine.js';
import { TARGETS, normalizeProgress, medalFor, progressionSummary, recordFinish } from './progression.js';
const $=id=>document.getElementById(id), tracks=TRACKS.map(makeTrack), storageKey='micro-racing-v1';
let saved=normalizeProgress(null),storageOK=true;
try { saved=normalizeProgress(JSON.parse(localStorage.getItem(storageKey)||'null')); }
catch { storageOK=false; }
function persist(){
 try { localStorage.setItem(storageKey,JSON.stringify(saved));storageOK=true; }
 catch { storageOK=false;toast('Storage is unavailable. Progress will last only for this session.'); }
}

let previewDirty=true;
let mode='race',selected=0,race=null,challenge=null,keys=new Set(),touch=[{steer:0,brake:false},{steer:0,brake:false}],held=[new Set(),new Set()],last=0,audio=null,toastTimer;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function tone(freq=500,duration=.12){if(!saved.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration);}catch{}}
const palettes={coast:{ground:'#406d54',light:'#517c60',water:'#356e75',road:'#303b36',edge:'#d7d5b7',tree:'#284c38',stripe:'#f18468'},desert:{ground:'#caa77a',light:'#d8b88a',water:'#997854',road:'#57554a',edge:'#efe0bb',tree:'#7f8c59',stripe:'#db7854'},night:{ground:'#252b42',light:'#323c54',water:'#1c2033',road:'#41485b',edge:'#8692b2',tree:'#263c49',stripe:'#b594df'}};
Object.assign(palettes, {
 alpine:{ground:'#b4cbd0',light:'#d8e5df',water:'#729eae',road:'#4b5a60',edge:'#f7f0d8',tree:'#567875',stripe:'#e88b6e'},
 harbor:{ground:'#65818b',light:'#8ca0a1',water:'#31586b',road:'#36474e',edge:'#d0d4bb',tree:'#486370',stripe:'#e4b957'},
 forest:{ground:'#244d3c',light:'#3f7250',water:'#335e56',road:'#424e3d',edge:'#c0ca92',tree:'#16392a',stripe:'#c5a76e'},
 canyon:{ground:'#af674b',light:'#ce8962',water:'#7c4d3e',road:'#604742',edge:'#f1c391',tree:'#8b4d3c',stripe:'#e5a869'},
 summit:{ground:'#3b3e5b',light:'#686180',water:'#272d49',road:'#4a4960',edge:'#d7c4df',tree:'#47425c',stripe:'#c089cf'},
});
function path(ctx,t){ctx.beginPath();t.samples.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(t.closed!==false)ctx.closePath();}
const maps=tracks.map(t=>{const c=document.createElement('canvas');c.width=1600;c.height=1100;const x=c.getContext('2d'),p=palettes[t.theme];x.fillStyle=p.ground;x.fillRect(0,0,1600,1100);
 // Shoreline, contour lines, scattered scenery, and an infield grandstand.
 x.fillStyle=p.water;x.beginPath();x.moveTo(1520,0);x.bezierCurveTo(1300,170,1610,400,1495,680);x.bezierCurveTo(1410,870,1530,900,1450,1100);x.lineTo(1600,1100);x.lineTo(1600,0);x.fill();
 for(let j=0;j<8;j++){x.strokeStyle=t.theme==='coast'?'#ffffff0a':'#ffffff08';x.lineWidth=3;x.beginPath();x.ellipse(800,550,140+j*115,70+j*70,-.15,0,Math.PI*2);x.stroke();}
 for(let i=0;i<105;i++){const px=60+((i*173+39)%1470),py=60+((i*311+83)%970);if(nearest(t,px,py).distance<t.width*.9)continue;x.fillStyle='#14251a25';x.beginPath();x.ellipse(px+6,py+9,16+(i%3)*5,12+(i%3)*4,0,0,Math.PI*2);x.fill();x.fillStyle=i%3?p.tree:p.light;x.beginPath();
  if(['alpine','summit'].includes(t.theme)){x.moveTo(px,py-27);x.lineTo(px+23,py+17);x.lineTo(px-23,py+17);x.closePath();}
  else if(t.theme==='harbor'){x.rect(px-17,py-11,34,22);}
  else if(t.theme==='forest'){x.moveTo(px,py-24);x.lineTo(px+16,py+16);x.lineTo(px-16,py+16);x.closePath();}
  else{x.arc(px,py,13+(i%4)*3,0,Math.PI*2);}
  x.fill();}
 // Paint narrow lanes first so junctions merge cleanly into the main road.
 for(const road of [...t.shortcuts,t]){
  path(x,road);x.lineJoin='round';x.lineCap='round';x.lineWidth=road.width+21;x.strokeStyle='#12261a35';x.stroke();path(x,road);x.lineWidth=road.width+9;x.strokeStyle=p.edge;x.stroke();path(x,road);x.lineWidth=road.width+9;x.strokeStyle=road.closed===false?'#9be3ca':p.stripe;x.setLineDash([20,24]);x.stroke();x.setLineDash([]);path(x,road);x.lineWidth=road.width;x.strokeStyle=p.road;x.stroke();path(x,road);x.lineWidth=2;x.strokeStyle='#ffffff25';x.setLineDash([20,30]);x.stroke();x.setLineDash([]);
 }
 for(const lane of t.shortcuts){const entry=lane.samples[25];x.save();x.translate(entry.x,entry.y);x.rotate(entry.angle);x.fillStyle='#9be3ca';x.font='bold 13px monospace';x.textAlign='center';x.fillText('SHORTCUT →',0,-lane.width/2-12);x.restore();}
 const start=t.samples[0];x.save();x.translate(start.x,start.y);x.rotate(start.angle);for(let a=0;a<3;a++)for(let b=0;b<12;b++){x.fillStyle=(a+b)%2?'#edf0de':'#26322b';x.fillRect(a*9-13,b*t.width/12-t.width/2,9,t.width/12);}x.restore();
 x.save();x.translate(760,540);x.rotate(-.11);x.font='900 76px Arial';x.fillStyle='#ffffff16';x.textAlign='center';x.fillText('MICRO',0,0);x.fillText('RACING',0,75);x.font='12px monospace';x.fillStyle='#ffffff55';x.fillText('FIND YOUR LINE.',0,112);x.restore();
 for(let i=0;i<6;i++){x.fillStyle=i%2?'#e2d8b4':'#e28367';x.fillRect(420+i*32,100,27,43);x.fillStyle='#283c3033';x.fillRect(425+i*32,143,27,8)}
 return c;});
function fit(canvas){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}const x=canvas.getContext('2d');x.setTransform(d,0,0,d,0,0);return {x,w:r.width,h:r.height};}
function carDraw(x,c,scale=1,ghost=false){x.save();x.translate(c.x,c.y);x.rotate(c.angle);x.scale(scale,scale);x.globalAlpha=ghost?.35:1;x.fillStyle='#07181066';x.fillRect(-14+3,-9+4,31,20);x.fillStyle='#121a18';x.fillRect(-12,-13,10,5);x.fillRect(7,-13,9,5);x.fillRect(-12,8,10,5);x.fillRect(7,8,9,5);x.fillStyle=c.color;x.beginPath();x.roundRect(-18,-10,37,20,5);x.fill();x.fillStyle='#e9efdb';x.fillRect(-9,-3,24,6);x.fillStyle='#243b36';x.fillRect(-6,-8,10,16);x.fillStyle=c.color;x.fillRect(-3,-7,5,14);x.fillStyle='#ffecb1';x.fillRect(15,-8,3,5);x.fillRect(15,3,3,5);x.fillStyle='#ee4935';x.fillRect(-17,-8,3,4);x.fillRect(-17,4,3,4);x.restore();}
function mapPreview(canvas,index,animated=false,time=0){const {x,w,h}=fit(canvas);if(!w)return;const scale=Math.max(w/1600,h/1100);x.fillStyle=palettes[tracks[index].theme].ground;x.fillRect(0,0,w,h);x.save();x.translate(w/2,h/2);x.scale(scale*1.02,scale*1.02);x.translate(-800,-550);x.drawImage(maps[index],0,0);if(animated){for(let i=0;i<3;i++){const samples=tracks[index].samples,p=samples[Math.floor((time*.018-i*14+samples.length*100)%samples.length)];carDraw(x,{...p,color:COLORS[i]},2.1)}}x.restore();}
function medalLabel(medal){return medal?medal[0].toUpperCase()+medal.slice(1):'No medal yet';}
function renderProgress(){
 previewDirty=true;
 const summary=progressionSummary(saved);
 $('career').innerHTML=`<div class="career-header"><div><div class="eyebrow">YOUR RACING JOURNEY</div><h2>The whole grid is yours.</h2></div><span class="career-local">SAVED ON THIS DEVICE</span></div>
 <div class="career-stats"><div><strong>${saved.races}</strong><span>Races finished</span></div><div><strong>${summary.medals}<small> / ${tracks.length}</small></strong><span>Medaled circuits</span></div><div><strong>${tracks.length}<small> / ${tracks.length}</small></strong><span>Tracks unlocked</span></div></div>
 <p class="career-complete">All ${tracks.length} circuits are ready to race. Chase a gold time on every track.</p>`;
 $('tracks').innerHTML=tracks.map((t,i)=>{
  const medal=medalFor(t.id,saved.best[t.id]);
  return `<button class="track ${i===selected?'selected':''}" data-track="${i}" aria-pressed="${i===selected}" aria-label="${t.name}, ${t.difficulty}${t.shortcuts.length?', '+t.shortcuts.length+' shortcuts':''}"><div class="track-art"><canvas id="track${i}"></canvas><span class="track-num">${String(i+1).padStart(2,'0')}</span></div><div class="track-copy"><strong>${t.name}</strong><span>${t.difficulty.toUpperCase()}${t.shortcuts.length?' · '+t.shortcuts.length+' SHORTCUTS':''} · 3 LAPS</span><small class="track-status ${medal||''}">${medal?'◆ '+medalLabel(medal):'Ready to race'}</small></div></button>`;
 }).join('');
 document.querySelectorAll('.track').forEach(b=>b.onclick=()=>selectTrack(+b.dataset.track));
}
renderProgress();
function selectMode(m){mode=m;document.querySelectorAll('.mode').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===m);b.setAttribute('aria-pressed',b.dataset.mode===m)});$('modeHint').textContent=m==='duo'?'Face-to-face racing. Player 1 sits at the top; Player 2 at the bottom.':m==='trial'?'Just you and the clock. Beat your best, then challenge a friend.':'Three laps. Three rivals. One first place.';$('startNote').textContent=m==='duo'?'Two drivers. Shared device. Automatic acceleration.':'Steer with ← → or A / D. We handle the gas.';selectTrack(selected);}
function selectTrack(i){
 selected=i;
 const track=tracks[i],targets=TARGETS[track.id];
 document.querySelectorAll('.track').forEach(b=>{b.classList.toggle('selected',+b.dataset.track===i);b.setAttribute('aria-pressed',+b.dataset.track===i)});
 $('summaryTrack').textContent=track.name;
 $('bestTime').textContent=formatTime(saved.best[track.id]);
 document.querySelector('.art-number').innerHTML=`${String(i+1).padStart(2,'0')} <span>/ ${String(tracks.length).padStart(2,'0')}</span>`;
 $('heroCanvas').setAttribute('aria-label',`Illustration of the ${track.name} racing circuit`);
 $('start').disabled=false;
 $('start').innerHTML='LET’S RACE <span>↗</span>';
 $('startNote').textContent=mode==='duo'?'Two drivers. Shared device. Automatic acceleration.':'Steer with ← → or A / D. We handle the gas.';
 $('trackDetails').innerHTML=`<div class="track-detail-title"><strong>${track.name}</strong><span>${medalLabel(medalFor(track.id,saved.best[track.id]))}</span></div><p>${track.description}</p><div class="medal-targets">${['bronze','silver','gold'].map(m=>`<span class="${m}">◆ ${medalLabel(m)} <b>≤ ${formatTime(targets[m])}</b></span>`).join('')}</div><small>Three-lap time-trial targets, including recovery penalties.</small>`;
}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));document.querySelectorAll('.track').forEach(b=>b.onclick=()=>selectTrack(+b.dataset.track));
function openModal(html){$('modalContent').innerHTML=html;$('modal').showModal()}
$('closeModal').onclick=()=>$('modal').close();$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close()}});
$('help').onclick=()=>openModal(`<div class="eyebrow">A LITTLE HEAD START</div><h2>Find your line.</h2><p>Your car accelerates automatically. Steer left or right, ease off with the brake before a bend, and stay on the asphalt.</p><ul><li><b>Phone:</b> drag the steering slider left or right. Move it a little for gentle turns or to the edge for full steering; release to straighten up. Hold BRAKE through tight turns. Choose your steering side in Settings or the pause menu; each player can choose separately.</li><li><b>Keyboard:</b> arrows or A / D steer. Space brakes. R resets your car with a 3-second penalty.</li><li><b>Two players:</b> Player 1 uses arrows + Space. Player 2 uses A / D + S. Sit at opposite ends of the device. Player 1’s view and controls face the top edge; Player 2’s face the bottom.</li><li>Complete 3 laps in the correct direction. Follow checkpoints in order. Marked narrow shortcut lanes count when you enter and follow the full lane; cutting across grass does not.</li></ul><p>Time trials save your best on this device. Finish a trial to share a challenge link with a friend.</p>`);
$('privacy').onclick=()=>openModal(`<div class="eyebrow">ALL PLAY. NO STRINGS.</div><h2>Your race.<br>Your device.</h2><p>The game has no accounts, ads, analytics, or third-party scripts. Best times, preferences, and race count are stored only in your browser.</p><p>Two-player racing happens on the same device. Challenge links contain only the circuit and a target time, shared when you choose.</p><p>Clearing browser storage removes your records. Your hosting provider still processes ordinary page requests.</p>`);
function steeringSettings(count=2){
 return `<fieldset class="control-layout"><legend>Steering side</legend><p>Left and right are from each driver's view. Brake moves to the other side.</p>${Array.from({length:count},(_,i)=>`<label class="setting-row"><span>Player ${i+1}${i===0?' / solo':''}</span><select class="steering-side-choice" data-player="${i}" aria-label="Player ${i+1} steering side"><option value="left" ${saved.steeringSides[i]==='left'?'selected':''}>Left</option><option value="right" ${saved.steeringSides[i]==='right'?'selected':''}>Right</option></select></label>`).join('')}</fieldset>`;
}
function bindSteeringSettings(){
 document.querySelectorAll('.steering-side-choice').forEach(select=>select.onchange=()=>{
  saved.steeringSides[+select.dataset.player]=select.value==='right'?'right':'left';
  clearInput();persist();if(race)controls();
 });
}
$('settings').onclick=()=>{openModal(`<div class="eyebrow">THE GARAGE</div><h2>Make yourself at home.</h2>${steeringSettings()}<label class="setting-row">Countdown & finish sounds<input id="soundSetting" type="checkbox" ${saved.sound?'checked':''}></label><div class="setting-row"><span>Races completed</span><strong>${saved.races}</strong></div><p>Your races, medals, and preferences stay in this browser. All tracks are always available.</p><button class="secondary" id="exportData">Export my records</button><button class="secondary danger" id="clearData">Clear local records</button>`);bindSteeringSettings();$('soundSetting').onchange=e=>{saved.sound=e.target.checked;persist();tone()};$('exportData').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}));a.href=url;a.download='micro-racing-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('clearData').onclick=()=>{openModal('<h2>Clear your records?</h2><p>This removes best times, race count, and settings from this browser. All tracks remain available. This cannot be undone.</p><button class="primary" id="confirmClear">CLEAR RECORDS</button>');$('confirmClear').onclick=()=>{saved=normalizeProgress(null);persist();renderProgress();selectTrack(selected);$('modal').close();toast('Local records cleared.')}};};
function parseChallenge(){try{const p=new URLSearchParams(location.hash.slice(1)),id=p.get('track'),target=Number(p.get('time'));if(p.get('challenge')==='1'&&tracks.some(t=>t.id===id)&&Number.isFinite(target)&&target>=15&&target<=3600){challenge={track:id,time:target};selectTrack(tracks.findIndex(t=>t.id===id));selectMode('trial');$('challengeBanner').hidden=false;$('challengeBanner').textContent=`CHALLENGE ACCEPTED? Beat ${formatTime(target)} on ${tracks[selected].name}. Select Time trial and hit the track.`}}catch{}}
parseChallenge();selectTrack(selected);
function clearInput(){keys.clear();held.forEach(s=>s.clear());touch=[{steer:0,brake:false},{steer:0,brake:false}];document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));document.querySelectorAll('.steering-slider').forEach(s=>s.value=0)}
// Player panels use the same bounds and orientation as their canvas viewport.
function playerPanelClass(i){return `player-panel ${mode==='duo'?(i===0?'top-player':'bottom-player'):''}`;}
function controls(){
 const count=mode==='duo'?2:1;
 $('touchControls').innerHTML=Array.from({length:count},(_,i)=>`<div class="${playerPanelClass(i)}"><div class="touch-zone ${saved.steeringSides[i]==='right'?'steer-right':''}"><label class="steering"><span>← STEER →</span><input class="steering-slider" type="range" min="-100" max="100" step="1" value="0" data-player="${i}" aria-label="Player ${i+1} steering" aria-describedby="steeringHint${i}"><small id="steeringHint${i}">RELEASE TO CENTER</small></label><div><button class="touch-button recover" data-player="${i}" data-action="recover" aria-label="Recover player ${i+1}">↺</button><button class="touch-button brake" data-player="${i}" data-action="brake" aria-label="Player ${i+1} brake">BRAKE</button></div></div></div>`).join('');
 document.querySelectorAll('.steering-slider').forEach(slider=>{
  const i=+slider.dataset.player;
  const center=()=>{slider.value=0;touch[i].steer=0;};
  slider.oninput=()=>{touch[i].steer=clamp(Number(slider.value)/100,-1,1);};
  slider.onpointerdown=e=>slider.setPointerCapture(e.pointerId);
  slider.onpointerup=center;slider.onpointercancel=center;slider.onlostpointercapture=center;slider.onblur=center;
  // Let the focused range handle its own arrow keys without steering twice.
  const rangeKeys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];
  slider.onkeydown=e=>{if(rangeKeys.includes(e.key))e.stopPropagation();};
  slider.onkeyup=e=>{if(rangeKeys.includes(e.key)){e.stopPropagation();center();}};
 });
 document.querySelectorAll('.touch-button').forEach(b=>{
  const i=+b.dataset.player,a=b.dataset.action;
  const release=()=>{held[i].delete(a);b.classList.remove('held');syncTouch(i)};
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(a==='recover'){if(race?.phase==='running')recoverCar(race.cars[i],race.track);return}held[i].add(a);b.classList.add('held');syncTouch(i)};
  b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
 });
}
function syncTouch(i){touch[i].brake=held[i].has('brake');}
function input(i){if(i===1)return {steer:touch[i].steer+(keys.has('d')?1:0)-(keys.has('a')?1:0),brake:touch[i].brake||keys.has('s')};return {steer:touch[0].steer+(keys.has('arrowright')?1:0)-(keys.has('arrowleft')?1:0)+(mode!=='duo'?((keys.has('d')?1:0)-(keys.has('a')?1:0)):0),brake:touch[0].brake||keys.has(' ')||keys.has('arrowdown')};}
function startRace(){clearInput();$('home').hidden=true;$('game').hidden=false;$('game').classList.toggle('duo',mode==='duo');document.body.classList.add('racing');$('raceOverlay').hidden=true;const t=tracks[selected];race={track:t,trackIndex:selected,mode,phase:'countdown',elapsed:0,countdown:3.5,lastBeep:4,cars:[createCar(t,0)],finishedAt:null};if(mode==='race'){for(let i=1;i<4;i++)race.cars.push(createCar(t,i,true))}if(mode==='duo'){race.cars.push(createCar(t,1));race.cars[0].name='Player 1'}$('raceTrackName').textContent=t.name;$('raceModeName').textContent=mode==='duo'?'LOCAL TWO-PLAYER':mode==='trial'?'TIME TRIAL · 3 LAPS':'QUICK RACE · 3 LAPS';$('hud').innerHTML=Array.from({length:mode==='duo'?2:1},(_,i)=>`<div class="${playerPanelClass(i)}"><div class="hud-player"><div class="hud-stat name" style="border-color:${COLORS[i]}"><label>DRIVER</label><strong>P${i+1}</strong></div><div class="hud-stat"><label>LAP</label><strong id="lap${i}">1 / 3</strong></div><div class="hud-stat"><label>TIME</label><strong id="time${i}">0:00.00</strong></div><div class="hud-stat"><label>${mode==='trial'?'BEST':'POS'}</label><strong id="pos${i}">—</strong></div></div></div>`).join('');$('keyboardHelp').textContent=mode==='duo'?'P1: ← → + SPACE  ·  P2: A D + S  ·  P TO PAUSE':'← → STEER · SPACE BRAKE · R RECOVER · P PAUSE';controls();tone(330,.08);last=performance.now();}
$('start').onclick=startRace;
function exitRace(){race=null;clearInput();$('game').hidden=true;$('home').hidden=false;document.body.classList.remove('racing');$('countdown').textContent='';selectTrack(selected);window.scrollTo(0,0)}
function pauseRace(){if(!race||race.phase==='results')return;clearInput();if(race.phase==='paused'){race.phase=race.resumePhase;$('raceOverlay').hidden=true;return}race.resumePhase=race.phase;race.phase='paused';$('raceOverlay').hidden=false;$('raceOverlay').innerHTML=`<div class="overlay-card"><div class="eyebrow">TAKE A BREATHER</div><h2>In the pits.</h2><p>Your race is paused.</p>${steeringSettings(mode==='duo'?2:1)}<button class="primary" id="resume">BACK TO THE TRACK <span>↗</span></button><button class="secondary" id="restart">Restart race</button><button class="secondary" id="quit">Leave race</button></div>`;bindSteeringSettings();$('resume').onclick=pauseRace;$('restart').onclick=startRace;$('quit').onclick=exitRace;}
$('pause').onclick=pauseRace;$('exitRace').onclick=()=>{if(race?.phase==='results')exitRace();else if(race?.phase!=='paused')pauseRace()};
window.addEventListener('keydown',e=>{if(!race||e.target.matches?.('.steering-side-choice'))return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowdown','arrowup',' ','a','d','s','p','r','escape'].includes(k))e.preventDefault();if((k==='p'||k==='escape')&&!e.repeat){pauseRace();return}if(k==='r'&&!e.repeat&&race.phase==='running')recoverCar(race.cars[0],race.track);keys.add(k)});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{clearInput();if(race&&['running','countdown'].includes(race.phase))pauseRace()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(race&&['running','countdown'].includes(race.phase))pauseRace()}});
function shareChallenge(){const t=race.cars[0].finishTime,url=new URL(location.href);url.hash=new URLSearchParams({challenge:'1',track:race.track.id,time:t.toFixed(2)}).toString();const text=`Can you beat ${formatTime(t)} on ${race.track.name}?`;if(navigator.share){navigator.share({title:'Micro Racing challenge',text,url:url.href}).catch(e=>{if(e.name!=='AbortError')copyLink(url.href)});}else copyLink(url.href);}
async function copyLink(url){try{await navigator.clipboard.writeText(url);toast('Challenge link copied. Send it to a friend!')}catch{openModal('<h2>Your challenge link</h2><p>Copy this link and send it to a friend.</p><input class="challenge-input" id="challengeLink" readonly>');$('challengeLink').value=url;$('challengeLink').select();}}
function finishRace(){
 if(!race||race.phase==='results')return;
 race.phase='results';clearInput();$('countdown').textContent='';
 const c=race.cars[0],order=raceOrder(race.cars,race.track);
 const finisher=mode==='duo'?order.find(car=>!car.bot&&car.finished):c;
 const outcome=recordFinish(saved,{trackId:race.track.id,mode,time:finisher?.finishTime,completed:!!finisher?.finished});
 saved=outcome.progress;persist();renderProgress();tone(880,.35);
 const title=mode==='duo'?`${order[0].name} wins!`:mode==='trial'?'Across the line.':order[0]===c?'First feels good.':'That’s a wrap.';
 const rows=mode==='trial'?'':order.map((v,i)=>`<div class="result-row ${v.id===0?'you':''}"><span>${i+1}. ${v.name}</span><strong>${v.finished?formatTime(v.finishTime):'DNF'}</strong></div>`).join('');
 let msg=mode==='trial'?(outcome.personalBest?'A new benchmark. Your next rival is you.':'Every lap is a chance to find a little more.'):'Same circuit. Fresh rivalry. Go again?';
 if(mode==='trial'&&challenge?.track===race.track.id)msg=c.finishTime<challenge.time?'Challenge beaten. Your friend has work to do.':`Challenge target: ${formatTime(challenge.time)}. Have another go!`;
 const newTracks=outcome.newlyUnlocked;
 const reward=`${outcome.medalImproved?`<div class="medal-reward ${outcome.medal}">◆ ${medalLabel(outcome.medal).toUpperCase()} MEDAL EARNED</div>`:''}${newTracks.length?`<div class="unlock-reward"><span>NEW CIRCUIT${newTracks.length>1?'S':''} UNLOCKED</span><strong>${newTracks.map(t=>t.name).join(' · ')}</strong></div>`:''}<p class="result-progress">${saved.races} races finished · ${progressionSummary(saved).medals} medaled circuits</p>`;
 $('raceOverlay').hidden=false;
 $('raceOverlay').innerHTML=`<div class="overlay-card"><div class="eyebrow">${race.track.name.toUpperCase()} · FINISH</div><h2>${title}</h2>${mode==='trial'?`<div class="result-time">${formatTime(c.finishTime)}</div>${outcome.personalBest?'<div class="new-best">✦ NEW PERSONAL BEST</div>':''}`:rows}<p>${msg}</p>${reward}${!storageOK?'<p class="storage-note">Browser storage unavailable. Progress lasts only for this session.</p>':''}<button class="primary" id="again">RACE AGAIN <span>↗</span></button>${newTracks.length?'<button class="secondary" id="tryUnlocked">Explore new circuit ↗</button>':''}${mode==='trial'?'<button class="secondary" id="share">Challenge a friend ↗</button>':''}<button class="secondary" id="back">Back to garage</button></div>`;
 $('again').onclick=startRace;$('back').onclick=exitRace;
 if($('share'))$('share').onclick=shareChallenge;
 if($('tryUnlocked'))$('tryUnlocked').onclick=()=>{exitRace();selectTrack(tracks.findIndex(t=>t.id===newTracks[0].id));};
}

function renderView(x,rect,c,index){const t=race.track;x.save();x.beginPath();x.rect(rect.x,rect.y,rect.w,rect.h);x.clip();x.fillStyle=palettes[t.theme].ground;x.fillRect(rect.x,rect.y,rect.w,rect.h);const scale=clamp(Math.min(rect.w/650,rect.h/540),.48,1.4);x.translate(rect.x+rect.w/2,rect.y+rect.h*.59);x.scale(scale,scale);x.rotate(-c.angle-Math.PI/2);x.translate(-c.x,-c.y);x.drawImage(maps[index],0,0);race.cars.forEach(v=>carDraw(x,v));const gate=checkpointFor(c,t);x.save();x.translate(gate.x,gate.y);x.rotate(gate.angle);x.fillStyle='#ffffff2a';x.beginPath();x.moveTo(-8,-10);x.lineTo(5,0);x.lineTo(-8,10);x.lineTo(-2,0);x.closePath();x.fill();x.restore();x.restore();
 // Circuit mini-map; its progress marker follows the viewed driver.
 const mw=rect.w<600?88:130,mh=mw*.69,mx=rect.x+rect.w-mw-15,my=rect.y+(mode==='duo'?(rect.w<600?100:40):(rect.w<600?145:85));x.save();x.fillStyle='#15251dc9';x.beginPath();x.roundRect(mx-5,my-5,mw+10,mh+10,6);x.fill();x.translate(mx,my);x.scale(mw/1600,mh/1100);for(const lane of t.shortcuts){path(x,lane);x.strokeStyle='#9be3ca';x.lineWidth=20;x.stroke();}path(x,t);x.strokeStyle='#9eb7a0';x.lineWidth=38;x.stroke();race.cars.forEach(v=>{x.fillStyle=v.color;x.beginPath();x.arc(v.x,v.y,45,0,Math.PI*2);x.fill()});x.restore();
 if(c.finished){x.fillStyle='#0e201cb5';x.fillRect(rect.x,rect.y+rect.h*.35,rect.w,74);x.fillStyle=c.color;x.textAlign='center';x.font='bold 25px Arial';x.fillText('FINISHED',rect.x+rect.w/2,rect.y+rect.h*.35+31);x.font='13px monospace';x.fillText(formatTime(c.finishTime),rect.x+rect.w/2,rect.y+rect.h*.35+54);}
 if(mode==='duo'&&$('countdown').textContent){
  x.save();x.textAlign='center';x.textBaseline='middle';
  x.font='italic 900 70px Arial';x.fillStyle='#f5f3df';
  x.shadowColor='#17241b';x.shadowOffsetY=4;
  x.fillText($('countdown').textContent,rect.x+rect.w/2,rect.y+rect.h/2);
  x.restore();
 }
}
function renderRace(){const {x,w,h}=fit($('raceCanvas'));if(mode==='duo'){
 // Rotate around the centre of the top half, including its mini-map and text.
 // Restore before drawing Player 2 so their view remains upright.
 x.save();
 x.translate(w,h/2);
 x.rotate(Math.PI);
 renderView(x,{x:0,y:0,w,h:h/2},race.cars[0],selected);
 x.restore();
 renderView(x,{x:0,y:h/2,w,h:h/2},race.cars[1],selected);x.fillStyle='#131b16';x.fillRect(0,h/2-2,w,4);}else renderView(x,{x:0,y:0,w,h},race.cars[0],selected);const order=raceOrder(race.cars,race.track);for(let i=0;i<(mode==='duo'?2:1);i++){const c=race.cars[i];$('lap'+i).textContent=`${Math.min(c.lap+1,3)} / 3`;$('time'+i).textContent=formatTime(c.finished?c.finishTime:race.elapsed+c.penalty);$('pos'+i).textContent=mode==='trial'?formatTime(saved.best[race.track.id]):`${order.indexOf(c)+1} / ${race.cars.length}`;}}
let previewFrame=0;
window.addEventListener('resize',()=>{previewDirty=true;});
function loop(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(race){if(race.phase==='countdown'){race.countdown-=dt;const n=Math.ceil(race.countdown);$('countdown').textContent=n>0?Math.min(n,3):'GO!';if(n!==race.lastBeep){race.lastBeep=n;if(n<=3&&n>0)tone(440,.09)}if(race.countdown<=0){race.phase='running';$('countdown').textContent='GO!';tone(880,.18)}}else if(race.phase==='running'){race.elapsed+=dt;if(race.elapsed>.8)$('countdown').textContent='';const steps=Math.ceil(dt/(1/120));for(let s=0;s<steps;s++)race.cars.forEach((c,i)=>updateCar(c,race.track,{...input(i===1&&mode==='duo'?1:0),steer:clamp(input(i===1&&mode==='duo'?1:0).steer,-1,1)},dt/steps,race.elapsed));const players=race.cars.filter(c=>!c.bot);if(mode==='duo'&&players.some(c=>c.finished)&&race.finishedAt===null)race.finishedAt=race.elapsed;if(players.every(c=>c.finished)||(mode==='duo'&&race.finishedAt!==null&&race.elapsed-race.finishedAt>30))finishRace();}renderRace();}else if(now-previewFrame>70){previewFrame=now;mapPreview($('heroCanvas'),selected,!matchMedia('(prefers-reduced-motion: reduce)').matches,now);if(previewDirty){tracks.forEach((t,i)=>mapPreview($('track'+i),i));previewDirty=false;}}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
