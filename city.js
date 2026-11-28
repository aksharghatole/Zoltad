// Deterministic city blocks, with wide roads and occasional open plazas.
const CITY_TILE=240;
function blockAt(ix,iy){
  const code=((ix*19+iy*37)%7+7)%7;
  if(code===0)return null;
  const d=districtAt(ix,iy),w=d.width,h=d.height;
  return {x:ix*CITY_TILE+(CITY_TILE-w)/2,y:iy*CITY_TILE+(CITY_TILE-h)/2,w,h,code};
}
function nearbyBlocks(x,y,radius){
  const blocks=[];
  for(let ix=Math.floor((x-radius)/CITY_TILE)-1;ix<=Math.floor((x+radius)/CITY_TILE);ix++)
    for(let iy=Math.floor((y-radius)/CITY_TILE)-1;iy<=Math.floor((y+radius)/CITY_TILE);iy++){
      const b=blockAt(ix,iy);if(b&&b.x<=x+radius&&b.x+b.w>=x-radius&&b.y<=y+radius&&b.y+b.h>=y-radius)blocks.push(b);
    }
  return blocks;
}
function resolveBlock(car,b){
  const px=Math.max(b.x,Math.min(car.x,b.x+b.w)),py=Math.max(b.y,Math.min(car.y,b.y+b.h));
  let dx=car.x-px,dy=car.y-py,d=Math.hypot(dx,dy);
  if(d>=car.radius)return null;
  let nx,ny,depth;
  if(d>1e-8){nx=dx/d;ny=dy/d;depth=car.radius-d;}
  else{
    const edges=[{d:car.x-b.x,nx:-1,ny:0},{d:b.x+b.w-car.x,nx:1,ny:0},{d:car.y-b.y,nx:0,ny:-1},{d:b.y+b.h-car.y,nx:0,ny:1}];
    edges.sort((a,b)=>a.d-b.d);({nx,ny}=edges[0]);depth=car.radius+edges[0].d;
  }
  car.x+=nx*(depth+.01);car.y+=ny*(depth+.01);
  return {nx,ny,x:px,y:py};
}
function collideCity(car,player){
  for(const b of nearbyBlocks(car.x,car.y,car.radius)){
    const hit=resolveBlock(car,b);if(!hit)continue;
    if(player){
      const vn=car.vx*hit.nx+car.vy*hit.ny;
      if(vn<0){
        car.vx=(car.vx-1.28*vn*hit.nx)*.8;car.vy=(car.vy-1.28*vn*hit.ny)*.8;
        if(-vn>65 && effects.wallCooldown===0){
          effects.wallCooldown=.3;effects.wallHit=.12;
          burst(hit.x,hit.y,'#ffc27d',Math.min(24,Math.ceil(-vn/14)));
          if(!reduced)cam.shake=Math.min(12,-vn*.045);
        }
      }
    }else{
      car.speed*=.5;
      car.routeTimer=0;
      // Turn onto the tangent that most closely follows the target.
      const a=Math.atan2(hit.ny,hit.nx);
      const desired=Math.atan2(game.player.y-car.y,game.player.x-car.x);
      const l=a+Math.PI/2,rr=a-Math.PI/2;
      car.angle=Math.abs(angleDiff(desired,l))<Math.abs(angleDiff(desired,rr))?l:rr;
    }
  }
}
function drawBuildings(g,ox,oy){
  const x0=Math.floor((cam.x-W/2-120)/CITY_TILE),x1=Math.ceil((cam.x+W/2+120)/CITY_TILE);
  const y0=Math.floor((cam.y-H/2-120)/CITY_TILE),y1=Math.ceil((cam.y+H/2+120)/CITY_TILE);
  g.save();
  for(let ix=x0;ix<=x1;ix++)for(let iy=y0;iy<=y1;iy++){
    const b=blockAt(ix,iy);if(!b)continue;
    const x=b.x+ox,y=b.y+oy,accent=districtAt(ix,iy).accent;
    g.fillStyle='rgba(0,0,0,.43)';g.fillRect(x+8,y+10,b.w,b.h);
    g.fillStyle='#080b13';g.fillRect(x,y,b.w,b.h);
    g.strokeStyle=accent;g.lineWidth=1.5;g.strokeRect(x+.75,y+.75,b.w-1.5,b.h-1.5);
    g.fillStyle='#202b3d';g.fillRect(x+5,y+5,b.w-10,b.h-10);
    g.fillStyle='#141c2a';g.fillRect(x+10,y+10,b.w-20,b.h-20);
    g.fillStyle='#30394a';g.fillRect(x+15,y+16,24,19);g.fillRect(x+53,y+46,26,27);
    g.fillStyle='#0d1420';for(let k=0;k<4;k++)g.fillRect(x+18+k*5,y+19,2,13);
    g.fillStyle=accent;g.globalAlpha=.65;g.fillRect(x+5,y+5,34,2);g.fillRect(x+b.w-7,y+56,2,29);g.globalAlpha=1;
    g.strokeStyle='#3c526a';g.lineWidth=1;g.strokeRect(x+53,y+46,26,27);
  }
  g.restore();
}

// Segment vs. inflated rectangle: patrols route around roof edges before hitting them.
function segmentHits(ax,ay,bx,by,block,pad){
  let lo=0,hi=1;
  for(const [start,delta,min,max] of [[ax,bx-ax,block.x-pad,block.x+block.w+pad],[ay,by-ay,block.y-pad,block.y+block.h+pad]]){
    if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
    let a=(min-start)/delta,b=(max-start)/delta;
    if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);
    if(lo>hi)return false;
  }
  return true;
}
function routeBlocks(ax,ay,bx,by,pad){
  const result=[];
  for(let ix=Math.floor((Math.min(ax,bx)-pad)/CITY_TILE)-1;ix<=Math.floor((Math.max(ax,bx)+pad)/CITY_TILE);ix++)
    for(let iy=Math.floor((Math.min(ay,by)-pad)/CITY_TILE)-1;iy<=Math.floor((Math.max(ay,by)+pad)/CITY_TILE);iy++){
      const b=blockAt(ix,iy);if(b)result.push(b);
    }
  return result;
}
function clearRoute(ax,ay,bx,by,pad){
  return !routeBlocks(ax,ay,bx,by,pad).some(b=>segmentHits(ax,ay,bx,by,b,pad));
}
function policeWaypoint(car,target){
  // Local planning is bounded even when the target is very far away.
  const dx=target.x-car.x,dy=target.y-car.y,d=Math.hypot(dx,dy);
  if(d<1)return null;
  const reach=Math.min(500,d),tx=car.x+dx/d*reach,ty=car.y+dy/d*reach;
  const pad=car.radius+4;
  const blocks=routeBlocks(car.x,car.y,tx,ty,pad);
  const blocked=blocks.filter(b=>segmentHits(car.x,car.y,tx,ty,b,pad));
  if(!blocked.length)return null;
  blocked.sort((a,b)=>Math.hypot(a.x+a.w/2-car.x,a.y+a.h/2-car.y)-Math.hypot(b.x+b.w/2-car.x,b.y+b.h/2-car.y));
  const b=blocked[0],margin=pad+12;
  const candidates=[];
  for(const x of [b.x-margin,b.x+b.w+margin])for(const y of [b.y-margin,b.y+b.h+margin]){
    const dist=Math.hypot(x-car.x,y-car.y);
    if(dist<12||!clearRoute(car.x,car.y,x,y,car.radius+1))continue;
    const heading=Math.atan2(y-car.y,x-car.x);
    const cost=dist+Math.hypot(tx-x,ty-y)+Math.abs(angleDiff(heading,car.angle))*16+
      (clearRoute(x,y,tx,ty,pad)?0:75);
    candidates.push({x,y,cost});
  }
  candidates.sort((a,b)=>a.cost-b.cost);
  return candidates[0]||null;
}

// Street furniture uses deterministic positions and a bounded destroyed-object history.
const brokenStreetObjects=new Map();
const BROKEN_LIMIT=768;
function resetStreetObjects(){brokenStreetObjects.clear();}
function streetObjectAt(ix,iy){
  const code=((ix*11+iy*23)%5+5)%5;
  if(code===0)return null;
  return {id:ix+':'+iy,x:ix*CITY_TILE+40,y:iy*CITY_TILE+48,
    kind:code%2?'barrier':'sign',radius:code%2?10:8};
}
function collideStreetObjects(car,player){
  if((player?car.speed:car.speed)<90)return;
  const ix=Math.floor(car.x/CITY_TILE),iy=Math.floor(car.y/CITY_TILE);
  for(let x=ix-1;x<=ix+1;x++)for(let y=iy-1;y<=iy+1;y++){
    const o=streetObjectAt(x,y);
    if(!o||brokenStreetObjects.has(o.id)||Math.hypot(car.x-o.x,car.y-o.y)>=car.radius+o.radius)continue;
    brokenStreetObjects.set(o.id,true);
    if(brokenStreetObjects.size>BROKEN_LIMIT)brokenStreetObjects.delete(brokenStreetObjects.keys().next().value);
    const speed=car.speed,heading=player?Math.atan2(car.vy,car.vx):car.angle;
    if(player){car.vx*=.91;car.vy*=.91;effects.smash=.7;}
    else car.speed*=.91;
    scatterFragments(o,heading,speed);
    burst(o.x,o.y,o.kind==='barrier'?'#ffc065':'#75dded',reduced?4:10);
  }
}
function drawStreetObjects(g,ox,oy){
  g.save();
  for(let ix=Math.floor((cam.x-W/2-100)/CITY_TILE);ix<=Math.ceil((cam.x+W/2+100)/CITY_TILE);ix++)
    for(let iy=Math.floor((cam.y-H/2-100)/CITY_TILE);iy<=Math.ceil((cam.y+H/2+100)/CITY_TILE);iy++){
      const o=streetObjectAt(ix,iy);if(!o)continue;
      const x=o.x+ox,y=o.y+oy;
      if(brokenStreetObjects.has(o.id)){g.fillStyle='#2b2e36';g.fillRect(x-4,y-3,8,6);continue;}
      g.fillStyle='#060910';g.fillRect(x-9,y-6,22,15);
      if(o.kind==='barrier'){
        g.fillStyle='#df9348';g.fillRect(x-10,y-5,20,10);
        g.fillStyle='#33303a';for(let k=0;k<3;k++)g.fillRect(x-8+k*7,y-5,3,10);
      }else{
        g.fillStyle='#334e60';g.fillRect(x-2,y-8,4,16);
        g.fillStyle='#77d5dc';g.fillRect(x-7,y-8,14,9);
        g.fillStyle='#15323f';g.fillRect(x-4,y-6,8,3);
      }
    }
  g.restore();
}
