// A deterministic, endless city. Traffic is sampled from continuous world-space lanes,
// so cars keep moving off-screen without maintaining an unbounded entity list.
const DISTRICTS=[
  {name:'NEON CORE',accent:'#e66aa5',width:96,height:96,traffic:430,speed:112,sign:'ARCADE'},
  {name:'IRON YARDS',accent:'#e3a35c',width:126,height:100,traffic:510,speed:95,sign:'CARGO'},
  {name:'NIGHT MARKET',accent:'#58d4bd',width:132,height:132,traffic:290,speed:88,sign:'MARKET'},
  {name:'GLASS HEIGHTS',accent:'#83a8ff',width:100,height:132,traffic:350,speed:138,sign:'METRO'}
];
function districtAt(ix,iy){
  // Retain a familiar, open starting district for learning the controls.
  const sx=Math.floor((ix+2)/5),sy=Math.floor((iy+2)/5);
  const n=((sx+2*sy)%4+4)%4;
  return DISTRICTS[n];
}
function districtOf(x,y){return districtAt(Math.floor(x/CITY_TILE),Math.floor(y/CITY_TILE));}
const living={hit:0,notice:0,message:'',supplies:new Set()};
function resetLiving(){living.hit=0;living.notice=0;living.message='';living.supplies.clear();}
const positiveMod=(n,m)=>((n%m)+m)%m;
function trafficIn(x,y,halfW,halfH,time){
  const cars=[];
  // A fixed spacing per lane keeps trajectories continuous across districts.
  for(const vertical of [false,true]){
    const across=vertical?x:y, along=vertical?y:x;
    const a=vertical?halfW:halfH,b=vertical?halfH:halfW;
    for(let row=Math.ceil((across-a-26)/CITY_TILE);row<=Math.floor((across+a+26)/CITY_TILE);row++){
      for(const dir of [-1,1]){
        const profile= DISTRICTS[positiveMod(row+(vertical?1:0),DISTRICTS.length)];
        const spacing=profile.traffic,speed=profile.speed;
        const shift=positiveMod(row*83+dir*127,spacing)+dir*speed*time;
        const lane=row*CITY_TILE+dir*24;
        for(let n=Math.ceil((along-b-shift)/spacing);n<=Math.floor((along+b-shift)/spacing);n++){
          const pos=n*spacing+shift,kind=positiveMod(n+row*3,5);
          cars.push({id:(vertical?'v':'h')+row+':'+dir+':'+n,x:vertical?lane:pos,y:vertical?pos:lane,
            vx:vertical?0:dir*speed,vy:vertical?dir*speed:0,angle:vertical?dir*Math.PI/2:dir===1?0:Math.PI,
            radius:kind===0?20:14,kind});
        }
      }
    }
  }
  return cars;
}
function trafficContact(p,car){
  let dx=p.x-car.x,dy=p.y-car.y,d=Math.hypot(dx,dy),limit=p.radius+car.radius;
  if(d>=limit)return false;
  if(d<1e-7){dx=-Math.cos(car.angle);dy=-Math.sin(car.angle);d=0;}
  const norm=Math.hypot(dx,dy),nx=dx/norm,ny=dy/norm;
  p.x+=nx*(limit-d+.02);p.y+=ny*(limit-d+.02);
  const vn=(p.vx-car.vx)*nx+(p.vy-car.vy)*ny;
  if(vn<0){
    p.vx-=1.12*vn*nx;p.vy-=1.12*vn*ny;p.vx*=.68;p.vy*=.68;
    // Do not let a collision exceed the player's ordinary or current boost cap.
    const speed=p.speed,max=p.boosting?600:p.coastLimit;
    if(speed>max){p.vx*=max/speed;p.vy*=max/speed;}
    if(living.hit===0&&-vn>35){
      living.hit=.55;living.notice=1.1;living.message='TRAFFIC IMPACT';
      game.heat+=3;burst(car.x,car.y,'#ffd0a2',reduced?4:15);
      if(!reduced)cam.shake=Math.max(cam.shake,Math.min(13,-vn*.035));
    }
  }
  return true;
}
function supplyAt(ix,iy){
  // Only open plazas, never spawn supplies under a solid roof or in the starting tile.
  if((ix===0&&iy===0)||blockAt(ix,iy)||positiveMod(ix*7+iy*13,3)!==0)return null;
  return {id:ix+':'+iy,x:ix*CITY_TILE+120,y:iy*CITY_TILE+120};
}
function updateLiving(p,dt){
  living.hit=Math.max(0,living.hit-dt);living.notice=Math.max(0,living.notice-dt);
  // A short grace period lets new players get moving; traffic is still visible.
  if(game.elapsed>=3){
    for(const car of trafficIn(p.x,p.y,55,55,game.elapsed))trafficContact(p,car);
    // Separation from a moving vehicle may put the player against a building.
    collideCity(p,true);
  }
  const o=supplyAt(Math.floor(p.x/CITY_TILE),Math.floor(p.y/CITY_TILE));
  if(o&&!living.supplies.has(o.id)&&Math.hypot(p.x-o.x,p.y-o.y)<30&&p.nitro<99){
    p.nitro=Math.min(100,p.nitro+35);living.supplies.add(o.id);
    if(living.supplies.size>512)living.supplies.delete(living.supplies.values().next().value);
    living.notice=1.3;living.message='NITRO SUPPLY +35';burst(o.x,o.y,'#83edff',reduced?3:12);
  }
}
function drawCityLife(g,ox,oy){
  g.save();
  for(let ix=Math.floor((cam.x-W/2-100)/CITY_TILE);ix<=Math.ceil((cam.x+W/2+100)/CITY_TILE);ix++){
    for(let iy=Math.floor((cam.y-H/2-100)/CITY_TILE);iy<=Math.ceil((cam.y+H/2+100)/CITY_TILE);iy++){
      const x=ix*CITY_TILE+ox,y=iy*CITY_TILE+oy,d=districtAt(ix,iy);
      // Painted lane stripes and crossings, aligned with the two traffic lanes.
      g.fillStyle='#a3b9c3';g.globalAlpha=.19;
      for(let n=76;n<220;n+=42){g.fillRect(x+n,y-1,19,2);g.fillRect(x-1,y+n,2,19);}
      for(let n=-36;n<=36;n+=12){g.fillRect(x+n,y+44,6,12);g.fillRect(x+44,y+n,12,6);}
      g.globalAlpha=1;
      // Steady street lamps and animated signs, not traffic-control signals.
      g.fillStyle='#101821';g.fillRect(x+43,y-49,8,9);
      g.fillStyle=d.accent;g.fillRect(x+45,y-47,4,4);
      const b=blockAt(ix,iy);
      if(b){
        const bx=b.x+ox,by=b.y+oy;
        g.fillStyle='#111625';g.fillRect(bx+9,by-12,66,10);
        g.globalAlpha=reduced?1:.78+.22*Math.sin(game.elapsed*1.6+ix+iy);
        g.fillStyle=d.accent;g.font='bold 8px monospace';g.textAlign='left';g.fillText(d.sign,bx+13,by-4);g.globalAlpha=1;
        // Window light spills onto pavement; no hidden collision.
        g.fillStyle=d.accent;g.globalAlpha=.13;g.fillRect(bx+8,by-7,65,6);g.globalAlpha=1;
      }
      const o=supplyAt(ix,iy);
      if(o&&!living.supplies.has(o.id)){
        const px=o.x+ox,py=o.y+oy;
        g.strokeStyle='#78dfee';g.lineWidth=1.5;g.beginPath();g.arc(px,py,16,0,Math.PI*2);g.stroke();
        g.fillStyle='#153b48';g.fillRect(px-7,py-10,14,20);g.fillStyle='#a7faff';g.fillRect(px-3,py-7,6,14);
        g.font='9px monospace';g.textAlign='center';g.fillText('N2',px,py+28);
      }
    }
  }
  for(const car of trafficIn(cam.x,cam.y,W/2+70,H/2+70,game.elapsed)){
    const x=car.x+ox,y=car.y+oy;
    g.save();g.translate(x,y);g.rotate(car.angle);
    const len=car.kind===0?23:16,col=['#bca36d','#769aba','#af7d85','#9baba2','#a194c9'][car.kind];
    g.fillStyle='#060910';g.fillRect(-len-2,-10,len*2+4,20);
    g.fillStyle=col;g.fillRect(-len,-8,len*2,16);
    g.fillStyle='#182b3b';g.fillRect(-2,-6,10,12);
    if(car.kind===0){g.fillStyle='#66717f';g.fillRect(-len+2,-6,len-6,12);}
    g.fillStyle='#e9edcd';g.fillRect(len-2,-7,3,4);g.fillRect(len-2,3,3,4);
    g.fillStyle='#e94e60';g.fillRect(-len,-7,3,4);g.fillRect(-len,3,3,4);
    g.restore();
  }
  g.restore();
}
function drawLivingNotice(g){
  if(living.notice<=0||game.state!=='playing')return;
  g.save();g.globalAlpha=Math.min(1,living.notice*3);g.font='bold 13px monospace';
  g.textAlign='left';g.fillStyle=living.hit>0?'#ffbb83':'#90efff';g.fillText(living.message,20,H-23);g.restore();
}
