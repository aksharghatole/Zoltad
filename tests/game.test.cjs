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
