const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boot(low=false){
 const gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 const els=new Map(),events={};
 function el(id){if(!els.has(id))els.set(id,{style:{},classList:{hidden:true,add(){this.hidden=true},remove(){this.hidden=false}},getContext:()=>ctx,setAttribute(){},addEventListener(){}});return els.get(id);}
 const box=vm.createContext({document:{getElementById:el,createElement:()=>el('scene'),addEventListener(){}},addEventListener:(k,f)=>events[k]=f,performance:{now:()=>0},requestAnimationFrame(){},matchMedia:()=>({matches:low})});
 for(const file of ['visuals.js','game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),box);
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
