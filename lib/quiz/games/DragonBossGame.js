/**
 * DragonBossGame — "Save Toothless"
 *
 * Hiccup rides a dragon to fight the Red Death and save Toothless.
 * 2D canvas-based boss fight game.
 *
 * Controls:
 * - Arrow keys / WASD: Move
 * - Space / Click: Shoot plasma blast
 * - Shift: Barrel roll (dodge)
 */
export class DragonBossGame {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.running = false;
    this.won = false;

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Game dimensions
    this.width = 0;
    this.height = 0;

    // Timing
    this.elapsed = 0;
    this.lastTime = 0;

    // Input
    this.keys = {};
    this.mouseDown = false;
    this.mousePos = { x: 0, y: 0 };

    // Game state
    this.state = 'intro'; // intro, playing, victory, defeat
    this.introTimer = 0;
    this.stateTimer = 0;

    // Player
    this.player = {
      x: 0, y: 0,
      vx: 0, vy: 0,
      width: 60, height: 40,
      hp: 100, maxHp: 100,
      speed: 280,
      fireRate: 0.25,
      fireCooldown: 0,
      dodgeCooldown: 0,
      dodgeDuration: 0,
      isDodging: false,
      invincibleTimer: 0,
      score: 0,
    };

    // Boss (Red Death)
    this.boss = {
      x: 0, y: 0,
      width: 300, height: 200,
      hp: 800, maxHp: 800,
      phase: 1,
      attackTimer: 2,
      attackPattern: 0,
      moveTimer: 0,
      targetX: 0,
      isAttacking: false,
      attackAnimTimer: 0,
      roarTimer: 8,
      isRoaring: false,
      stunTimer: 0,
      mouthOpen: 0,
      wingAngle: 0,
      eyeGlow: 0,
      shakeAmount: 0,
    };

    // Projectiles
    this.playerProjectiles = [];
    this.bossProjectiles = [];
    
    // Projectile trails
    this.projectileTrails = [];

    // Minions
    this.minions = [];

    // Particles
    this.particles = [];

    // Screen effects
    this.screenShake = 0;
    this.flashAlpha = 0;
    this.flashColor = '#fff';

    // Toothless (captured)
    this.toothless = {
      x: 0, y: 0,
      struggling: 0,
      freed: false,
      freeTimer: 0,
    };

    // Background
    this.clouds = [];
    this.stars = [];

    this._init();
  }

  _init() {
    this._resize();
    this._setupInput();
    this._initBackground();
    this._initPositions();

    this.running = true;
    this.lastTime = performance.now();
    this._gameLoop = this._gameLoop.bind(this);
    requestAnimationFrame(this._gameLoop);
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._resizeHandler = () => this._resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _setupInput() {
    this._keyDown = (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    };
    this._keyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };
    this._mouseDown = (e) => {
      this.mouseDown = true;
      this.mousePos = { x: e.clientX, y: e.clientY };
    };
    this._mouseUp = () => { this.mouseDown = false; };
    this._mouseMove = (e) => {
      this.mousePos = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener('keydown', this._keyDown);
    document.addEventListener('keyup', this._keyUp);
    document.addEventListener('mousedown', this._mouseDown);
    document.addEventListener('mouseup', this._mouseUp);
    document.addEventListener('mousemove', this._mouseMove);
  }

  _initBackground() {
    for (let i = 0; i < 15; i++) {
      this.clouds.push({
        x: Math.random() * 2000 - 200,
        y: Math.random() * 400,
        width: 100 + Math.random() * 200,
        height: 30 + Math.random() * 60,
        speed: 10 + Math.random() * 30,
        opacity: 0.1 + Math.random() * 0.3,
      });
    }
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 400,
        size: 0.5 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  _initPositions() {
    this.player.x = this.width / 2;
    this.player.y = this.height * 0.75;

    this.boss.x = this.width / 2;
    this.boss.y = this.height * 0.18;
    this.boss.targetX = this.boss.x;

    this.toothless.x = this.width / 2;
    this.toothless.y = this.height * 0.10;
  }

  // ===== GAME LOOP =====

  _gameLoop(now) {
    if (!this.running) return;
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsed += delta;

    this._update(delta);
    this._draw();

    requestAnimationFrame(this._gameLoop);
  }

  _update(delta) {
    this.stateTimer += delta;

    switch (this.state) {
      case 'intro': this._updateIntro(delta); break;
      case 'playing': this._updatePlaying(delta); break;
      case 'victory': this._updateVictory(delta); break;
      case 'defeat': this._updateDefeat(delta); break;
    }

    this._updateBackground(delta);
    this._updateParticles(delta);
    this._updateProjectileTrails(delta);
    this.screenShake *= 0.9;
    this.flashAlpha *= 0.92;
  }

  _updateIntro(delta) {
    this.introTimer += delta;
    if (this.introTimer > 4 || this.keys[' '] || this.keys['enter']) {
      this.state = 'playing';
      this.stateTimer = 0;
    }
  }

  _updatePlaying(delta) {
    this._updatePlayer(delta);
    this._updateBoss(delta);
    this._updateProjectiles(delta);
    this._updateMinions(delta);
    this._checkCollisions();

    if (this.boss.hp <= 0) {
      this.state = 'victory';
      this.stateTimer = 0;
      this.won = true;
      this.screenShake = 20;
      this.flashAlpha = 1;
      this.flashColor = '#ffd700';
      this._spawnVictoryParticles();
    }

    if (this.player.hp <= 0) {
      this.state = 'defeat';
      this.stateTimer = 0;
      this.screenShake = 15;
      this.flashAlpha = 0.8;
      this.flashColor = '#ff0000';
    }
  }

  _updatePlayer(delta) {
    const p = this.player;
    let mx = 0, my = 0;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;
    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }

    const speed = p.isDodging ? p.speed * 2.5 : p.speed;
    p.vx = mx * speed;
    p.vy = my * speed;
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.x = Math.max(p.width / 2, Math.min(this.width - p.width / 2, p.x));
    p.y = Math.max(this.height * 0.35, Math.min(this.height - p.height / 2 - 20, p.y));

    // Dodge (barrel roll)
    if ((this.keys['shift'] || this.keys['q']) && p.dodgeCooldown <= 0 && !p.isDodging) {
      p.isDodging = true;
      p.dodgeDuration = 0.3;
      p.dodgeCooldown = 1.5;
      p.invincibleTimer = 0.35;
    }
    if (p.isDodging) {
      p.dodgeDuration -= delta;
      if (p.dodgeDuration <= 0) p.isDodging = false;
    }
    if (p.dodgeCooldown > 0) p.dodgeCooldown -= delta;
    if (p.invincibleTimer > 0) p.invincibleTimer -= delta;

    // Shooting
    p.fireCooldown -= delta;
    if ((this.keys[' '] || this.mouseDown) && p.fireCooldown <= 0) {
      p.fireCooldown = p.fireRate;
      this._playerShoot();
    }
  }

  _playerShoot() {
    const p = this.player;
    this.playerProjectiles.push({
      x: p.x, y: p.y - p.height / 2 - 5,
      vx: 0, vy: -600,
      width: 12, height: 16,
      damage: 15,
      type: 'plasma',
      life: 3,
      trailTimer: 0,
    });
    // Enhanced muzzle flash particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 120;
      this.particles.push({
        x: p.x + (Math.random() - 0.5) * 10,
        y: p.y - p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2 + Math.random() * 5,
        color: Math.random() > 0.3 ? '#8844ff' : '#cc88ff',
        alpha: 0.8,
      });
    }
  }

  _updateBoss(delta) {
    const b = this.boss;
    if (b.stunTimer > 0) { b.stunTimer -= delta; return; }

    const hpPercent = b.hp / b.maxHp;
    if (hpPercent <= 0.33) b.phase = 3;
    else if (hpPercent <= 0.66) b.phase = 2;
    else b.phase = 1;

    // Animation
    b.wingAngle = Math.sin(this.elapsed * 3) * 0.2;
    b.mouthOpen = b.isAttacking ? Math.min(b.mouthOpen + delta * 5, 1) : Math.max(b.mouthOpen - delta * 3, 0);
    b.eyeGlow = 0.5 + Math.sin(this.elapsed * 4) * 0.3;

    // Movement
    b.moveTimer -= delta;
    if (b.moveTimer <= 0) {
      b.targetX = this.width * 0.2 + Math.random() * this.width * 0.6;
      b.moveTimer = 2 + Math.random() * 2;
    }
    const moveSpeed = 100 + b.phase * 40;
    const dx = b.targetX - b.x;
    if (Math.abs(dx) > 5) b.x += Math.sign(dx) * moveSpeed * delta;

    // Attack patterns
    b.attackTimer -= delta;
    if (b.attackTimer <= 0) {
      this._bossAttack();
      const cooldown = b.phase === 3 ? 1 : b.phase === 2 ? 1.5 : 2;
      b.attackTimer = cooldown + Math.random() * cooldown;
    }

    // Phase 2+: summon minions
    if (b.phase >= 2) {
      b.roarTimer -= delta;
      if (b.roarTimer <= 0 && this.minions.length < 4) {
        this._spawnMinion();
        b.roarTimer = 5 + Math.random() * 3;
      }
    }
    b.shakeAmount *= 0.95;
  }

  _bossAttack() {
    const b = this.boss;
    b.isAttacking = true;
    setTimeout(() => { b.isAttacking = false; }, 800);

    const patterns = b.phase === 1 ? [0, 1, 2] : b.phase === 2 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    switch (pattern) {
      case 0: this._bossFireBreath(); break;
      case 1: this._bossMeteorShower(); break;
      case 2: this._bossTailSweep(); break;
      case 3: this._bossRoar(); break;
      case 4: this._bossHomingAttack(); break;
      case 5: this._bossFireRing(); break;
    }
  }

  _bossFireBreath() {
    const b = this.boss;
    const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 0.15;
      const speed = 350 + i * 30;
      setTimeout(() => {
        if (!this.running) return;
        this.bossProjectiles.push({
          x: b.x, y: b.y + b.height / 2,
          vx: Math.cos(angle + spread) * speed,
          vy: Math.sin(angle + spread) * speed,
          width: 16, height: 16,
          damage: 12, type: 'fireball', life: 4,
        });
      }, i * 100);
    }
  }

  _bossMeteorShower() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (!this.running) return;
        this.bossProjectiles.push({
          x: Math.random() * this.width, y: -20,
          vx: (Math.random() - 0.5) * 60,
          vy: 250 + Math.random() * 150,
          width: 14, height: 14,
          damage: 10, type: 'meteor', life: 5,
        });
      }, i * 150);
    }
  }

  _bossTailSweep() {
    const fromLeft = Math.random() > 0.5;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.running) return;
        this.bossProjectiles.push({
          x: fromLeft ? -20 : this.width + 20,
          y: this.boss.y + this.boss.height + 50 + i * 40,
          vx: fromLeft ? 400 : -400, vy: 30,
          width: 20, height: 12,
          damage: 15, type: 'sweep', life: 4,
        });
      }, i * 80);
    }
  }

  _bossRoar() {
    this.screenShake = 12;
    this.boss.isRoaring = true;
    this.boss.shakeAmount = 10;
    const savedSpeed = this.player.speed;
    this.player.speed = 140;
    setTimeout(() => {
      this.player.speed = savedSpeed;
      this.boss.isRoaring = false;
    }, 1500);
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      this.particles.push({
        x: this.boss.x, y: this.boss.y + this.boss.height / 2,
        vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
        life: 1, maxLife: 1,
        size: 6 + Math.random() * 4,
        color: '#ff6600',
      });
    }
  }

  _bossHomingAttack() {
    this.bossProjectiles.push({
      x: this.boss.x, y: this.boss.y + this.boss.height / 2,
      vx: 0, vy: 100,
      width: 20, height: 20,
      damage: 18, type: 'homing', life: 5,
      homingStrength: 200, speed: 220,
    });
  }

  _bossFireRing() {
    const count = 12 + this.boss.phase * 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.bossProjectiles.push({
        x: this.boss.x, y: this.boss.y + this.boss.height / 2,
        vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
        width: 10, height: 10,
        damage: 8, type: 'ring', life: 4,
      });
    }
    this.screenShake = 5;
  }

  _spawnMinion() {
    const side = Math.random() > 0.5;
    this.minions.push({
      x: side ? -30 : this.width + 30,
      y: this.height * 0.3 + Math.random() * this.height * 0.3,
      vx: side ? 80 : -80, vy: 20 + Math.random() * 40,
      width: 40, height: 30,
      hp: 30, maxHp: 30,
      fireCooldown: 2 + Math.random(),
      wingAngle: 0,
    });
  }

  _updateProjectiles(delta) {
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const p = this.playerProjectiles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      
      // Create plasma trail
      p.trailTimer += delta;
      if (p.trailTimer > 0.02) {
        p.trailTimer = 0;
        this.projectileTrails.push({
          x: p.x,
          y: p.y,
          size: 8,
          life: 0.3,
          maxLife: 0.3,
          color: '#8844ff',
        });
      }
      
      if (p.life <= 0 || p.y < -20 || p.y > this.height + 20 || p.x < -20 || p.x > this.width + 20) {
        this.playerProjectiles.splice(i, 1);
      }
    }
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i];
      if (p.type === 'homing') {
        const ddx = this.player.x - p.x;
        const ddy = this.player.y - p.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist > 0) {
          p.vx += (ddx / dist) * p.homingStrength * delta;
          p.vy += (ddy / dist) * p.homingStrength * delta;
          const spd = Math.hypot(p.vx, p.vy);
          if (spd > p.speed) { p.vx = (p.vx / spd) * p.speed; p.vy = (p.vy / spd) * p.speed; }
        }
      }
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      
      // Enhanced projectile particles with varied effects
      if (Math.random() > 0.3) {
        const particleColor = p.type === 'homing' ? '#ff00ff' : 
                             p.type === 'meteor' ? '#ff6600' :
                             p.type === 'ring' ? '#ff8800' : '#ff4400';
        this.particles.push({
          x: p.x + (Math.random() - 0.5) * 8,
          y: p.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 40 - p.vx * 0.1,
          vy: (Math.random() - 0.5) * 40 - p.vy * 0.1,
          life: 0.4 + Math.random() * 0.4,
          maxLife: 0.8,
          size: 2 + Math.random() * 5,
          color: particleColor,
          alpha: 0.6,
        });
      }
      
      if (p.life <= 0 || p.y > this.height + 40 || p.y < -40 || p.x < -40 || p.x > this.width + 40) {
        this.bossProjectiles.splice(i, 1);
      }
    }
  }

  _updateMinions(delta) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.x += m.vx * delta;
      m.y += m.vy * delta;
      m.wingAngle = Math.sin(this.elapsed * 6 + i) * 0.3;
      if (m.x < 30 || m.x > this.width - 30) m.vx *= -1;
      if (m.y < this.height * 0.25 || m.y > this.height * 0.6) m.vy *= -1;

      m.fireCooldown -= delta;
      if (m.fireCooldown <= 0) {
        m.fireCooldown = 2 + Math.random();
        const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
        this.bossProjectiles.push({
          x: m.x, y: m.y + 10,
          vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200,
          width: 10, height: 10,
          damage: 6, type: 'minion_fire', life: 4,
        });
      }
      if (m.hp <= 0) {
        this._spawnExplosion(m.x, m.y, '#ff6600', 15);
        this.minions.splice(i, 1);
        this.player.score += 50;
      }
    }
  }

  _checkCollisions() {
    // Player projectiles vs boss
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const proj = this.playerProjectiles[i];
      if (this._rectsOverlap(proj, this.boss)) {
        this.boss.hp -= proj.damage;
        this.boss.shakeAmount = 3;
        this._spawnExplosion(proj.x, proj.y, '#8844ff', 8);
        this.playerProjectiles.splice(i, 1);
        this.player.score += 10;
        continue;
      }
      for (let j = this.minions.length - 1; j >= 0; j--) {
        if (this._rectsOverlap(proj, this.minions[j])) {
          this.minions[j].hp -= proj.damage;
          this._spawnExplosion(proj.x, proj.y, '#ff8800', 6);
          this.playerProjectiles.splice(i, 1);
          break;
        }
      }
    }
    // Boss projectiles vs player
    if (this.player.invincibleTimer <= 0) {
      for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
        const proj = this.bossProjectiles[i];
        if (this._rectsOverlap(proj, this.player)) {
          this.player.hp -= proj.damage;
          this.player.invincibleTimer = 0.5;
          this._spawnExplosion(proj.x, proj.y, '#ff0000', 10);
          this.bossProjectiles.splice(i, 1);
          this.screenShake = Math.max(this.screenShake, 5);
          this.flashAlpha = 0.3;
          this.flashColor = '#ff0000';
        }
      }
    }
  }

  _rectsOverlap(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  _spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.6, maxLife: 1.0,
        size: 3 + Math.random() * 7, color,
        alpha: 0.9,
      });
    }
    // Add bright flash particles
    for (let i = 0; i < count / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.3, maxLife: 0.5,
        size: 5 + Math.random() * 10, 
        color: '#ffffff',
        alpha: 1.0,
      });
    }
  }

  _spawnVictoryParticles() {
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 400;
      const colors = ['#ffd700', '#ff6600', '#8844ff', '#00ff88', '#ff44aa', '#ffaa00', '#88ffff'];
      this.particles.push({
        x: this.boss.x + (Math.random() - 0.5) * 150,
        y: this.boss.y + (Math.random() - 0.5) * 150,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.5 + Math.random() * 2.5, maxLife: 4,
        size: 4 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
      });
    }
    // Add sparkles
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      this.particles.push({
        x: this.boss.x,
        y: this.boss.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 1.2, maxLife: 2,
        size: 2 + Math.random() * 4,
        color: '#ffffff',
        alpha: 1.0,
      });
    }
  }

  _updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 50 * delta;
      p.vx *= 0.98; // Air resistance
      p.life -= delta;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  
  _updateProjectileTrails(delta) {
    for (let i = this.projectileTrails.length - 1; i >= 0; i--) {
      const t = this.projectileTrails[i];
      t.life -= delta;
      t.size *= 0.95;
      if (t.life <= 0 || t.size < 1) {
        this.projectileTrails.splice(i, 1);
      }
    }
  }

  _updateBackground(delta) {
    for (const c of this.clouds) {
      c.x += c.speed * delta;
      if (c.x > this.width + c.width) {
        c.x = -c.width;
        c.y = Math.random() * this.height * 0.5;
      }
    }
  }

  _updateVictory(delta) {
    this.toothless.freed = true;
    this.toothless.freeTimer += delta;
    if (this.stateTimer > 6 || (this.stateTimer > 3 && (this.keys[' '] || this.keys['enter']))) {
      this._endGame(true);
    }
  }

  _updateDefeat(delta) {
    if (this.stateTimer > 4 || (this.stateTimer > 2 && (this.keys[' '] || this.keys['enter']))) {
      this._endGame(false);
    }
  }

  // ===== DRAWING =====

  _draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.save();

    if (this.screenShake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
    }

    this._drawBackground(ctx, w, h);

    switch (this.state) {
      case 'intro': this._drawIntro(ctx, w, h); break;
      case 'playing':
      case 'victory':
      case 'defeat':
        this._drawGame(ctx, w, h); break;
    }

    if (this.flashAlpha > 0.01) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _drawBackground(ctx, w, h) {
    // Enhanced sky gradient with more depth
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0a0020');
    skyGrad.addColorStop(0.2, '#1a0a40');
    skyGrad.addColorStop(0.4, '#2a1535');
    skyGrad.addColorStop(0.6, '#3a1825');
    skyGrad.addColorStop(0.8, '#4a2015');
    skyGrad.addColorStop(1, '#2a0a00');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Add atmospheric glow
    const atmosphereGrad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.8);
    atmosphereGrad.addColorStop(0, 'rgba(80,20,40,0.15)');
    atmosphereGrad.addColorStop(0.5, 'rgba(60,15,30,0.08)');
    atmosphereGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = atmosphereGrad;
    ctx.fillRect(0, 0, w, h);

    // Enhanced stars with twinkle and glow
    this.stars.forEach(s => {
      const twinkle = 0.3 + Math.sin(this.elapsed * 2 + s.twinkle) * 0.5;
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#aaccff';
      ctx.shadowBlur = s.size * 2;
      ctx.beginPath();
      ctx.arc(s.x % w, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // Enhanced clouds with gradients
    this.clouds.forEach(c => {
      ctx.save();
      ctx.globalAlpha = c.opacity;
      const cloudGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.width / 2);
      cloudGrad.addColorStop(0, '#3a2035');
      cloudGrad.addColorStop(0.6, '#2a1525');
      cloudGrad.addColorStop(1, 'rgba(42,21,37,0)');
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Volcanic island with enhanced shadows
    ctx.fillStyle = '#0a0505';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.88);
    ctx.quadraticCurveTo(w * 0.15, h * 0.82, w * 0.3, h * 0.85);
    ctx.quadraticCurveTo(w * 0.4, h * 0.78, w * 0.5, h * 0.82);
    ctx.quadraticCurveTo(w * 0.6, h * 0.76, w * 0.7, h * 0.84);
    ctx.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.87);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Enhanced lava glow with animation
    const lavaGlow = 0.8 + Math.sin(this.elapsed * 2) * 0.2;
    const lavaGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
    lavaGrad.addColorStop(0, 'rgba(255,60,0,0)');
    lavaGrad.addColorStop(0.4, `rgba(255,80,20,${0.1 * lavaGlow})`);
    lavaGrad.addColorStop(0.7, `rgba(255,60,10,${0.2 * lavaGlow})`);
    lavaGrad.addColorStop(1, `rgba(255,40,0,${0.3 * lavaGlow})`);
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, h * 0.85, w, h * 0.15);
    
    // Add lava spots
    ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 3) * 0.2;
    for (let i = 0; i < 5; i++) {
      const lx = (w / 6) * (i + 0.5) + Math.sin(this.elapsed + i) * 20;
      const ly = h * 0.92 + Math.sin(this.elapsed * 2 + i) * 5;
      const lavaSpot = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30);
      lavaSpot.addColorStop(0, 'rgba(255,100,0,0.6)');
      lavaSpot.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = lavaSpot;
      ctx.beginPath();
      ctx.arc(lx, ly, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawIntro(ctx, w, h) {
    this._drawBossShape(ctx, this.boss.x, this.boss.y, 0.5);
    this._drawToothless(ctx);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const alpha = Math.min(this.introTimer / 1.5, 1);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20;
    ctx.fillText('SAVE TOOTHLESS', w / 2, h * 0.4);

    if (this.introTimer > 1) {
      ctx.globalAlpha = Math.min((this.introTimer - 1) / 1, 1);
      ctx.font = '24px Georgia, serif';
      ctx.fillStyle = '#ffcc88';
      ctx.shadowBlur = 10;
      ctx.fillText('The Red Death has captured your dragon!', w / 2, h * 0.48);
    }
    if (this.introTimer > 2) {
      ctx.globalAlpha = Math.min((this.introTimer - 2) / 1, 1);
      ctx.font = '20px Georgia, serif';
      ctx.fillStyle = '#aaaacc';
      ctx.shadowBlur = 5;
      ctx.fillText('Arrow Keys: Move  |  Space: Shoot  |  Shift: Dodge', w / 2, h * 0.55);
    }
    if (this.introTimer > 2.5 && Math.sin(this.elapsed * 4) > 0) {
      ctx.globalAlpha = 0.8;
      ctx.font = '22px Georgia, serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('Press SPACE to begin', w / 2, h * 0.63);
    }
    ctx.restore();
  }

  _drawGame(ctx, w, h) {
    this._drawToothless(ctx);
    if (this.state !== 'victory' || this.stateTimer < 1) this._drawBoss(ctx);
    this._drawMinions(ctx);
    this._drawProjectileTrails(ctx);
    this._drawProjectiles(ctx);
    this._drawPlayer(ctx);
    this._drawParticles(ctx);
    this._drawHUD(ctx, w, h);
    if (this.state === 'victory') this._drawVictory(ctx, w, h);
    else if (this.state === 'defeat') this._drawDefeat(ctx, w, h);
  }

  _drawBoss(ctx) {
    const b = this.boss;
    ctx.save();
    const shakeX = b.shakeAmount > 0 ? (Math.random() - 0.5) * b.shakeAmount : 0;
    const shakeY = b.shakeAmount > 0 ? (Math.random() - 0.5) * b.shakeAmount : 0;
    ctx.translate(b.x + shakeX, b.y + shakeY);

    let bodyColor, accentColor;
    if (b.phase === 3) { bodyColor = '#4a0808'; accentColor = '#ff2200'; }
    else if (b.phase === 2) { bodyColor = '#3a1010'; accentColor = '#ff4400'; }
    else { bodyColor = '#2a1515'; accentColor = '#ff6600'; }

    this._drawBossShape(ctx, 0, 0, 1, bodyColor, accentColor);
    ctx.restore();
  }

  _drawBossShape(ctx, cx, cy, scale, bodyColor = '#2a1515', accentColor = '#ff6600') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const b = this.boss;
    const wingSpread = 160 + Math.sin(this.elapsed * 2) * 20;

    // Left wing with gradient
    const leftWingGrad = ctx.createLinearGradient(-wingSpread, -40, -20, 30);
    leftWingGrad.addColorStop(0, bodyColor);
    leftWingGrad.addColorStop(0.5, bodyColor);
    leftWingGrad.addColorStop(1, '#1a0a0a');
    ctx.fillStyle = leftWingGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.quadraticCurveTo(-wingSpread, -80 + b.wingAngle * 40, -wingSpread * 0.8, 20);
    ctx.quadraticCurveTo(-wingSpread * 0.5, 40, -20, 30);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Wing membrane detail
    const wingMembraneGrad = ctx.createRadialGradient(-wingSpread * 0.5, -20, 0, -wingSpread * 0.5, -20, wingSpread * 0.4);
    wingMembraneGrad.addColorStop(0, 'rgba(120,40,30,0.4)');
    wingMembraneGrad.addColorStop(1, 'rgba(60,20,15,0)');
    ctx.fillStyle = wingMembraneGrad;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.quadraticCurveTo(-wingSpread * 0.6, -40, -wingSpread * 0.6, 10);
    ctx.quadraticCurveTo(-wingSpread * 0.3, 30, -20, 20);
    ctx.closePath();
    ctx.fill();

    // Right wing with gradient
    const rightWingGrad = ctx.createLinearGradient(wingSpread, -40, 20, 30);
    rightWingGrad.addColorStop(0, bodyColor);
    rightWingGrad.addColorStop(0.5, bodyColor);
    rightWingGrad.addColorStop(1, '#1a0a0a');
    ctx.fillStyle = rightWingGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(30, -20);
    ctx.quadraticCurveTo(wingSpread, -80 + b.wingAngle * 40, wingSpread * 0.8, 20);
    ctx.quadraticCurveTo(wingSpread * 0.5, 40, 20, 30);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Right wing membrane detail
    const rightMembraneGrad = ctx.createRadialGradient(wingSpread * 0.5, -20, 0, wingSpread * 0.5, -20, wingSpread * 0.4);
    rightMembraneGrad.addColorStop(0, 'rgba(120,40,30,0.4)');
    rightMembraneGrad.addColorStop(1, 'rgba(60,20,15,0)');
    ctx.fillStyle = rightMembraneGrad;
    ctx.beginPath();
    ctx.moveTo(30, -10);
    ctx.quadraticCurveTo(wingSpread * 0.6, -40, wingSpread * 0.6, 10);
    ctx.quadraticCurveTo(wingSpread * 0.3, 30, 20, 20);
    ctx.closePath();
    ctx.fill();

    // Body with gradient for depth
    const bodyGrad = ctx.createRadialGradient(0, 20, 0, 0, 20, 70);
    bodyGrad.addColorStop(0, bodyColor);
    bodyGrad.addColorStop(0.7, bodyColor);
    bodyGrad.addColorStop(1, '#0a0505');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(0, 20, 50, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Belly highlight
    const bellyGrad = ctx.createRadialGradient(0, 35, 0, 0, 35, 45);
    bellyGrad.addColorStop(0, 'rgba(100,50,40,0.6)');
    bellyGrad.addColorStop(1, 'rgba(80,40,30,0.3)');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 35, 30, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck + Head with gradient
    const neckGrad = ctx.createLinearGradient(0, -30, 0, -70);
    neckGrad.addColorStop(0, bodyColor);
    neckGrad.addColorStop(1, bodyColor);
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(-20, -30);
    ctx.quadraticCurveTo(-15, -60, 0, -70);
    ctx.quadraticCurveTo(15, -60, 20, -30);
    ctx.closePath();
    ctx.fill();
    
    const headGrad = ctx.createRadialGradient(0, -75, 0, 0, -75, 30);
    headGrad.addColorStop(0, bodyColor);
    headGrad.addColorStop(0.8, bodyColor);
    headGrad.addColorStop(1, '#1a0a0a');
    ctx.fillStyle = headGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, -75, 30, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Horns with gradient
    const hornGrad = ctx.createLinearGradient(-25, -120, -15, -90);
    hornGrad.addColorStop(0, '#0a0404');
    hornGrad.addColorStop(1, '#1a0808');
    ctx.fillStyle = hornGrad;
    ctx.beginPath(); ctx.moveTo(-15, -95); ctx.lineTo(-25, -120); ctx.lineTo(-10, -90); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -95); ctx.lineTo(25, -120); ctx.lineTo(10, -90); ctx.closePath(); ctx.fill();

    // Eyes with enhanced glow
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 15 * b.eyeGlow;
    ctx.beginPath(); ctx.ellipse(-12, -78, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, -78, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    
    // Inner eye glow
    ctx.globalAlpha = b.eyeGlow;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20 * b.eyeGlow;
    ctx.beginPath(); ctx.ellipse(-12, -78, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, -78, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-12, -78, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, -78, 2, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Mouth (fire) with enhanced effects
    const mouthOpen = b.mouthOpen || 0;
    if (mouthOpen > 0) {
      const fireGrad = ctx.createRadialGradient(0, -58 + mouthOpen * 8, 0, 0, -58 + mouthOpen * 8, 15 + mouthOpen * 10);
      fireGrad.addColorStop(0, '#ffffff');
      fireGrad.addColorStop(0.3, '#ffff00');
      fireGrad.addColorStop(0.6, '#ff4400');
      fireGrad.addColorStop(1, '#ff0000');
      ctx.fillStyle = fireGrad;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 25 * mouthOpen;
      ctx.beginPath(); ctx.ellipse(0, -58 + mouthOpen * 8, 15, 5 + mouthOpen * 8, 0, 0, Math.PI * 2); ctx.fill();
      
      ctx.globalAlpha = 0.6;
      const outerFireGrad = ctx.createRadialGradient(0, -45 + mouthOpen * 15, 0, 0, -45 + mouthOpen * 15, 15 + mouthOpen * 15);
      outerFireGrad.addColorStop(0, 'rgba(255,200,0,0.8)');
      outerFireGrad.addColorStop(0.5, 'rgba(255,100,0,0.4)');
      outerFireGrad.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = outerFireGrad;
      ctx.beginPath(); ctx.ellipse(0, -45 + mouthOpen * 15, 10 + mouthOpen * 5, 3 + mouthOpen * 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    
    // Teeth
    ctx.fillStyle = '#ddd';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 3;
    for (let i = -2; i <= 2; i++) ctx.fillRect(-12 + i * 6, -63, 3, 5 + mouthOpen * 3);
    ctx.shadowBlur = 0;

    // Tail with gradient
    const tailGrad = ctx.createLinearGradient(0, 85, 60 + Math.sin(this.elapsed * 2.5) * 30, 100);
    tailGrad.addColorStop(0, bodyColor);
    tailGrad.addColorStop(1, '#1a0808');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 85);
    ctx.quadraticCurveTo(40 + Math.sin(this.elapsed * 2) * 20, 110, 60 + Math.sin(this.elapsed * 2.5) * 30, 100);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Spines
    ctx.fillStyle = '#1a0808';
    for (let i = 0; i < 5; i++) {
      const sy = -85 + i * 12;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(-4, sy + 8); ctx.lineTo(4, sy + 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  _drawToothless(ctx) {
    const t = this.toothless;
    const freed = this.state === 'victory' && this.stateTimer > 0.5;
    ctx.save();

    if (freed) {
      const angle = this.stateTimer * 2;
      const radius = 50 + this.stateTimer * 20;
      t.x = this.width / 2 + Math.cos(angle) * radius;
      t.y = this.height * 0.3 + Math.sin(angle * 0.5) * 30 - this.stateTimer * 15;
    }
    ctx.translate(t.x, t.y);
    ctx.translate(freed ? 0 : Math.sin(this.elapsed * 5) * 3, 0);

    const scale = freed ? 1.2 : 0.8;
    ctx.scale(scale, scale);
    const wingFlap = freed ? Math.sin(this.elapsed * 8) * 0.4 : Math.sin(this.elapsed * 3) * 0.1;

    // Wings
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.quadraticCurveTo(-35, -25 + wingFlap * 20, -30, 5); ctx.quadraticCurveTo(-20, 10, -8, 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -5); ctx.quadraticCurveTo(35, -25 + wingFlap * 20, 30, 5); ctx.quadraticCurveTo(20, 10, 8, 5); ctx.closePath(); ctx.fill();

    // Body
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(0, -20, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Ear fins
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(-12, -35); ctx.lineTo(-4, -24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -26); ctx.lineTo(12, -35); ctx.lineTo(4, -24); ctx.closePath(); ctx.fill();

    // Green eyes
    ctx.fillStyle = freed ? '#44ff44' : '#228822';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = freed ? 8 : 3;
    ctx.beginPath(); ctx.ellipse(-4, -21, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -21, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-4, -21, 1.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -21, 1.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();

    // Chains if not freed
    if (!freed) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-25, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(25, 15); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tail + fin
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 15); ctx.quadraticCurveTo(10 + Math.sin(this.elapsed * 3) * 5, 25, 15 + Math.sin(this.elapsed * 2) * 8, 22); ctx.stroke();
    ctx.fillStyle = freed ? '#1a1a1a' : '#882222';
    ctx.beginPath();
    const tx = 15 + Math.sin(this.elapsed * 2) * 8;
    ctx.moveTo(tx, 22); ctx.lineTo(tx + 5, 16); ctx.lineTo(tx + 7, 25); ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  _drawPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.isDodging) { ctx.rotate(Math.sin(p.dodgeDuration * 20) * Math.PI); ctx.globalAlpha = 0.6; }
    if (p.invincibleTimer > 0) ctx.globalAlpha = 0.5 + Math.sin(this.elapsed * 20) * 0.3;

    const wingFlap = Math.sin(this.elapsed * 8) * 0.3;

    // Wings with gradient
    const leftWingGrad = ctx.createLinearGradient(-40, -20, -10, 8);
    leftWingGrad.addColorStop(0, '#1a1a3a');
    leftWingGrad.addColorStop(0.5, '#1a1a2a');
    leftWingGrad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = leftWingGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(-40, -20 + wingFlap * 25, -35, 8); ctx.quadraticCurveTo(-20, 12, -10, 5); ctx.closePath(); ctx.fill();
    
    const rightWingGrad = ctx.createLinearGradient(40, -20, 10, 8);
    rightWingGrad.addColorStop(0, '#1a1a3a');
    rightWingGrad.addColorStop(0.5, '#1a1a2a');
    rightWingGrad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = rightWingGrad;
    ctx.beginPath(); ctx.moveTo(10, -5); ctx.quadraticCurveTo(40, -20 + wingFlap * 25, 35, 8); ctx.quadraticCurveTo(20, 12, 10, 5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Body with gradient
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    bodyGrad.addColorStop(0, '#1a1a32');
    bodyGrad.addColorStop(0.7, '#111122');
    bodyGrad.addColorStop(1, '#080812');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Head
    const headGrad = ctx.createRadialGradient(0, -22, 0, 0, -22, 11);
    headGrad.addColorStop(0, '#2a2a3a');
    headGrad.addColorStop(0.7, '#1a1a2a');
    headGrad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(0, -22, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    
    // Green eyes with glow
    ctx.fillStyle = '#44ff66';
    ctx.shadowColor = '#00ff44';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(-4, -23, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -23, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    
    // Eye highlights
    ctx.fillStyle = '#ccffcc';
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(-4, -24, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -24, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Hiccup (rider)
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(0, -12, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(0, -22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3a2a';
    ctx.beginPath(); ctx.arc(0, -24, 4.5, Math.PI, Math.PI * 2); ctx.fill();
    // Helmet horns
    ctx.fillStyle = '#5a4a3a';
    ctx.beginPath(); ctx.moveTo(-4, -26); ctx.lineTo(-7, -32); ctx.lineTo(-3, -27); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(7, -32); ctx.lineTo(3, -27); ctx.closePath(); ctx.fill();

    // Tail + prosthetic fin
    ctx.strokeStyle = '#111122';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(8, 28, 12, 25); ctx.stroke();
    ctx.fillStyle = '#aa2222';
    ctx.beginPath(); ctx.moveTo(12, 25); ctx.lineTo(18, 20); ctx.lineTo(18, 30); ctx.closePath(); ctx.fill();

    // Plasma ready glow (enhanced)
    if (p.fireCooldown <= 0) {
      const readyGrad = ctx.createRadialGradient(0, -30, 0, 0, -30, 15);
      readyGrad.addColorStop(0, 'rgba(150,80,255,0.6)');
      readyGrad.addColorStop(0.5, 'rgba(100,50,255,0.3)');
      readyGrad.addColorStop(1, 'rgba(100,50,255,0)');
      ctx.fillStyle = readyGrad;
      ctx.beginPath(); ctx.arc(0, -30, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawMinions(ctx) {
    this.minions.forEach((m, i) => {
      ctx.save();
      ctx.translate(m.x, m.y);
      const wing = Math.sin(this.elapsed * 6 + i) * 0.3;

      ctx.fillStyle = '#3a2020';
      ctx.beginPath(); ctx.moveTo(-5, -3); ctx.quadraticCurveTo(-22, -12 + wing * 15, -18, 5); ctx.quadraticCurveTo(-12, 8, -5, 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, -3); ctx.quadraticCurveTo(22, -12 + wing * 15, 18, 5); ctx.quadraticCurveTo(12, 8, 5, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a1515';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4400';
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(-3, -6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // HP bar
      const hpP = m.hp / m.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(-12, -18, 24, 3);
      ctx.fillStyle = hpP > 0.5 ? '#44ff44' : '#ff4444';
      ctx.fillRect(-12, -18, 24 * hpP, 3);
      ctx.restore();
    });
  }

  _drawProjectiles(ctx) {
    // Player plasma blasts with enhanced effects
    this.playerProjectiles.forEach(p => {
      ctx.save(); ctx.translate(p.x, p.y);
      
      // Outer glow
      const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      outerGrad.addColorStop(0, 'rgba(136,68,255,0.4)');
      outerGrad.addColorStop(0.5, 'rgba(102,34,255,0.2)');
      outerGrad.addColorStop(1, 'rgba(102,34,255,0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      
      // Middle glow
      const middleGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
      middleGrad.addColorStop(0, 'rgba(204,136,255,0.8)');
      middleGrad.addColorStop(0.6, 'rgba(136,68,255,0.6)');
      middleGrad.addColorStop(1, 'rgba(102,34,255,0.2)');
      ctx.fillStyle = middleGrad;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      
      // Core
      ctx.fillStyle = '#aa88ff';
      ctx.shadowColor = '#8844ff'; 
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      
      // Bright center
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    
    // Boss fireballs with enhanced visuals
    this.bossProjectiles.forEach(p => {
      ctx.save(); ctx.translate(p.x, p.y);
      let color, glow, size;
      switch (p.type) {
        case 'homing': 
          color = '#ff00ff'; 
          glow = 'rgba(255,0,255,0.4)'; 
          size = 10; 
          break;
        case 'meteor': 
          color = '#ff6600'; 
          glow = 'rgba(255,100,0,0.4)'; 
          size = 8; 
          break;
        case 'sweep': 
          color = '#ff4400'; 
          glow = 'rgba(255,68,0,0.4)'; 
          size = 10; 
          break;
        case 'ring': 
          color = '#ff8800'; 
          glow = 'rgba(255,136,0,0.4)'; 
          size = 6; 
          break;
        default: 
          color = '#ff4400'; 
          glow = 'rgba(255,68,0,0.4)'; 
          size = 8;
      }
      
      // Outer glow
      const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
      outerGrad.addColorStop(0, glow);
      outerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath(); ctx.arc(0, 0, size * 3, 0, Math.PI * 2); ctx.fill();
      
      // Main projectile with gradient
      const mainGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      mainGrad.addColorStop(0, '#ffff00');
      mainGrad.addColorStop(0.4, color);
      mainGrad.addColorStop(1, color);
      ctx.fillStyle = mainGrad;
      ctx.shadowColor = color; 
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
      
      // Bright core
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }
  
  _drawProjectileTrails(ctx) {
    this.projectileTrails.forEach(t => {
      const alpha = Math.max(0, t.life / t.maxLife) * 0.6;
      ctx.globalAlpha = alpha;
      const trailGrad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size);
      trailGrad.addColorStop(0, t.color);
      trailGrad.addColorStop(0.5, t.color);
      trailGrad.addColorStop(1, 'rgba(136,68,255,0)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath(); 
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); 
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  _drawParticles(ctx) {
    this.particles.forEach(p => {
      const alphaLife = Math.max(0, p.life / p.maxLife);
      const alpha = (p.alpha !== undefined ? p.alpha : 1.0) * alphaLife;
      ctx.globalAlpha = alpha;
      
      // Add glow to particles
      const particleGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * alpha * 1.5);
      particleGrad.addColorStop(0, p.color);
      particleGrad.addColorStop(0.6, p.color);
      particleGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = particleGrad;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath(); 
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); 
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  }

  _drawHUD(ctx, w, h) {
    // Player HP bar with enhanced styling
    const barW = 200, barH = 16, barX = 20, barY = h - 40;
    
    // Outer shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    
    // Bar background with gradient
    const bgGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    bgGrad.addColorStop(0, '#222');
    bgGrad.addColorStop(1, '#111');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(barX, barY, barW, barH);
    
    // HP fill with gradient
    const hpP = Math.max(0, this.player.hp / this.player.maxHp);
    const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    if (hpP > 0.5) {
      hpGrad.addColorStop(0, '#66ff66');
      hpGrad.addColorStop(1, '#44cc44');
    } else if (hpP > 0.25) {
      hpGrad.addColorStop(0, '#ffcc00');
      hpGrad.addColorStop(1, '#ff8800');
    } else {
      hpGrad.addColorStop(0, '#ff4444');
      hpGrad.addColorStop(1, '#cc2222');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barW * hpP, barH);
    
    // HP bar shine
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW * hpP, barH * 0.4);
    
    // HP text with shadow
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#fff'; 
    ctx.font = 'bold 12px monospace'; 
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`, barX + 5, barY + 12);
    ctx.shadowBlur = 0;
    
    ctx.font = '11px monospace'; 
    ctx.fillStyle = '#88ff88';
    ctx.shadowColor = '#004400';
    ctx.shadowBlur = 2;
    ctx.fillText('HICCUP & DRAGON', barX, barY - 6);
    ctx.shadowBlur = 0;

    // Boss HP bar with enhanced styling
    if (this.state === 'playing') {
      const bossW = w * 0.5, bossX = (w - bossW) / 2, bossY = 20;
      
      // Outer shadow
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bossX - 3, bossY - 3, bossW + 6, barH + 30);
      
      // Background
      const bossBgGrad = ctx.createLinearGradient(bossX, bossY, bossX, bossY + barH + 26);
      bossBgGrad.addColorStop(0, 'rgba(40,10,10,0.9)');
      bossBgGrad.addColorStop(1, 'rgba(20,5,5,0.9)');
      ctx.fillStyle = bossBgGrad;
      ctx.fillRect(bossX, bossY, bossW, barH + 26);
      
      // Boss name
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillStyle = this.boss.phase === 3 ? '#ff2222' : this.boss.phase === 2 ? '#ff6600' : '#ff8844';
      ctx.font = 'bold 14px Georgia, serif'; 
      ctx.textAlign = 'center';
      const phaseText = this.boss.phase === 3 ? ' — ENRAGED' : this.boss.phase === 2 ? ' — FURIOUS' : '';
      ctx.fillText(`THE RED DEATH${phaseText}`, w / 2, bossY + 3);
      ctx.shadowBlur = 0;
      
      // HP bar background
      const bossBarBg = ctx.createLinearGradient(bossX, bossY + 8, bossX, bossY + 8 + barH);
      bossBarBg.addColorStop(0, '#222');
      bossBarBg.addColorStop(1, '#111');
      ctx.fillStyle = bossBarBg;
      ctx.fillRect(bossX, bossY + 8, bossW, barH);
      
      // HP fill with gradient based on phase
      const bossHpP = Math.max(0, this.boss.hp / this.boss.maxHp);
      const bossHpGrad = ctx.createLinearGradient(bossX, bossY + 8, bossX, bossY + 8 + barH);
      if (this.boss.phase === 3) {
        bossHpGrad.addColorStop(0, '#ff3333');
        bossHpGrad.addColorStop(1, '#cc0000');
      } else if (this.boss.phase === 2) {
        bossHpGrad.addColorStop(0, '#ff7744');
        bossHpGrad.addColorStop(1, '#ff4400');
      } else {
        bossHpGrad.addColorStop(0, '#ffaa66');
        bossHpGrad.addColorStop(1, '#ff6600');
      }
      ctx.fillStyle = bossHpGrad;
      ctx.fillRect(bossX, bossY + 8, bossW * bossHpP, barH);
      
      // HP bar shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(bossX, bossY + 8, bossW * bossHpP, barH * 0.4);
      
      // HP text
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#fff'; 
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${Math.ceil(this.boss.hp)}/${this.boss.maxHp}`, w / 2, bossY + 20);
      ctx.shadowBlur = 0;
      
      if (this.boss.phase >= 2) {
        const phaseGlow = this.boss.phase === 3 ? '#ff0000' : '#ff6600';
        ctx.fillStyle = this.boss.phase === 3 ? '#ff4444' : '#ff8844';
        ctx.shadowColor = phaseGlow;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`PHASE ${this.boss.phase}`, w / 2, bossY + 38);
        ctx.shadowBlur = 0;
      }
    }

    // Dodge cooldown with styling
    const dodgeReady = this.player.dodgeCooldown <= 0;
    ctx.font = '11px monospace'; 
    ctx.textAlign = 'right';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 2;
    ctx.fillStyle = dodgeReady ? '#44ff88' : '#666';
    ctx.fillText(dodgeReady ? 'DODGE: READY' : `DODGE: ${this.player.dodgeCooldown.toFixed(1)}s`, w - 20, h - 26);
    
    // Score with glow
    ctx.fillStyle = '#ffd700'; 
    ctx.font = 'bold 14px monospace';
    ctx.shadowColor = '#885500';
    ctx.shadowBlur = 4;
    ctx.fillText(`SCORE: ${this.player.score}`, w - 20, h - 8);
    ctx.shadowBlur = 0;
  }

  _drawVictory(ctx, w, h) {
    const alpha = Math.min(this.stateTimer / 2, 0.7);
    const overlayGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    overlayGrad.addColorStop(0, `rgba(50,30,0,${alpha})`);
    overlayGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.stateTimer > 1) {
      ctx.globalAlpha = Math.min((this.stateTimer - 1) / 1.5, 1);
      ctx.textAlign = 'center';
      
      // Main victory text with multiple shadows
      ctx.font = 'bold 56px Georgia, serif';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#ffd700';
      ctx.fillText('TOOTHLESS IS FREE!', w / 2, h * 0.4);
      
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffee44';
      ctx.fillText('TOOTHLESS IS FREE!', w / 2, h * 0.4);
      
      // Subtitle
      ctx.font = '28px Georgia, serif';
      ctx.fillStyle = '#88ff88';
      ctx.shadowColor = '#44ff44'; 
      ctx.shadowBlur = 20;
      ctx.fillText('You defeated the Red Death!', w / 2, h * 0.5);
      
      // Score
      ctx.font = '24px Georgia, serif';
      ctx.fillStyle = '#ffcc66'; 
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.fillText(`Score: ${this.player.score}`, w / 2, h * 0.58);
      
      if (this.stateTimer > 3 && Math.sin(this.elapsed * 3) > 0) {
        ctx.font = '22px Georgia, serif'; 
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fillText('Press SPACE to continue', w / 2, h * 0.68);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  _drawDefeat(ctx, w, h) {
    const alpha = Math.min(this.stateTimer / 2, 0.8);
    const overlayGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    overlayGrad.addColorStop(0, `rgba(40,0,0,${alpha})`);
    overlayGrad.addColorStop(1, `rgba(10,0,0,${alpha})`);
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.stateTimer > 1) {
      ctx.globalAlpha = Math.min((this.stateTimer - 1) / 1.5, 1);
      ctx.textAlign = 'center';
      
      // Defeat text with glow
      ctx.font = 'bold 48px Georgia, serif';
      ctx.shadowColor = '#ff0000'; 
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff6666';
      ctx.fillText('DEFEATED', w / 2, h * 0.4);
      
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff4444';
      ctx.fillText('DEFEATED', w / 2, h * 0.4);
      
      // Subtitle
      ctx.font = '24px Georgia, serif';
      ctx.fillStyle = '#ffcc88'; 
      ctx.shadowColor = '#aa4400';
      ctx.shadowBlur = 10;
      ctx.fillText('Toothless still needs you...', w / 2, h * 0.5);
      
      if (this.stateTimer > 2 && Math.sin(this.elapsed * 3) > 0) {
        ctx.font = '20px Georgia, serif'; 
        ctx.fillStyle = '#cccccc';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillText('Press SPACE to try again', w / 2, h * 0.6);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  _endGame(won) {
    this.running = false;
    this.won = won;
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    document.removeEventListener('mousedown', this._mouseDown);
    document.removeEventListener('mouseup', this._mouseUp);
    document.removeEventListener('mousemove', this._mouseMove);
    window.removeEventListener('resize', this._resizeHandler);
    setTimeout(() => {
      if (this.canvas && this.canvas.parentNode) this.canvas.remove();
      if (this.onComplete) this.onComplete(won);
    }, 500);
  }

  dispose() {
    this.running = false;
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    document.removeEventListener('mousedown', this._mouseDown);
    document.removeEventListener('mouseup', this._mouseUp);
    document.removeEventListener('mousemove', this._mouseMove);
    window.removeEventListener('resize', this._resizeHandler);
    if (this.canvas && this.canvas.parentNode) this.canvas.remove();
  }
}
