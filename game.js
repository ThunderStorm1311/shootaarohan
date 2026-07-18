const CONFIG = {
  CANVAS_W: 800,
  CANVAS_H: 600,

  MAX_LEVEL: 50,

  BALL_IMAGES: [
    "./images/aarohan1.jpeg",
    "./images/aaroahan2.jpg",
    "./images/aarohan3.jpg",
    "./images/aarohan4.jpg",
    "./images/aarohan5.jpg",
    "./images/aarohan6.jpg",
    "./images/aarohan7.jpg",
    "./images/aarohan8.jpg",
    "./images/aarohan9.jpg",
    "./images/aaroahan10.jpg",
    "./images/aarohan11.jpg",
    "./images/aarohan12.jpg",
    "./images/aarohan17.jpg",
  ],

  BALL_RADIUS: 32,      
  BASE_BALL_SPEED: 4.2,
  MAX_BALL_SPEED: 8.5,

  PADDLE_WIDTH: 112,
  PADDLE_HEIGHT: 18,
  PADDLE_SPEED_KEY: 9,

  BRICK_COLS: 8,
  BRICK_GAP: 6,
  BRICK_TOP_OFFSET: 70,
  BRICK_HEIGHT: 26,

  BALL_LEVEL_STEP: 4,
  MAX_BALLS_CAP: 10,

  STARTING_LIVES: 3,

  MUSIC_TRACK: './music/Bad Piggy.mp3',
  MUSIC_VOLUME: 0.35,


  SECRET_MESSAGE_BASE64: 'UExBQ0UgUkVQTEFDRSBNRSB3aXRoIHlvdXIgb3duIHNlY3JldCBtZXNzYWdlIQ=='
};

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function decodeSecret(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    return '(secret message could not be decoded)';
  }
}

function bricksForLevel(level) {
  return clamp(3 + Math.floor(level / 6), 3, 10);
}

function brickHpForLevel(level) {
  if (level <= 39) {
    return 1 + Math.floor((level - 1) / 3);   
  }
  const base = 1 + Math.floor(38 / 3);         
  return base + (level - 39) * 3;             
}

function ballDamageForLevel(level) {
  if (level >= 45) return 3;
  if (level >= 25) return 2;
  return 1;
}

function ballCountForLevel(level) {
  const extra = Math.floor((level - 1) / CONFIG.BALL_LEVEL_STEP);
  return clamp(1 + extra, 1, CONFIG.MAX_BALLS_CAP);
}

function ballSpeedForLevel(level) {
  const speed = CONFIG.BASE_BALL_SPEED + level * 0.06;
  return clamp(speed, CONFIG.BASE_BALL_SPEED, CONFIG.MAX_BALL_SPEED);
}

function brickColorForRow(row, level) {
  const hue = (row * 42 + level * 5) % 360;
  return `hsl(${hue}, 78%, 78%)`;
}

class Paddle {
  constructor() {
    this.w = CONFIG.PADDLE_WIDTH;
    this.h = CONFIG.PADDLE_HEIGHT;
    this.x = (CONFIG.CANVAS_W - this.w) / 2;
    this.y = CONFIG.CANVAS_H - 40;
  }
  reset() {
    this.w = CONFIG.PADDLE_WIDTH;
    this.x = (CONFIG.CANVAS_W - this.w) / 2;
  }
  draw(ctx) {
    const r = 10;
    ctx.save();
    ctx.fillStyle = '#FF8FB1';
    ctx.shadowColor = 'rgba(242,103,143,0.5)';
    ctx.shadowBlur = 12;
    roundRect(ctx, this.x, this.y, this.w, this.h, r);
    ctx.fill();
    ctx.restore();
  }
}

class Ball {
  constructor(image) {
    this.r = CONFIG.BALL_RADIUS;
    this.image = image;
    this.stuck = true;       
    this.stuckOffset = 0;
  }
  attachToPaddle(paddle) {
    this.x = paddle.x + paddle.w / 2 + this.stuckOffset;
    this.y = paddle.y - this.r - 2;
  }
  launch(speed, angleDeg) {
    const angle = (angleDeg * Math.PI) / 180;
    this.vx = speed * Math.sin(angle);
    this.vy = -speed * Math.cos(angle);
    this.stuck = false;
  }
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.shadowColor = 'rgba(61,44,78,0.35)';
    ctx.shadowBlur = 8;
    ctx.clip();
    if (this.image && this.image.complete && this.image.naturalWidth > 0) {
      ctx.drawImage(this.image, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    } else {
      ctx.fillStyle = '#FFD666';
      ctx.fillRect(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class Brick {
  constructor(x, y, w, h, hp, color) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.hp = hp; this.maxHp = hp; this.color = color;
    this.alive = true;
    this.hitFlash = 0;
  }
  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 6;
    if (this.hp <= 0) this.alive = false;
  }
  draw(ctx) {
    if (!this.alive) return;
    const t = this.hp / this.maxHp;
    ctx.save();
    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
      this.hitFlash--;
    } else {
      ctx.fillStyle = this.color;
    }
    ctx.globalAlpha = 0.55 + 0.45 * t;
    roundRect(ctx, this.x, this.y, this.w, this.h, 6);
    ctx.fill();
    ctx.restore();

    if (this.maxHp > 1) {
      ctx.save();
      ctx.font = "bold 12px 'Nunito'";
      ctx.fillStyle = 'rgba(61,44,78,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.hp, this.x + this.w / 2, this.y + this.h / 2);
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in this.ctx) this.ctx.imageSmoothingQuality = 'high';

    this.images = CONFIG.BALL_IMAGES.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    this.shotIndex = 0; 

    this.paddle = new Paddle();
    this.balls = [];
    this.bricks = [];

    this.level = 1;
    this.score = 0;
    this.lives = CONFIG.STARTING_LIVES;
    this.soundOn = true;
    this.musicOn = true;
    this.paused = false;
    this.running = false;

    this.music = new Audio(CONFIG.MUSIC_TRACK);
    this.music.loop = true;
    this.music.volume = CONFIG.MUSIC_VOLUME;
    this._musicStarted = false;

    this.mouseX = CONFIG.CANVAS_W / 2;
    this.keys = { left: false, right: false };

    this._bindUI();
    this._bindInput();
    this._audio = new AudioFx();
  }

  nextBallImage() {
    const img = this.images[this.shotIndex % this.images.length];
    this.shotIndex++;
    return img;
  }

  _cycleBallImage(ball) {
    ball.image = this.nextBallImage();
  }

  _bindUI() {
    document.getElementById('btn-start').onclick = () => {
      this._startMusic();
      this.startLevel(1, true);
    };
    document.getElementById('btn-level-continue').onclick = () => this._beginPlay();
    document.getElementById('btn-retry').onclick = () => this.startLevel(this.level, false);
    document.getElementById('btn-play-again').onclick = () => location.reload();
    document.getElementById('btn-resume').onclick = () => this.togglePause(false);
    document.getElementById('hud-sound').onclick = () => {
      this.soundOn = !this.soundOn;
      document.getElementById('hud-sound').textContent = this.soundOn ? '🔊' : '🔇';
    };
    document.getElementById('hud-music').onclick = () => {
      this.musicOn = !this.musicOn;
      document.getElementById('hud-music').textContent = this.musicOn ? '🎵' : '🔕';
      if (this.musicOn && !this.paused) this.music.play().catch(() => {});
      else this.music.pause();
    };
  }
  _startMusic() {
    if (this._musicStarted || !this.musicOn) return;
    this._musicStarted = true;
    this.music.play().catch(() => {});
  }

  _bindInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scale = CONFIG.CANVAS_W / rect.width;
      this.mouseX = (e.clientX - rect.left) * scale;
    });
    window.addEventListener('click', () => this._launchStuckBalls());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'Space') { e.preventDefault(); this._launchStuckBalls(); }
      if (e.code === 'Escape') this.togglePause();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'ArrowRight') this.keys.right = false;
    });
  }

  togglePause(force) {
    if (!this.running) return;
    this.paused = force !== undefined ? force : !this.paused;
    document.getElementById('screen-pause').classList.toggle('hidden', !this.paused);
    if (this.paused) {
      this.music.pause();
    } else if (this.musicOn) {
      this.music.play().catch(() => {});
    }
  }

  showScreen(id) {
    ['screen-start', 'screen-level-intro', 'screen-retry', 'screen-win', 'screen-pause']
      .forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id));
  }

  hideAllScreens() {
    ['screen-start', 'screen-level-intro', 'screen-retry', 'screen-win', 'screen-pause']
      .forEach(s => document.getElementById(s).classList.add('hidden'));
  }

  startLevel(level, isFirstEver) {
    this.level = level;
    this.paddle.reset();
    this.balls = [];
    this._buildBricks(level);

    const count = ballCountForLevel(level);
    for (let i = 0; i < count; i++) {
      const b = new Ball(this.nextBallImage());
      b.stuckOffset = (i - (count - 1) / 2) * (CONFIG.BALL_RADIUS * 1.6);
      b.attachToPaddle(this.paddle);
      this.balls.push(b);
    }

    document.getElementById('level-intro-title').textContent = `Level ${level}`;
    document.getElementById('level-intro-sub').textContent =
      `Bricks HP: ${brickHpForLevel(level)} · Balls: ${count}`;
    this.updateHud();
    this.showScreen('screen-level-intro');
  }

  _beginPlay() {
    this.hideAllScreens();
    this.running = true;
    this.paused = false;
    if (!this._loopStarted) {
      this._loopStarted = true;
      requestAnimationFrame((t) => this._loop(t));
    }
  }

  _buildBricks(level) {
    this.bricks = [];
    const rows = bricksForLevel(level);
    const cols = CONFIG.BRICK_COLS;
    const gap = CONFIG.BRICK_GAP;
    const totalGap = gap * (cols + 1);
    const brickW = (CONFIG.CANVAS_W - totalGap) / cols;
    const brickH = CONFIG.BRICK_HEIGHT;
    const hp = brickHpForLevel(level);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (level > 10 && Math.random() < 0.06) continue;
        const x = gap + c * (brickW + gap);
        const y = CONFIG.BRICK_TOP_OFFSET + r * (brickH + gap);
        const hpVariance = Math.random() < 0.15 ? Math.ceil(hp * 1.4) : hp;
        this.bricks.push(new Brick(x, y, brickW, brickH, hpVariance, brickColorForRow(r, level)));
      }
    }
  }

  _launchStuckBalls() {
    if (!this.running || this.paused) return;
    const stuck = this.balls.filter(b => b.stuck);
    if (stuck.length === 0) return;
    const speed = ballSpeedForLevel(this.level);
    stuck.forEach((b, i) => {
      const spread = 24;
      const angle = (i - (stuck.length - 1) / 2) * (spread / Math.max(stuck.length, 1)) ;
      b.launch(speed, clamp(angle, -35, 35));
    });
  }

  updateHud() {
    document.getElementById('hud-level').textContent = `Level ${this.level} / ${CONFIG.MAX_LEVEL}`;
    document.getElementById('hud-score').textContent = ` ${this.score}`;
    document.getElementById('hud-lives').textContent = ` x${this.lives}`;
  }
  _loop(timestamp) {
    requestAnimationFrame((t) => this._loop(t));
    if (!this.running || this.paused) return;

    this._update();
    this._draw();
  }

  _update() {
    if (this.keys.left) this.paddle.x -= CONFIG.PADDLE_SPEED_KEY;
    if (this.keys.right) this.paddle.x += CONFIG.PADDLE_SPEED_KEY;
    const targetX = this.mouseX - this.paddle.w / 2;
    this.paddle.x += (targetX - this.paddle.x) * 0.35;
    this.paddle.x = clamp(this.paddle.x, 0, CONFIG.CANVAS_W - this.paddle.w);

    const dmg = ballDamageForLevel(this.level);
    let ballsLost = 0;

    for (const ball of this.balls) {
      if (ball.stuck) { ball.attachToPaddle(this.paddle); continue; }

      ball.x += ball.vx;
      ball.y += ball.vy;

     
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; this._cycleBallImage(ball); }
      if (ball.x + ball.r > CONFIG.CANVAS_W) { ball.x = CONFIG.CANVAS_W - ball.r; ball.vx *= -1; this._cycleBallImage(ball); }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; this._cycleBallImage(ball); }

      
      if (ball.vy > 0 &&
          ball.y + ball.r >= this.paddle.y &&
          ball.y + ball.r <= this.paddle.y + this.paddle.h + 10 &&
          ball.x >= this.paddle.x - ball.r &&
          ball.x <= this.paddle.x + this.paddle.w + ball.r) {
        const hitPos = (ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
        const speed = Math.hypot(ball.vx, ball.vy);
        const newAngle = hitPos * 60;
        ball.launch(speed, newAngle);
        ball.y = this.paddle.y - ball.r;
        this._cycleBallImage(ball);
        this._audio.blip(320);
      }

      
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        if (ball.x + ball.r > brick.x && ball.x - ball.r < brick.x + brick.w &&
            ball.y + ball.r > brick.y && ball.y - ball.r < brick.y + brick.h) {
          brick.hit(dmg);
          this.score += brick.alive ? 2 : 15;
          this._audio.blip(brick.alive ? 500 : 700);
          this._cycleBallImage(ball);

          const overlapLeft = (ball.x + ball.r) - brick.x;
          const overlapRight = (brick.x + brick.w) - (ball.x - ball.r);
          const overlapTop = (ball.y + ball.r) - brick.y;
          const overlapBottom = (brick.y + brick.h) - (ball.y - ball.r);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft || minOverlap === overlapRight) ball.vx *= -1;
          else ball.vy *= -1;
          break;
        }
      }

      
      if (ball.y - ball.r > CONFIG.CANVAS_H) {
        ballsLost++;
      }
    }

    if (ballsLost > 0) {
      this.balls = this.balls.filter(b => b.stuck || (b.y - b.r <= CONFIG.CANVAS_H));
    }

    this.updateHud();

   
    if (this.balls.length === 0) {
      this.running = false;
      this.showScreen('screen-retry');
      return;
    }

    
    if (this.bricks.every(b => !b.alive)) {
      this.running = false;
      this.score += 100 * this.level;
      if (this.level >= CONFIG.MAX_LEVEL) {
        this._showWin();
      } else {
        this.startLevel(this.level + 1, false);
      }
    }
  }

  _showWin() {
    const msg = decodeSecret(CONFIG.SECRET_MESSAGE_BASE64);
    document.getElementById('secret-message').textContent = msg;
    this.showScreen('screen-win');
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = 20; x < CONFIG.CANVAS_W; x += 40) {
      for (let y = 20; y < CONFIG.CANVAS_H; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    this.bricks.forEach(b => b.draw(ctx));
    this.paddle.draw(ctx);
    this.balls.forEach(b => b.draw(ctx));
  }
}
class AudioFx {
  constructor() {
    this.ctx = null;
  }
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
  }
  blip(freq) {
    if (!window.game || !window.game.soundOn) return;
    try {
      this._ensure();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }
}
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});