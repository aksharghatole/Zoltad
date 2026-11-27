/* =========================================================
   GLITCH RUN — top-down pursuit
   ========================================================= */

const W = 960, H = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

// offscreen buffer — everything is drawn here, then "glitched" onto the main canvas
const scene = document.createElement('canvas');
const sctx = scene.getContext('2d');
scene.width = W; scene.height = H;

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/* ---------- input ---------- */
const keys = {};
addEventListener('blur',()=>{for(const k of Object.keys(keys))keys[k]=false;});
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && game.state === 'busted' && game.bustedTime >= .45) reset();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ---------- camera ---------- */
const cam = { x: 0, y: 0, shake: 0 };

/* =========================================================
   PLAYER CAR
   ========================================================= */
class Car {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.angle = -Math.PI / 2;
    this.vx = 0; this.vy = 0;
    this.radius = 17;

    this.maxSpeed = 430;
    this.accel = 560;
    this.reverseAccel = 280;
    this.brakePower = 950;
    this.turnRate = 3.3;   // rad/s
    this.gripLoss = 0.0022; // how much sideways velocity survives per second (lower = grippier)
    this.drag = 0.45;      // fraction of speed surviving per second
  }

  get speed() { return Math.hypot(this.vx, this.vy); }

  update(dt) {
    const throttle = (keys.KeyW || keys.ArrowUp) ? 1 : 0;
    const braking  = (keys.KeyS || keys.ArrowDown) ? 1 : 0;
    const steer    = ((keys.KeyD || keys.ArrowRight) ? 1 : 0)
                   - ((keys.KeyA || keys.ArrowLeft)  ? 1 : 0);

    const fx = Math.cos(this.angle), fy = Math.sin(this.angle);
    const forwardSpeed = this.vx * fx + this.vy * fy;

    // --- engine / brakes ---
    if (throttle) {
      this.vx += fx * this.accel * dt;
      this.vy += fy * this.accel * dt;
    }
    if (braking) {
      if (forwardSpeed > 15) {
        this.vx -= fx * this.brakePower * dt;
        this.vy -= fy * this.brakePower * dt;
      } else {
        this.vx -= fx * this.reverseAccel * dt;
        this.vy -= fy * this.reverseAccel * dt;
      }
    }

    // --- steering (scales with speed, flips in reverse) ---
    const speedFactor = clamp(this.speed / 170, 0, 1);
    const dir = forwardSpeed < -15 ? -1 : 1;
    this.angle += steer * this.turnRate * speedFactor * dir * dt;

    // --- grip: bleed off sideways velocity, keep forward velocity ---
    const nfx = Math.cos(this.angle), nfy = Math.sin(this.angle);
    const fwd  = this.vx * nfx + this.vy * nfy;
    const side = this.vx * -nfy + this.vy * nfx;
    const keptSide = side * Math.pow(this.gripLoss, dt);
    this.vx = nfx * fwd + (-nfy) * keptSide;
    this.vy = nfy * fwd + ( nfx) * keptSide;

    // --- drag ---
    const d = Math.pow(this.drag, dt);
    this.vx *= d; this.vy *= d;

    // --- clamp top speed ---
    const sp = this.speed;
    if (sp > this.maxSpeed) {
      this.vx = this.vx / sp * this.maxSpeed;
      this.vy = this.vy / sp * this.maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

/* =========================================================
   COP  — dumb, relentless, slightly slower than you
   ========================================================= */
class Cop {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.radius = 17;
    this.maxSpeed = 355;
    this.accel = 430;
    this.turnRate = 2.1;
  }

  update(dt, target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const desired = Math.atan2(dy, dx);
    const diff = angleDiff(desired, this.angle);

    // steer toward the player as hard as it can
    this.angle += clamp(diff, -this.turnRate * dt, this.turnRate * dt);

    // only floor it when roughly pointed the right way
    const alignment = Math.max(0, Math.cos(diff));
    this.speed = Math.min(this.speed + this.accel * alignment * dt, this.maxSpeed);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }
}

/* =========================================================
   GAME STATE
   ========================================================= */
const game = {
  player: null,
  cops: [],
  heat: 0,
  elapsed: 0,
  state: 'playing',
  spawnTimer: 0,
  bustedTime: 0,
};

function reset() {
  game.player = new Car(0, 0);
  game.cops = [];
  game.heat = 0;
  game.elapsed = 0;
  game.state = 'playing';
  game.spawnTimer = 1.5;
  game.bustedTime = 0;
  cam.x = 0; cam.y = 0; cam.shake = 0;
  resetEffects();
  document.getElementById('busted').classList.add('hidden');
  spawnCop();
}

function spawnCop() {
  const p = game.player;
  const a = Math.random() * Math.PI * 2;
  const dist = Math.max(W, H) * 0.8;
  game.cops.push(new Cop(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist));
}

/* =========================================================
   UPDATE
   ========================================================= */
function update(dt) {
  tickEffects(dt);
  if (game.state === 'busted') {
    game.bustedTime += dt;
    if(game.bustedTime>=.45) document.getElementById('busted').classList.remove('hidden');
    return;
  }

  const p = game.player;
  p.update(dt);
  game.elapsed += dt;
  recordTrail(p,dt);

  // heat rises with speed, bleeds off slowly
  game.heat += (p.speed / p.maxSpeed) * 6.5 * dt - 1.4 * dt;
  game.heat = Math.max(0, game.heat);

  // spawn cops up to a cap based on heat
  const targetCops = Math.min(1 + Math.floor(game.heat / 5), 14);
  const interval = Math.max(0.8, 3.4 - game.heat * 0.06);

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = interval;
    if (game.cops.length < targetCops) spawnCop();
  }

  // cops
  for (const c of game.cops) c.update(dt, p);

  // cop-cop separation (stops them stacking into one blob)
  for (let i = 0; i < game.cops.length; i++) {
    for (let j = i + 1; j < game.cops.length; j++) {
      const a = game.cops[i], b = game.cops[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = a.radius + b.radius;
      if (d > 0 && d < minD) {
        const push = (minD - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  // busted?
  for (const c of game.cops) {
    const dx = c.x - p.x, dy = c.y - p.y;
    if (Math.hypot(dx, dy) < c.radius + p.radius) {
      game.state = 'busted';
      game.bustedTime = 0;
      crashEffect(p);
      break;
    } else if(Math.hypot(dx,dy)<65 && p.speed>180 && effects.cooldown===0){
      effects.cooldown=1.1;burst(p.x,p.y,'#71e9ff',12);if(!reduced)cam.shake=4;
    }
  }

  // camera follow
  const follow=1-Math.exp(-8*dt);
  cam.x+=(p.x+p.vx*.14-cam.x)*follow;
  cam.y+=(p.y+p.vy*.14-cam.y)*follow;
}

/* =========================================================
   RENDER  (draws into the offscreen `scene` buffer)
   ========================================================= */
function drawCar(g,x,y,angle,color,police=false){
  g.save();g.translate(x,y);g.rotate(angle);
  g.globalAlpha=.15;g.fillStyle=color;g.beginPath();g.ellipse(0,0,31,22,0,0,Math.PI*2);g.fill();g.globalAlpha=1;
  const beam=g.createLinearGradient(17,0,105,0);beam.addColorStop(0,'rgba(190,240,255,.23)');beam.addColorStop(1,'rgba(190,240,255,0)');
  g.fillStyle=beam;g.beginPath();g.moveTo(16,-9);g.lineTo(105,-28);g.lineTo(105,28);g.lineTo(16,9);g.closePath();g.fill();
  g.fillStyle='#02040a';for(const xx of [-13,10])for(const yy of [-13,9])g.fillRect(xx,yy,8,4);
  g.fillStyle='#080b16';g.strokeStyle=color;g.lineWidth=1.8;
  g.beginPath();g.moveTo(-19,-9);g.lineTo(-14,-12);g.lineTo(11,-12);g.lineTo(20,-7);g.lineTo(20,7);g.lineTo(11,12);g.lineTo(-14,12);g.lineTo(-19,9);g.closePath();g.fill();g.stroke();
  g.fillStyle=color;g.globalAlpha=.55;g.fillRect(-17,-8,8,16);g.fillRect(9,-7,8,14);g.globalAlpha=1;
  g.fillStyle='#173047';g.beginPath();g.moveTo(-6,-8);g.lineTo(6,-7);g.lineTo(9,0);g.lineTo(6,7);g.lineTo(-6,8);g.closePath();g.fill();g.strokeStyle='#80b6d0';g.lineWidth=.8;g.stroke();
  g.fillStyle='#eafcff';g.fillRect(17,-8,3,4);g.fillRect(17,4,3,4);g.fillStyle='#ff426a';g.fillRect(-19,-8,3,5);g.fillRect(-19,3,3,5);
  if(police){const t=reduced?0:Math.floor(game.elapsed*2)%2;g.fillStyle=t?'#367dff':'#ff416d';g.fillRect(-3,-9,5,8);g.fillStyle=t?'#ff416d':'#367dff';g.fillRect(-3,1,5,8);}
  else{g.fillStyle='#ffb4dc';g.fillRect(-1,-1,17,2);}
  g.restore();
}

function render() {
  const p = game.player;

  let sx = 0, sy = 0;
  if (!reduced && cam.shake > 0.4) {
    sx = (Math.random() - 0.5) * cam.shake;
    sy = (Math.random() - 0.5) * cam.shake;

  }

  const ox = W / 2 - cam.x + sx;
  const oy = H / 2 - cam.y + sy;

  drawDistrict(sctx,ox,oy);
  drawEffects(sctx,ox,oy);
  // cops
  for (const c of game.cops) {
    drawCar(sctx, c.x + ox, c.y + oy, c.angle, '#00e5ff', true);
  }

  // player
  drawCar(sctx, p.x + ox, p.y + oy, p.angle, '#ff2d95');

  ctx.clearRect(0,0,W,H);ctx.drawImage(scene,0,0);
  drawImpact(ctx,p,ox,oy);

  /* ---------- HUD ---------- */
  document.getElementById('heatBar').style.width = clamp(game.heat * 2, 0, 100) + '%';
  document.getElementById('speed').textContent = Math.round(p.speed);
  document.getElementById('time').textContent = game.elapsed.toFixed(1);
}

/* =========================================================
   LOOP
   ========================================================= */
const STEP=1/120;
let last=performance.now(), accumulator=0;
function loop(now){
  const dt=Math.max(0,Math.min((now-last)/1000,.10));last=now;accumulator+=dt;
  while(accumulator+1e-10>=STEP){update(STEP);accumulator=Math.max(0,accumulator-STEP);}
  render();requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;for(const k of Object.keys(keys))keys[k]=false;});
reset();
requestAnimationFrame(loop);
