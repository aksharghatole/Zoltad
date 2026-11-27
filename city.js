// Deterministic city blocks, with wide roads and occasional open plazas.
const CITY_TILE=240;
function blockAt(ix,iy){
  const code=((ix*19+iy*37)%7+7)%7;
  if(code===0)return null;
  return {x:ix*CITY_TILE+72,y:iy*CITY_TILE+72,w:96,h:96,code};
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
    const x=b.x+ox,y=b.y+oy,accent=b.code%2?'#ce498e':'#42adbf';
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
