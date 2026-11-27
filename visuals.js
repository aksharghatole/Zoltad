// Original procedural neon visuals; loaded before game.js.
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxButton=document.getElementById('fx');
function syncFX(){fxButton.textContent=reduced?'FX: LOW':'FX: FULL';fxButton.setAttribute('aria-pressed',String(reduced));}
fxButton.addEventListener('click',()=>{reduced=!reduced;syncFX();});syncFX();
const effects={};
function resetEffects(){Object.assign(effects,{sparks:[],trails:[],rings:[],hit:0,cooldown:0,clock:0,near:0,wallCooldown:0,wallHit:0,smash:0,fragments:[]});}
const random=(a,b)=>a+Math.random()*(b-a);
function burst(x,y,color,count){
  if(reduced)count=Math.min(count,5);
  for(let n=0;n<count;n++){const a=random(0,Math.PI*2),s=random(45,340),life=random(.18,.65);effects.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color});}
  if(effects.sparks.length>180)effects.sparks.splice(0,effects.sparks.length-180);
  effects.rings.push({x,y,life:.48,color});if(effects.rings.length>8)effects.rings.shift();
}
function crashEffect(p){cam.shake=reduced?0:18;effects.hit=.15;burst(p.x,p.y,'#ffecbb',42);burst(p.x,p.y,'#ff397d',24);}
function tickEffects(dt,realDt=dt){
  effects.near=Math.max(0,effects.near-dt);
  effects.smash=Math.max(0,effects.smash-dt);
  tickFragments(dt);
  effects.wallCooldown=Math.max(0,effects.wallCooldown-dt);
  effects.wallHit=Math.max(0,effects.wallHit-dt);
  effects.hit=Math.max(0,effects.hit-realDt);effects.cooldown=Math.max(0,effects.cooldown-dt);cam.shake*=Math.exp(-12*dt);
  for(const p of effects.sparks){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt);}
  for(const p of effects.trails)p.life-=dt;for(const r of effects.rings)r.life-=dt;
  effects.sparks=effects.sparks.filter(p=>p.life>0);effects.trails=effects.trails.filter(p=>p.life>0);effects.rings=effects.rings.filter(r=>r.life>0);
}
function recordTrail(p,dt){
  effects.clock+=dt;if(effects.clock<.032||p.speed<90)return;effects.clock=0;
  const side=Math.abs(p.vx*-Math.sin(p.angle)+p.vy*Math.cos(p.angle));
  if(!reduced && p.drifting && effects.sparks.length<140){
    const life=.28;effects.sparks.push({x:p.x-Math.cos(p.angle)*16,y:p.y-Math.sin(p.angle)*16,vx:-p.vx*.25+random(-40,40),vy:-p.vy*.25+random(-40,40),life,max:life,color:'#ffb06b'});
  }
  for(const sign of [-1,1]){const life=side>55?.65:.24;effects.trails.push({x:p.x-Math.cos(p.angle)*13-sign*Math.sin(p.angle)*8,y:p.y-Math.sin(p.angle)*13+sign*Math.cos(p.angle)*8,vx:p.vx,vy:p.vy,life,max:life,width:side>55?3:1.5,color:side>55?'#ff78c9':'#ab316c'});}
  if(effects.trails.length>96)effects.trails.splice(0,effects.trails.length-96);
}
function drawEffects(g,ox,oy){
  drawFragments(g,ox,oy);
  g.save();
  for(const p of effects.trails){g.globalAlpha=.55*p.life/p.max;g.strokeStyle=p.color;g.lineWidth=p.width;g.beginPath();g.moveTo(p.x+ox,p.y+oy);g.lineTo(p.x+ox-p.vx*.045,p.y+oy-p.vy*.045);g.stroke();}
  for(const r of effects.rings){const t=1-r.life/.48;g.globalAlpha=(1-t)*.7;g.strokeStyle=r.color;g.lineWidth=2;g.beginPath();g.arc(r.x+ox,r.y+oy,10+t*100,0,Math.PI*2);g.stroke();}
  for(const p of effects.sparks){g.globalAlpha=p.life/p.max;g.strokeStyle=p.color;g.lineWidth=2;g.beginPath();g.moveTo(p.x+ox,p.y+oy);g.lineTo(p.x+ox-p.vx*.035,p.y+oy-p.vy*.035);g.stroke();}
  g.restore();
}
function drawDistrict(g,ox,oy){
  const tile=240,road=108;
  const x0=Math.floor((cam.x-W/2-120)/tile),x1=Math.ceil((cam.x+W/2+120)/tile);
  const y0=Math.floor((cam.y-H/2-120)/tile),y1=Math.ceil((cam.y+H/2+120)/tile);
  g.fillStyle='#101421';g.fillRect(0,0,W,H);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const xx=x*tile+ox,yy=y*tile+oy;
    // Decorative driveable plazas, not collision obstacles.
    g.fillStyle='#0b0d19';g.fillRect(xx+road/2,yy+road/2,tile-road,tile-road);
    g.strokeStyle='#25304a';g.lineWidth=1;g.strokeRect(xx+road/2+5,yy+road/2+5,tile-road-10,tile-road-10);
    g.fillStyle=((x*17+y*31)%3+3)%3===0?'#522449':'#204254';g.fillRect(xx+road/2+9,yy+road/2+9,38,2);g.fillRect(xx+tile-road/2-11,yy+tile-road/2-38,2,29);
    g.fillStyle='#262c40';for(let k=0;k<3;k++)g.fillRect(xx+road/2+12+k*29,yy+tile-road/2-14,15,2);
    g.fillStyle='#313247';g.fillRect(xx+road/2,yy-1,28,2);g.fillRect(xx-1,yy+road/2,2,28);
    g.fillStyle='#192535';g.fillRect(xx-24,yy-24,48,48);g.strokeStyle='#334255';g.strokeRect(xx-24,yy-24,48,48);
  }
  const wash=g.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.65);wash.addColorStop(0,'rgba(95,40,130,.07)');wash.addColorStop(1,'rgba(0,0,12,.38)');g.fillStyle=wash;g.fillRect(0,0,W,H);
}
function drawImpact(g,p,view){
  if(reduced)return;
  if(game.state==='playing'&&p.speed>280){
    const a=(p.speed-280)/150,heading=Math.atan2(p.vy,p.vx);
    g.save();g.strokeStyle='rgba(137,208,255,'+(.16*a)+')';g.lineWidth=1.5;
    for(let k=0;k<14;k++){const theta=k*Math.PI*2/14,r=200+((k*47+game.elapsed*160)%140),x=W/2+Math.cos(theta)*r*1.7,y=H/2+Math.sin(theta)*r;g.beginPath();g.moveTo(x,y);g.lineTo(x-Math.cos(heading)*38*a,y-Math.sin(heading)*38*a);g.stroke();}g.restore();
  }
  if(effects.hit>0){
    g.save();g.globalAlpha=Math.min(.7,effects.hit*5);g.filter='grayscale(1) contrast(1.4)';paintScene(g,view);g.restore();
    const x=view.x,y=view.y;g.save();g.globalAlpha=effects.hit/.15;g.strokeStyle='#fff0bf';g.lineWidth=3;
    for(let k=0;k<12;k++){const a=k*Math.PI/6;g.beginPath();g.moveTo(x+Math.cos(a)*24,y+Math.sin(a)*24);g.lineTo(x+Math.cos(a)*73,y+Math.sin(a)*73);g.stroke();}g.restore();
  }
}

// Stable, seeded rain positions: no per-frame random flicker or particle allocation.
const rainDrops=Array.from({length:105},(_,n)=>({
  x:((n*127.13+31)%997)/997,
  y:((n*79.71+63)%563)/563,
  speed:180+(n*37)%170,
  length:8+(n*13)%19,
  alpha:.06+(n%5)*.022
}));
const wrap=(x,n)=>((x%n)+n)%n;
function drawWetRoad(g,ox,oy){
  // Elongated reflections are stylized ground light, not a second copy of the cars.
  g.save();
  const tile=240;
  const x0=Math.floor((cam.x-W/2-100)/tile),x1=Math.ceil((cam.x+W/2+100)/tile);
  const y0=Math.floor((cam.y-H/2-100)/tile),y1=Math.ceil((cam.y+H/2+100)/tile);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const xx=x*tile+ox,yy=y*tile+oy;
    g.fillStyle='rgba(255,62,148,.045)';g.fillRect(xx+22,yy-50,11,100);
    g.fillStyle='rgba(55,214,255,.055)';g.fillRect(xx-50,yy+21,100,10);
    g.strokeStyle='rgba(117,178,203,.11)';g.lineWidth=1;
    g.beginPath();g.moveTo(xx-45,yy-45);g.lineTo(xx+45,yy-45);g.moveTo(xx-45,yy+45);g.lineTo(xx+45,yy+45);g.stroke();
  }
  for(const car of [game.player,...game.cops]){
    const x=car.x+ox,y=car.y+oy;
    const light=g.createRadialGradient(x,y,3,x,y,65);
    const player=car===game.player;
    light.addColorStop(0,player?'rgba(255,45,149,.21)':'rgba(0,229,255,.17)');
    light.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=light;g.fillRect(x-65,y-65,130,130);
  }
  g.restore();
}
function drawRain(g){
  if(reduced)return;
  const time=game.elapsed+game.bustedTime;
  g.save();g.lineWidth=1;
  // Five opacity buckets keep draw calls bounded.
  for(let group=0;group<5;group++){
    g.strokeStyle='rgba(178,218,255,'+(.06+group*.022)+')';
    g.beginPath();
    for(let n=group;n<rainDrops.length;n+=5){
      const d=rainDrops[n];
      const x=wrap(d.x*W-time*65-cam.x*.12,W+40)-20;
      const y=wrap(d.y*H+time*d.speed-cam.y*.12,H+40)-20;
      g.moveTo(x,y);g.lineTo(x-5,y+d.length);
    }
    g.stroke();
  }
  g.restore();
}
function drawDrivingFeedback(g,p){
  if(game.state!=='playing')return;
  const near=effects.near>0,drift=p.drifting;
  if(!near&&!drift)return;
  g.save();
  g.globalAlpha=near?Math.min(1,effects.near*3):.85;
  g.font='bold 15px monospace';g.textAlign='center';
  g.fillStyle='rgba(5,9,18,.82)';g.fillRect(W/2-88,H-62,176,30);
  g.fillStyle=near?'#90f0ff':'#ff9fce';
  g.fillText(near?'CLOSE CALL //':'DRIFT //',W/2,H-42);
  g.restore();
}

function drawWallFeedback(g){
  if(reduced||effects.wallHit<=0||game.state!=='playing')return;
  const a=effects.wallHit/.12;
  g.save();g.globalAlpha=.65*a;g.strokeStyle='#ffc27d';g.lineWidth=2;
  g.beginPath();g.moveTo(12,90);g.lineTo(12,12);g.lineTo(90,12);
  g.moveTo(W-90,H-12);g.lineTo(W-12,H-12);g.lineTo(W-12,H-90);g.stroke();g.restore();
}

// Crop within the existing world buffer: never reveal unpainted borders.
function updateLens(dt,p){
  const target=reduced?1:game.state==='busted'?1.30:1+.10*(1-clamp(p.speed/p.maxSpeed,0,1));
  if(reduced){cam.zoom=1;return;}
  cam.zoom+=(target-cam.zoom)*(1-Math.exp(-(game.state==='busted'?12:4)*dt));
}
function lensView(px,py){
  const z=reduced?1:clamp(cam.zoom,1,1.30);
  const w=W/z,h=H/z;
  const sx=clamp(px-w/2,0,W-w),sy=clamp(py-h/2,0,H-h);
  return {sx,sy,w,h,z,x:(px-sx)*z,y:(py-sy)*z};
}
function paintScene(g,view){
  g.drawImage(scene,view.sx,view.sy,view.w,view.h,0,0,W,H);
}
function drawCrashSequence(g,view){
  if(reduced||game.state!=='busted'||game.bustedTime>=CRASH_DELAY)return;
  const t=clamp(game.bustedTime/CRASH_DELAY,0,1),a=Math.sin(t*Math.PI);
  const bar=24*a;
  g.save();
  g.fillStyle='#060810';g.fillRect(0,0,W,bar);g.fillRect(0,H-bar,W,bar);
  // Ink-like speed wedges converge on the actual projected collision position.
  g.globalAlpha=.45*(1-t);g.fillStyle='#090b13';
  for(let n=0;n<12;n++){
    const angle=n*Math.PI/6+.13,ca=Math.cos(angle),sa=Math.sin(angle);
    const outer=Math.hypot(W,H),inner=95+35*t;
    g.beginPath();g.moveTo(view.x+ca*inner,view.y+sa*inner);
    g.lineTo(view.x+ca*outer-sa*18,view.y+sa*outer+ca*18);
    g.lineTo(view.x+ca*outer+sa*8,view.y+sa*outer-ca*8);g.closePath();g.fill();
  }
  g.globalAlpha=a;g.fillStyle='#ffe0b0';g.font='bold 13px monospace';g.textAlign='center';
  g.fillText('SIGNAL LOST // IMPACT',W/2,H-35);g.restore();
}

function scatterFragments(o,heading,speed){
  const count=reduced?3:9;
  for(let n=0;n<count;n++){
    const a=heading+random(-1.2,1.2),s=Math.min(260,speed*random(.25,.8)),life=random(.4,.9);
    effects.fragments.push({x:o.x,y:o.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,angle:random(0,6.28),spin:random(-12,12),life,max:life,size:random(2,6),color:o.kind==='barrier'?'#eaa34e':'#65bdc9'});
  }
  if(effects.fragments.length>96)effects.fragments.splice(0,effects.fragments.length-96);
}
function tickFragments(dt){
  for(const p of effects.fragments){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);}
  effects.fragments=effects.fragments.filter(p=>p.life>0);
}
function drawFragments(g,ox,oy){
  for(const p of effects.fragments){
    g.save();g.translate(p.x+ox,p.y+oy);g.rotate(p.angle);g.globalAlpha=Math.min(1,p.life/p.max*2);g.fillStyle=p.color;
    g.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);g.restore();
  }
}
function drawSmashFeedback(g){
  if(game.state!=='playing'||effects.smash<=0)return;
  g.save();g.globalAlpha=Math.min(1,effects.smash*3);g.fillStyle='#ffcb8a';
  g.font='bold 13px monospace';g.textAlign='center';g.fillText('STREET CHAOS //',W/2,H-78);g.restore();
}
