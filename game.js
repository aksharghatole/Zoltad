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
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && game.state === 'busted') reset();
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
  if (game.state === 'busted') {
    game.bustedTime += dt;
    cam.shake = Math.max(cam.shake, 26 - game.bustedTime * 30);
    return;
  }

  const p = game.player;
  p.update(dt);
  game.elapsed += dt;

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
      cam.shake = 30;
      document.getElementById('busted').classList.remove('hidden');
      break;
    }
  }

  // camera follow
  cam.x += (p.x - cam.x) * 0.12;
  cam.y += (p.y - cam.y) * 0.12;
}

/* =========================================================
   RENDER  (draws into the offscreen `scene` buffer)
   ========================================================= */
function drawCar(g, x, y, angle, color) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);

  // cheap glow
  g.globalAlpha = 0.22;
  g.fillStyle = color;
  g.fillRect(-25, -17, 50, 34);
  g.globalAlpha = 1;

  // body
  g.fillStyle = color;
  g.fillRect(-18, -11, 36, 22);

  // cabin
  g.fillStyle = 'rgba(4, 2, 12, 0.75)';
  g.fillRect(-3, -8, 11, 16);

  // nose light
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(15, -8, 3, 4);
  g.fillRect(15, 4, 3, 4);

  g.restore();
}

function render() {
  const p = game.player;

  let sx = 0, sy = 0;
  if (cam.shake > 0.4) {
    sx = (Math.random() - 0.5) * cam.shake;
    sy = (Math.random() - 0.5) * cam.shake;
    cam.shake *= 0.9;
  }

  const ox = W / 2 - cam.x + sx;
  const oy = H / 2 - cam.y + sy;

  // background
  sctx.fillStyle = '#08060f';
  sctx.fillRect(0, 0, W, H);

  // neon grid
  const GS = 220;
  const startX = Math.floor((cam.x - W / 2) / GS) * GS;
  const endX   = cam.x + W / 2 + GS;
  const startY = Math.floor((cam.y - H / 2) / GS) * GS;
  const endY   = cam.y + H / 2 + GS;

  sctx.lineWidth = 2;
  sctx.strokeStyle = 'rgba(130, 0, 220, 0.35)';
  sctx.beginPath();
  for (let gx = startX; gx <= endX; gx += GS) {
    const X = gx + ox;
    sctx.moveTo(X, 0); sctx.lineTo(X, H);
  }
  for (let gy = startY; gy <= endY; gy += GS) {
    const Y = gy + oy;
    sctx.moveTo(0, Y); sctx.lineTo(W, Y);
  }
  sctx.stroke();

  // cops
  for (const c of game.cops) {
    drawCar(sctx, c.x + ox, c.y + oy, c.angle, '#00e5ff');
  }

  // player
  drawCar(sctx, p.x + ox, p.y + oy, p.angle, '#ff2d95');

  /* ---------- post-process: glitch onto the visible canvas ---------- */
  const intensity = clamp(game.heat / 28, 0, 1) + (game.state === 'busted' ? 0.8 : 0);
  const I = clamp(intensity, 0, 1.4);

  ctx.clearRect(0, 0, W, H);

  if (I < 0.06) {
    ctx.drawImage(scene, 0, 0);
  } else {
    // horizontal slice tearing
    const bands = 40;
    for (let i = 0; i < bands; i++) {
      const y0 = Math.floor((i * H) / bands);
      const y1 = Math.floor(((i + 1) * H) / bands);
      const bh = y1 - y0;
      let dx = 0;
      if (Math.random() < 0.13 * I) {
        dx = (Math.random() - 0.5) * 80 * I;
      }
      ctx.drawImage(scene, 0, y0, W, bh, dx, y0, W, bh);
    }

    // RGB bleed: ghost copy offset a few pixels
    const off = 2 + 6 * I;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.16 * I;
    ctx.drawImage(scene, -off, 0);
    ctx.drawImage(scene,  off, 0);
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  document.getElementById('heatBar').style.width = clamp(game.heat * 2, 0, 100) + '%';
  document.getElementById('speed').textContent = Math.round(p.speed);
  document.getElementById('time').textContent = game.elapsed.toFixed(1);
}

/* =========================================================
   LOOP
   ========================================================= */
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);   // don't explode after a tab switch

  update(dt);
  render();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);