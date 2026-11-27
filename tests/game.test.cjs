const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boot(low=false){
 const gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 const els=new Map(),events={};
 function el(id){if(!els.has(id))els.set(id,{style:{},classList:{hidden:true,add(){this.hidden=true},remove(){this.hidden=false}},getContext:()=>ctx,setAttribute(){},addEventListener(){}});return els.get(id);}
 const box=vm.createContext({document:{getElementById:el,createElement:()=>el('scene'),addEventListener(){}},addEventListener:(k,f)=>events[k]=f,performance:{now:()=>0},requestAnimationFrame(){},matchMedia:()=>({matches:low})});
 for(const file of ['visuals.js','city.js','game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),box);
 return {run:s=>vm.runInContext(s,box),els,events};
}
test('fixed step consistent at 30 and 120 Hz',()=>{
 function drive(hz){const b=boot();b.run("game.cops=[];game.spawnTimer=999;keys.KeyW=true");for(let n=1;n<=hz;n++)b.run("loop("+n*1000/hz+")");return b.run('game.player.y');}
 assert.ok(Math.abs(drive(30)-drive(120))<1e-6);
});
test('collision impact and delayed restart',()=>{
 const b=boot();b.run("game.cops=[new Cop(0,0)];update(STEP);render()");
 assert.equal(b.run('game.state'),'busted');assert.ok(b.run('effects.hit>0 && effects.sparks.length<=180'));assert.equal(b.els.get('busted').classList.hidden,true);
 b.run('for(let n=0;n<60;n++)update(STEP);render()');assert.equal(b.els.get('busted').classList.hidden,false);
 b.events.keydown({code:'KeyR'});assert.equal(b.run('game.state'),'playing');assert.equal(b.run('effects.sparks.length'),0);
});
test('reduced effects and focus loss',()=>{
 const b=boot(true);b.run("keys.KeyW=true;game.cops=[new Cop(0,0)];update(STEP);render()");
 assert.equal(b.run('reduced'),true);assert.ok(b.run('effects.sparks.length<=10'));assert.equal(b.run('cam.shake'),0);
 b.events.blur();assert.equal(b.run('keys.KeyW'),false);
});

test('handbrake permits controlled lateral slip without exceeding speed cap',()=>{
 const b=boot();
 const result=b.run("(()=>{function sample(handbrake){const p=new Car(0,0);p.vy=-300;keys.Space=handbrake;keys.KeyD=true;for(let n=0;n<24;n++)p.update(STEP);return {side:Math.abs(p.vx*-Math.sin(p.angle)+p.vy*Math.cos(p.angle)),speed:p.speed};}return [sample(false),sample(true)];})()");
 assert.ok(result[1].side>result[0].side);assert.ok(result[1].speed<=430);
});
test('rain positions wrap and near-miss feedback expires',()=>{
 const b=boot();
 assert.equal(b.run('wrap(-5,100)'),95);
 b.run('effects.near=.85;tickEffects(1);render()');
 assert.equal(b.run('effects.near'),0);
});

test('city geometry matches roof bounds and resolves player wall collisions',()=>{
 const b=boot();
 const out=b.run("(()=>{const b=blockAt(1,0);const p=new Car(b.x-10,b.y+40);p.vx=300;collideCity(p,true);return {x:p.x,edge:b.x,vx:p.vx,wall:effects.wallHit};})()");
 assert.ok(out.x<=out.edge-17);assert.ok(out.vx<0);assert.ok(out.wall>0);
});
test('car inside building resolves to exterior and patrol spawn stays on streets',()=>{
 const b=boot();
 assert.equal(b.run('blockAt(0,0)'),null);
 assert.ok(b.run("(()=>{const z=blockAt(1,0),p=new Car(z.x+48,z.y+48);collideCity(p,true);return nearbyBlocks(p.x,p.y,p.radius).every(a=>!resolveBlock(p,a));})()"));
 assert.ok(b.run("(()=>{for(let n=0;n<80;n++)spawnCop();return game.cops.every(c=>nearbyBlocks(c.x,c.y,c.radius).length===0);})()"));
});
test('police ricochet aligns with wall tangent',()=>{
 const b=boot();
 assert.ok(b.run("(()=>{const z=blockAt(1,0),c=new Cop(z.x-10,z.y+40);c.speed=300;collideCity(c,false);return c.speed===150&&c.x<z.x-17&&Math.abs(Math.cos(c.angle))<1e-6;})()"));
});

test('lens stays within world buffer and maps player position correctly',()=>{
 const b=boot();
 assert.ok(b.run("(()=>{cam.zoom=1.3;for(const [x,y] of [[0,0],[960,540],[430,240]]){const v=lensView(x,y);if(v.sx<0||v.sy<0||v.sx+v.w>W+1e-8||v.sy+v.h>H+1e-8||Math.abs(v.x/v.z+v.sx-x)>1e-8)return false;}return true;})()"));
 const low=boot(true);assert.equal(low.run('cam.zoom=1.3;lensView(300,200).z'),1);
});
test('crash hit-stop slows debris while keeping restart timer and score real',()=>{
 const b=boot();b.run("game.cops=[new Cop(0,0)];update(STEP)");
 const before=b.run('effects.sparks[0].life');
 const score=b.run('game.elapsed');
 b.run('update(STEP);render()');
 assert.equal(b.run('effects.sparks[0].life'),before);
 assert.equal(b.run('game.elapsed'),score);
 b.run('for(let n=0;n<60;n++)update(STEP);render()');
 assert.equal(b.els.get('busted').classList.hidden,false);
 assert.ok(b.run('cam.zoom>1.2 && cam.zoom<=1.3'));
 b.events.keydown({code:'KeyR'});assert.equal(b.run('cam.zoom'),1);
});

test('blocked police route chooses an accessible corner',()=>{
 const b=boot();
 assert.ok(b.run("(()=>{const c=new Cop(270,120),p={x:450,y:120};c.angle=0;const w=policeWaypoint(c,p);return !clearRoute(c.x,c.y,p.x,p.y,c.radius+4)&&!!w&&clearRoute(c.x,c.y,w.x,w.y,c.radius+1);})()"));
 assert.equal(b.run("policeWaypoint(new Cop(0,0),{x:0,y:-400})"),null);
});
test('street props break once, reduce speed, and reset',()=>{
 const b=boot();
 const res=b.run("(()=>{const o=streetObjectAt(1,0),p=new Car(o.x,o.y);p.vx=250;collideStreetObjects(p,true);const n=effects.fragments.length,s=p.speed;collideStreetObjects(p,true);return {n,s,again:effects.fragments.length,broken:brokenStreetObjects.has(o.id)};})()");
 assert.ok(res.broken&&res.n>0&&res.s<250);assert.equal(res.n,res.again);
 b.run('tickFragments(2)');assert.equal(b.run('effects.fragments.length'),0);
 b.run('reset()');assert.equal(b.run('brokenStreetObjects.size'),0);
});
test('slow cars do not destroy props and debris is bounded',()=>{
 const b=boot();
 assert.ok(b.run("(()=>{const o=streetObjectAt(1,0),p=new Car(o.x,o.y);p.vx=40;collideStreetObjects(p,true);if(brokenStreetObjects.size)return false;for(let n=0;n<100;n++)scatterFragments(o,0,300);return effects.fragments.length<=96;})()"));
});

test('nitro boosts speed, consumes charge and tapers speed on release',()=>{
 const b=boot();
 const out=b.run("(()=>{const p=new Car(0,0);keys.KeyW=true;keys.ShiftLeft=true;for(let n=0;n<180;n++)p.update(STEP);const boosted=p.speed,charge=p.nitro;keys.ShiftLeft=false;p.update(STEP);const released=p.speed;for(let n=0;n<480;n++)p.update(STEP);return {boosted,charge,released,final:p.speed,nitro:p.nitro};})()");
 assert.ok(out.boosted>430&&out.boosted<=600);assert.ok(out.charge<65);assert.ok(out.released>430&&out.released<=600);assert.ok(out.final<=430.001);assert.ok(out.nitro>out.charge);
});
test('empty boost locks until released; reverse and braking do not consume nitro',()=>{
 const b=boot();
 assert.ok(b.run("(()=>{const p=new Car(0,0);p.nitro=.01;keys.KeyW=true;keys.ShiftLeft=true;p.update(STEP);p.update(STEP);if(!p.boostLocked||p.boosting)return false;keys.ShiftLeft=false;p.update(STEP);if(p.boostLocked)return false;keys.ShiftLeft=true;keys.KeyS=true;const n=p.nitro;p.update(STEP);return !p.boosting&&p.nitro>=n;})()"));
});
test('boost trails remain bounded and clear on restart',()=>{
 const b=boot();
 b.run('game.player.boosting=true;for(let n=0;n<100;n++)recordBoost(game.player,.03);render()');
 assert.ok(b.run('effects.boostTrails.length<=48'));
 b.run('reset()');assert.equal(b.run('effects.boostTrails.length'),0);
});
