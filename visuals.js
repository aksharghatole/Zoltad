// Original procedural neon visuals; loaded before game.js.
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxButton=document.getElementById('fx');
function syncFX(){fxButton.textContent=reduced?'FX: LOW':'FX: FULL';fxButton.setAttribute('aria-pressed',String(reduced));}
fxButton.addEventListener('click',()=>{reduced=!reduced;syncFX();});syncFX();
const effects={};
function resetEffects(){Object.assign(effects,{sparks:[],trails:[],rings:[],hit:0,cooldown:0,clock:0});}
const random=(a,b)=>a+Math.random()*(b-a);
function burst(x,y,color,count){
  if(reduced)count=Math.min(count,5);
  for(let n=0;n<count;n++){const a=random(0,Math.PI*2),s=random(45,340),life=random(.18,.65);effects.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color});}
  if(effects.sparks.length>180)effects.sparks.splice(0,effects.sparks.length-180);
  effects.rings.push({x,y,life:.48,color});if(effects.rings.length>8)effects.rings.shift();
}
function crashEffect(p){cam.shake=reduced?0:18;effects.hit=.15;burst(p.x,p.y,'#ffecbb',42);burst(p.x,p.y,'#ff397d',24);}
function tickEffects(dt){
  effects.hit=Math.max(0,effects.hit-dt);effects.cooldown=Math.max(0,effects.cooldown-dt);cam.shake*=Math.exp(-12*dt);
  for(const p of effects.sparks){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt);}
  for(const p of effects.trails)p.life-=dt;for(const r of effects.rings)r.life-=dt;
  effects.sparks=effects.sparks.filter(p=>p.life>0);effects.trails=effects.trails.filter(p=>p.life>0);effects.rings=effects.rings.filter(r=>r.life>0);
}
function recordTrail(p,dt){
  effects.clock+=dt;if(effects.clock<.032||p.speed<90)return;effects.clock=0;
  const side=Math.abs(p.vx*-Math.sin(p.angle)+p.vy*Math.cos(p.angle));
  for(const sign of [-1,1]){const life=side>55?.65:.24;effects.trails.push({x:p.x-Math.cos(p.angle)*13-sign*Math.sin(p.angle)*8,y:p.y-Math.sin(p.angle)*13+sign*Math.cos(p.angle)*8,vx:p.vx,vy:p.vy,life,max:life,width:side>55?3:1.5,color:side>55?'#ff78c9':'#ab316c'});}
  if(effects.trails.length>96)effects.trails.splice(0,effects.trails.length-96);
}
function drawEffects(g,ox,oy){
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
function drawImpact(g,p,ox,oy){
  if(reduced)return;
  if(game.state==='playing'&&p.speed>280){
    const a=(p.speed-280)/150,heading=Math.atan2(p.vy,p.vx);
    g.save();g.strokeStyle='rgba(137,208,255,'+(.16*a)+')';g.lineWidth=1.5;
    for(let k=0;k<14;k++){const theta=k*Math.PI*2/14,r=200+((k*47+game.elapsed*160)%140),x=W/2+Math.cos(theta)*r*1.7,y=H/2+Math.sin(theta)*r;g.beginPath();g.moveTo(x,y);g.lineTo(x-Math.cos(heading)*38*a,y-Math.sin(heading)*38*a);g.stroke();}g.restore();
  }
  if(effects.hit>0){
    g.save();g.globalAlpha=Math.min(.7,effects.hit*5);g.filter='grayscale(1) contrast(1.4)';g.drawImage(scene,0,0);g.restore();
    const x=p.x+ox,y=p.y+oy;g.save();g.globalAlpha=effects.hit/.15;g.strokeStyle='#fff0bf';g.lineWidth=3;
    for(let k=0;k<12;k++){const a=k*Math.PI/6;g.beginPath();g.moveTo(x+Math.cos(a)*24,y+Math.sin(a)*24);g.lineTo(x+Math.cos(a)*73,y+Math.sin(a)*73);g.stroke();}g.restore();
  }
}
