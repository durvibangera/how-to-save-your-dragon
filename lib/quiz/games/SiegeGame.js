/**
 * "How to Game Your Dragon" – 2D Top-Down Pixel Adventure
 * 4 levels: Berk Outskirts → Forbidden Forest → Dragon Island → The Red Death's Nest
 * Fullscreen canvas game, SNES/GBA inspired pixel art
 */
export class SiegeGame {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.gameOver = false;
    this.won = false;
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    this.mouseClick = false;

    // Screen
    this.width = 0;
    this.height = 0;
    this.scale = 1;

    // Game state
    this.level = 1;
    this.transitioning = false;
    this.transitionAlpha = 0;
    this.transitionText = '';
    this.transitionTimer = 0;
    
    // Help system
    this.showingHelp = false;
    
    // Weapon pickup indicator
    this.weaponPickupIndicator = null;
    this.weaponPickupTimer = 0;

    // Player - Hero
    this.player = {
      x: 0, y: 0, width: 24, height: 24,
      hp: 150, maxHp: 150,
      speed: 3,
      baseSpeed: 3,
      dir: 'down', // up, down, left, right
      attacking: false,
      attackTimer: 0,
      attackCooldown: 0,
      attackDuration: 15,
      weapon: 'sword', // sword, bow, spear, halberd
      hasWeapons: { sword: true, bow: false, spear: false, halberd: false, bladesOfChaos: false }, // Track which weapons player has
      halberdCooldown: 0,
      bowCooldown: 0,
      spearCooldown: 0,
      bladesOfChaosCooldown: 0,
      bladesCharging: false,
      bladesChargeTimer: 0,
      bladesCombo: 0,
      bladesComboTimer: 0,
      invincible: 0,
      animFrame: 0,
      animTimer: 0,
      dmgBoost: false,
      dmgBoostTimer: 0,
      shieldActive: false,
      shieldTimer: 0,
      speedBoost: false,
      speedBoostTimer: 0,
      arrows: [],
      specialCooldown: 0,
      specialReady: true,
      killedBoss: false,
      attackDamage: 10,
      lifestealActive: false,
      lifestealTimer: 0,
      thornsActive: false,
      thornsTimer: 0,
      rageActive: false,
      rageTimer: 0,
    };

    // Camera
    this.camera = { x: 0, y: 0 };

    // World
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.tiles = [];
    this.walls = [];
    this.enemies = [];
    this.pickups = [];
    this.projectiles = []; // enemy projectiles
    this.particles = [];
    this.damageNumbers = [];
    this.hazards = [];
    this.gates = [];
    this.npcs = [];
    this.tutorialHints = [];

    // Boss
    this.boss = null;
    this.bossPhase = 0;

    // Castle keeper password puzzle
    this.castleKeeper = null;
    this.passwordAttempts = 0;
    this.passwordUI = null;
    this.showingPasswordUI = false;
    
    // Circuit puzzle (Level 2.5)
    this.circuitNodes = [];
    this.powerSource = null;
    this.gateNode = null;
    this.poweredNodes = new Set();
    this.puzzleSolved = false;
    this.puzzleSolvedTimer = 0; // timer for auto-transition after solve
    this.puzzleCameraMode = false; // free camera for puzzle level
    this.puzzleCam = { x: 0, y: 0 }; // independent puzzle camera
    this.puzzleCamSpeed = 5;

    // Lava pools (dynamic hazards)
    this.lavaPools = [];
    this.lavaPoolSpawnTimer = 0;
    this.lavaPoolMaxActive = 3;

    // Wave system (Level 3.5)
    this.waveLevel = false;
    this.currentWave = 0;
    this.totalWaves = 7;
    this.waveEnemiesRemaining = 0;
    this.waveState = 'idle'; // idle, active, pause, complete
    this.wavePauseTimer = 0;
    this.waveAnnounceTimer = 0;
    this.waveAnnounceText = '';
    this.wavesCleared = false;
    this.waveKills = 0;
    this.waveHealthDropTimer = 0;
    this.waveSpawnEffects = [];
    this.captainBuffRadius = 80;

    // Ending
    this.ending = false;
    this.endingTimer = 0;
    this.endingPhase = 0;

    // Screen shake
    this.shakeAmount = 0;
    this.shakeTimer = 0;

    // Low HP vignette
    this.vignetteAlpha = 0;

    // Audio
    this.audioCtx = null;

    // HUD messages
    this.hudMessage = '';
    this.hudMessageTimer = 0;

    // Hint bubbles for tutorial
    this.hintBubble = null;

    // Time
    this.elapsed = 0;
    this.frame = 0;

    this._init();
  }

  _init() {
    // Create fullscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 10000; background: #000;
      image-rendering: pixelated; image-rendering: crisp-edges;
      cursor: crosshair;
    `;
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._resize();
    this._setupControls();
    this._initAudio();
    this._loadLevel(1);

    this.running = true;
    this._gameLoop();

    this._resizeHandler = () => this._resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.scale = Math.max(2, Math.floor(Math.min(this.width, this.height) / 240));
  }

  _setupControls() {
    this._keyDown = (e) => {
      this.keys[e.code] = true;
      // Attack with Space or J
      if (e.code === 'Space' || e.code === 'KeyJ') {
        this._playerAttack();
      }
      // Switch weapon with E or K
      if (e.code === 'KeyE' || e.code === 'KeyK') {
        const weapons = [];
        if (this.player.hasWeapons.sword) weapons.push('sword');
        if (this.player.hasWeapons.bow) weapons.push('bow');
        if (this.player.hasWeapons.spear) weapons.push('spear');
        if (this.player.hasWeapons.halberd) weapons.push('halberd');
        if (this.player.hasWeapons.bladesOfChaos) weapons.push('bladesOfChaos');

        if (weapons.length > 1) {
          const currentIndex = weapons.indexOf(this.player.weapon);
          const nextIndex = (currentIndex + 1) % weapons.length;
          this.player.weapon = weapons[nextIndex];
          this._showHudMessage(`Switched to ${this.player.weapon.toUpperCase()}`);
        }
      }
      // Help with H
      if (e.code === 'KeyH') {
        this._toggleHelp();
      }
      // Special with Q
      if (e.code === 'KeyQ') {
        // Lava attack on dying boss
        if (this.player.lavaAttackReady && this.boss && this.boss.dying) {
          this._triggerLavaAttack();
        } else if (this.player.specialReady && this.player.specialCooldown <= 0) {
          this._playerSpecialAttack();
        }
      }
      // Interact with F for NPCs/gates
      if (e.code === 'KeyF') {
        this._interact();
      }
      if (!this.showingPasswordUI) e.preventDefault();
    };
    this._keyUp = (e) => {
      this.keys[e.code] = false;
    };
    this._mouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mousePos.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    };
    this._mouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mousePos.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.mouseClick = true;
      this.mouseHeld = true;
      // Don't attack in puzzle level, only interact with nodes
      if (this.level !== 2.5) {
        if (this.player.weapon === 'bladesOfChaos') {
          // Blades of Chaos: start charging on hold
          this.player.bladesCharging = true;
          this.player.bladesChargeTimer = 0;
          this._bladesQuickSlash(); // Immediate first slash
        } else {
          this._playerAttack();
        }
      }
    };
    this._mouseUp = (e) => {
      this.mouseHeld = false;
      if (this.player.weapon === 'bladesOfChaos' && this.player.bladesCharging) {
        const chargeTime = this.player.bladesChargeTimer;
        this.player.bladesCharging = false;
        if (chargeTime >= 30) {
          // Charged release: spinning fury
          this._bladesSpinningFury(chargeTime);
        }
        this.player.bladesChargeTimer = 0;
      }
    };

    document.addEventListener('keydown', this._keyDown);
    document.addEventListener('keyup', this._keyUp);
    document.addEventListener('mousemove', this._mouseMove);
    document.addEventListener('mousedown', this._mouseDown);
    document.addEventListener('mouseup', this._mouseUp);
  }

  // ─── AUDIO ────────────────────────────────────────────────────────────
  _initAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { }
  }

  _playSound(type) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'hit') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'sword') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'bow') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'pickup') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.08);
      osc.frequency.setValueAtTime(784, now + 0.16);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'bosshit') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
      this.shakeAmount = 4;
      this.shakeTimer = 8;
    } else if (type === 'death') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'victory') {
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const g = ctx.createGain();
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.06, now + i * 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.5);
      });
    } else if (type === 'slam') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.4);
      this.shakeAmount = 8;
      this.shakeTimer = 15;
    } else if (type === 'gate') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.3);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'horn') {
      // War horn - deep, resonant, ominous
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(165, now + 0.3);
      osc.frequency.linearRampToValueAtTime(110, now + 0.6);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.setValueAtTime(0.1, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.7);
      // Second harmonic for richness
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.linearRampToValueAtTime(330, now + 0.3);
      osc2.frequency.linearRampToValueAtTime(220, now + 0.6);
      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.6);
    } else if (type === 'crossbow') {
      // Crossbow thwack - quick, sharp, mechanical
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  // ─── LEVEL LOADING ────────────────────────────────────────────────────
  _loadLevel(level) {
    this.level = level;
    this.enemies = [];
    this.pickups = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.hazards = [];
    this.gates = [];
    this.npcs = [];
    this.tutorialHints = [];
    this.walls = [];
    this.boss = null;
    this.bossPhase = 0;
    this.castleKeeper = null;
    this.passwordAttempts = 0;
    this.showingPasswordUI = false;
    
    // Reset lava pools
    this.lavaPools = [];
    this.lavaPoolSpawnTimer = 0;

    // Reset wave state
    this.waveLevel = false;
    this.currentWave = 0;
    this.waveState = 'idle';
    this.wavePauseTimer = 0;
    this.waveAnnounceTimer = 0;
    this.wavesCleared = false;
    this.waveKills = 0;
    this.waveHealthDropTimer = 0;
    this.waveSpawnEffects = [];

    switch (level) {
      case 1: this._buildLevel1(); break;
      case 2: this._buildLevel2(); break;
      case 2.5: this._buildPuzzleLevel(); break; // Circuit puzzle
      case 3: this._buildLevel3(); break;
      case 3.5: this._buildLevel3_5(); break; // Wave arena
      case 4: this._buildLevel4(); break;
    }

    this._startLevelTransition();
  }

  _startLevelTransition() {
    const names = [
      '',
      'Level 1 — Berk Outskirts',
      'Level 2 — Forbidden Forest',
      'Puzzle — Restore the Dragon Eye',
      'Level 3 — Dragon Island',
      'Level 4 — The Red Death\'s Nest',
    ];
    const specialNames = { 3.5: 'The Dragon Pit — Gauntlet of Fire' };
    const levelIndex = this.level === 2.5 ? 2.5 : this.level;
    this.transitioning = true;
    this.transitionAlpha = 1;
    this.transitionText = specialNames[levelIndex] || names[levelIndex] || names[Math.floor(levelIndex)] || '';
    this.transitionTimer = 120;
  }

  // ─── LEVEL 1: TUTORIAL ───────────────────────────────────────────────
  _buildLevel1() {
    this.worldWidth = 600;
    this.worldHeight = 500;
    this.player.x = 50;
    this.player.y = 250;
    this.player.hp = 100;
    this.player.maxHp = 100;

    // Tiles: grass path with borders
    this.tiles = this._generateGrassTiles(this.worldWidth, this.worldHeight);

    // Walls (borders and to create a path)
    // Top wall
    this._addWall(0, 0, this.worldWidth, 60);
    // Bottom wall
    this._addWall(0, this.worldHeight - 60, this.worldWidth, 60);
    // Left wall (with opening for start)
    this._addWall(0, 0, 30, 220);
    this._addWall(0, 280, 30, 220);
    // Right wall (with gate)
    this._addWall(this.worldWidth - 30, 0, 30, 200);
    this._addWall(this.worldWidth - 30, 300, 30, 200);

    // Internal walls to create a winding path
    this._addWall(150, 60, 20, 250);
    this._addWall(300, 190, 20, 310);
    this._addWall(450, 60, 20, 250);

    // Tutorial hints
    this.tutorialHints.push(
      { x: 80, y: 250, text: 'WASD / Arrows to Move', shown: false, radius: 40 },
      { x: 200, y: 150, text: 'SPACE / Click to Attack', shown: false, radius: 40 },
      { x: 370, y: 350, text: 'Walk over items to pick up', shown: false, radius: 40 },
      { x: 520, y: 150, text: 'Press F near gate', shown: false, radius: 40 },
    );

    // Practice dummies (very weak)
    this._spawnEnemy(200, 130, 'dummy', 15, 1);
    this._spawnEnemy(240, 170, 'dummy', 15, 1);

    // Weak slimes
    this._spawnEnemy(370, 330, 'slime', 20, 2);
    this._spawnEnemy(400, 370, 'slime', 20, 2);

    // Health pickup
    this.pickups.push({ x: 360, y: 400, type: 'health', collected: false });

    // Sword pickup (even though player starts with sword, visual cue)
    this.pickups.push({ x: 180, y: 200, type: 'sword', collected: false });

    // Gate to next level
    this.gates.push({
      x: this.worldWidth - 30, y: 200, width: 30, height: 100,
      open: false, requireClear: true,
    });
  }

  // ─── LEVEL 2: FOREST OF SHADOWS ──────────────────────────────────────
  _buildLevel2() {
    this.worldWidth = 800;
    this.worldHeight = 700;
    this.player.x = 50;
    this.player.y = 350;

    this.tiles = this._generateForestTiles(this.worldWidth, this.worldHeight);

    // Borders
    this._addWall(0, 0, this.worldWidth, 30);
    this._addWall(0, this.worldHeight - 30, this.worldWidth, 30);
    this._addWall(0, 0, 30, this.worldHeight);
    this._addWall(this.worldWidth - 30, 0, 30, 250);
    this._addWall(this.worldWidth - 30, 400, 30, 300);

    // Forest obstacles (trees/rocks)
    this._addWall(200, 100, 40, 40); // tree
    this._addWall(350, 200, 40, 40);
    this._addWall(500, 120, 40, 40);
    this._addWall(150, 400, 40, 40);
    this._addWall(400, 500, 40, 40);
    this._addWall(600, 400, 40, 40);

    // River + bridges
    this._addWall(380, 30, 20, 250); // river left bank wall
    this._addWall(380, 350, 20, 350); // river left bank wall
    // Bridge gap at y:280-350

    // Enemies
    this._spawnEnemy(250, 150, 'slime', 18, 3);
    this._spawnEnemy(300, 300, 'slime', 18, 3);
    this._spawnEnemy(450, 250, 'slime', 18, 3);
    this._spawnEnemy(500, 400, 'forest_creature', 25, 5);
    this._spawnEnemy(600, 300, 'forest_creature', 25, 5);
    this._spawnEnemy(650, 500, 'slime', 18, 3);
    this._spawnEnemy(700, 200, 'forest_creature', 25, 5);

    // Bow pickup
    this.pickups.push({ x: 300, y: 250, type: 'bow', collected: false });
    
    // Spear pickup
    this.pickups.push({ x: 700, y: 150, type: 'spear', collected: false });

    // Power-ups
    this.pickups.push({ x: 500, y: 300, type: 'health', collected: false });
    this.pickups.push({ x: 650, y: 450, type: 'speed', collected: false });
    this.pickups.push({ x: 200, y: 500, type: 'health', collected: false });
    this.pickups.push({ x: 400, y: 400, type: 'health', collected: false });

    // Gate
    this.gates.push({
      x: this.worldWidth - 30, y: 250, width: 30, height: 150,
      open: false, requireClear: false, requireKills: 5,
    });
  }

  // ─── LEVEL 2.5: CIRCUIT PUZZLE (ENHANCED) ──────────────────────────────
  _buildPuzzleLevel() {
    this.worldWidth = 1000;
    this.worldHeight = 900;
    this.player.x = 100;
    this.player.y = 800;
    
    this.tiles = { type: 'puzzle' };
    
    // Borders
    this._addWall(0, 0, this.worldWidth, 30);
    this._addWall(0, this.worldHeight - 30, this.worldWidth, 30);
    this._addWall(0, 0, 30, this.worldHeight);
    this._addWall(this.worldWidth - 30, 0, 30, this.worldHeight);
    
    // Decorative castle walls
    this._addWall(30, 30, 50, 200);
    this._addWall(this.worldWidth - 80, 30, 50, 200);
    this._addWall(30, this.worldHeight - 230, 50, 200);
    this._addWall(this.worldWidth - 80, this.worldHeight - 230, 50, 200);
    
    // Circuit puzzle nodes
    this.circuitNodes = [];
    this.poweredNodes = new Set();
    this.puzzleSolved = false;
    this.puzzleSolvedTimer = 0;
    
    // Power source (always ON) - bottom left
    this.powerSource = {
      x: 100, y: 750, type: 'source', powered: true, locked: true
    };
    
    // Gate node (goal) - top right
    this.gateNode = {
      x: 500, y: 50, type: 'gate', powered: false, locked: true
    };
    
    // COMPLEX CIRCUIT PUZZLE — serpentine path with splits and many decoys
    // 
    // ENHANCED COMPLEX CIRCUIT - 24 solution nodes + 17 decoys
    // Source at (100,750) → complex serpentine with 3 splits → Gate at (500,50)
    //
    // Path: Source→R(200,750)→R corner(300,750)→U(300,650)→
    //   split@(300,550)[R+U]→R(400,550)→R corner(500,550)→D corner(500,650)→
    //   R corner(600,650)→U(600,550)→U(600,450)→U corner(600,350)→
    //   L(500,350)→L(400,350)→split@(300,350)[L+U]→
    //   U corner(300,250)→R(400,250)→R(500,250)→R corner(600,250)→
    //   U corner(600,150)→L(500,150)→L(400,150)→
    //   split@(300,150)[U+L]→U corner(300,50)→R(400,50)→R Gate(500,50)
    
    this.circuitNodes.push(
      // === SOLUTION PATH (24 nodes) ===
      
      // Leg 1: Source → right along bottom
      { x: 200, y: 750, type: 'straight', rotation: 0, powered: false },  // needs H(1)
      { x: 300, y: 750, type: 'corner',   rotation: 1, powered: false },  // needs rot 3(L-U)
      
      // Leg 2: Up column
      { x: 300, y: 650, type: 'straight', rotation: 2, powered: false },  // needs V(0)
      
      // Split 1: in=down → out=right+up
      { x: 300, y: 550, type: 'split',    rotation: 2, powered: false },  // needs rot 0
      
      // Leg 3: Right from split across middle-low  
      { x: 400, y: 550, type: 'straight', rotation: 0, powered: false },  // needs H(1)
      { x: 500, y: 550, type: 'corner',   rotation: 0, powered: false },  // needs rot 2(D-L)
      
      // Leg 4: Down then right then up — the zigzag
      { x: 500, y: 650, type: 'corner',   rotation: 3, powered: false },  // needs rot 0(U-R)
      { x: 600, y: 650, type: 'corner',   rotation: 1, powered: false },  // needs rot 3(L-U)
      { x: 600, y: 550, type: 'straight', rotation: 1, powered: false },  // needs V(0)
      { x: 600, y: 450, type: 'straight', rotation: 2, powered: false },  // needs V(0)
      { x: 600, y: 350, type: 'corner',   rotation: 0, powered: false },  // needs rot 2(D-L)
      
      // Leg 5: Left along middle row
      { x: 500, y: 350, type: 'straight', rotation: 0, powered: false },  // needs H(1)
      { x: 400, y: 350, type: 'straight', rotation: 2, powered: false },  // needs H(1)
      
      // Split 2: in=right → out=left+up
      { x: 300, y: 350, type: 'split',    rotation: 1, powered: false },  // needs rot 3
      
      // Leg 6: Up then right across upper section
      { x: 300, y: 250, type: 'corner',   rotation: 0, powered: false },  // needs rot 1(R-D)
      { x: 400, y: 250, type: 'straight', rotation: 0, powered: false },  // needs H(1)
      { x: 500, y: 250, type: 'straight', rotation: 2, powered: false },  // needs H(1)
      { x: 600, y: 250, type: 'corner',   rotation: 1, powered: false },  // needs rot 3(L-U)
      
      // Leg 7: Left along top row
      { x: 600, y: 150, type: 'corner',   rotation: 0, powered: false },  // needs rot 2(D-L)
      { x: 500, y: 150, type: 'straight', rotation: 0, powered: false },  // needs H(1)
      { x: 400, y: 150, type: 'straight', rotation: 2, powered: false },  // needs H(1)
      
      // Split 3: in=right → out=up+left
      { x: 300, y: 150, type: 'split',    rotation: 1, powered: false },  // needs rot 3
      
      // Leg 8: Up from split then right to gate
      { x: 300, y: 50,  type: 'corner',   rotation: 0, powered: false },  // needs rot 1(R-D)
      { x: 400, y: 50,  type: 'straight', rotation: 2, powered: false },  // needs H(1)
      
      // === DECOY NODES (17 nodes) ===
      
      // Decoy from split1 (300,550) UP → dead end chain
      { x: 300, y: 450, type: 'straight', rotation: 1, powered: false },
      
      // Decoy from split2 (300,350) LEFT → dead end chain
      { x: 200, y: 350, type: 'corner',   rotation: 0, powered: false },
      { x: 200, y: 450, type: 'dead',     rotation: 2, powered: false },
      
      // Decoy from split3 (300,150) LEFT → dead end chain
      { x: 200, y: 150, type: 'corner',   rotation: 0, powered: false },
      { x: 200, y: 250, type: 'dead',     rotation: 1, powered: false },
      
      // Bottom row decoys — tempting wrong path from source
      { x: 400, y: 750, type: 'corner',   rotation: 1, powered: false },
      { x: 500, y: 750, type: 'straight', rotation: 0, powered: false },
      { x: 600, y: 750, type: 'dead',     rotation: 0, powered: false },
      
      // Left column decoys — looks like alternative path up
      { x: 200, y: 550, type: 'corner',   rotation: 2, powered: false },
      { x: 200, y: 650, type: 'dead',     rotation: 3, powered: false },
      
      // Right side mid decoys — extend beyond real path
      { x: 700, y: 350, type: 'corner',   rotation: 1, powered: false },
      { x: 700, y: 450, type: 'dead',     rotation: 0, powered: false },
      { x: 700, y: 550, type: 'dead',     rotation: 1, powered: false },
      
      // Upper right decoys
      { x: 700, y: 250, type: 'dead',     rotation: 2, powered: false },
      { x: 700, y: 150, type: 'dead',     rotation: 0, powered: false },
      
      // Center area decoy
      { x: 450, y: 450, type: 'dead',     rotation: 1, powered: false },
      
      // Extra decoy near split area  
      { x: 200, y: 50,  type: 'dead',     rotation: 3, powered: false },
    );
    
    // Drawbridge gate at top
    this.gates.push({
      x: 460, y: 30, width: 80, height: 30,
      open: false, requirePuzzle: true,
    });
    
    // Add NPC near the gate to give lore
    this.npcs.push({
      x: 180, y: 200,
      width: 24, height: 24,
      name: 'Elder Viking',
      dialogue: 'The Red Death has scrambled the Dragon Eye\'s power lines! This circuit is far more devious than before. Rotate each node carefully — only ONE path leads to the gate. Beware the dead ends and false trails!',
      interacted: false,
    });
    
    // Second NPC with hint
    this.npcs.push({
      x: 800, y: 700,
      width: 24, height: 24,
      name: 'Dragon Trainer',
      dialogue: 'The power flows from the source at the bottom-left. It must reach the Dragon Eye mechanism at the top. Follow the serpentine path — the splits will try to lead you astray!',
      interacted: false,
    });
    
    // Initialize puzzle camera centered on the circuit
    this.puzzleCameraMode = true;
    const vpW = this.width / this.scale;
    const vpH = this.height / this.scale;
    this.puzzleCam.x = Math.max(0, this.worldWidth / 2 - vpW / 2);
    this.puzzleCam.y = Math.max(0, this.worldHeight / 2 - vpH / 2);
    this.camera.x = this.puzzleCam.x;
    this.camera.y = this.puzzleCam.y;
    
    setTimeout(() => {
      this._showHudMessage('🐉 Use Arrow Keys to pan! Click nodes to rotate! Restore power from ⚡ to 🐉! Beware the false paths! 🐉');
    }, 100);
  }

  // ─── LEVEL 3: CASTLE OUTER GROUNDS ────────────────────────────────────
  _buildLevel3() {
    this.worldWidth = 900;
    this.worldHeight = 800;
    this.player.x = 50;
    this.player.y = 400;

    this.tiles = this._generateCastleTiles(this.worldWidth, this.worldHeight);

    // Borders
    this._addWall(0, 0, this.worldWidth, 30);
    this._addWall(0, this.worldHeight - 30, this.worldWidth, 30);
    this._addWall(0, 0, 30, this.worldHeight);
    this._addWall(this.worldWidth - 30, 0, 30, 350);
    this._addWall(this.worldWidth - 30, 500, 30, 300);

    // Ruined castle walls / broken pillars
    this._addWall(200, 100, 30, 200);
    this._addWall(200, 400, 30, 200);
    this._addWall(400, 150, 50, 30);
    this._addWall(400, 600, 50, 30);
    this._addWall(600, 100, 30, 150);
    this._addWall(600, 550, 30, 150);

    // Broken pillars (small walls)
    this._addWall(350, 350, 20, 20);
    this._addWall(500, 250, 20, 20);
    this._addWall(700, 400, 20, 20);

    // Hazards (spikes)
    this.hazards.push({ x: 300, y: 300, width: 40, height: 40, damage: 5, cooldown: 0 });
    this.hazards.push({ x: 450, y: 450, width: 40, height: 40, damage: 5, cooldown: 0 });
    this.hazards.push({ x: 550, y: 350, width: 40, height: 40, damage: 5, cooldown: 0 });

    // Enemies - stronger
    this._spawnEnemy(250, 300, 'knight', 35, 7);
    this._spawnEnemy(350, 500, 'knight', 35, 7);
    this._spawnEnemy(500, 200, 'knight', 35, 7);
    this._spawnEnemy(500, 600, 'archer', 25, 8);
    this._spawnEnemy(650, 300, 'archer', 25, 8);
    this._spawnEnemy(700, 600, 'knight', 35, 7);

    // Power-ups
    this.pickups.push({ x: 300, y: 200, type: 'shield', collected: false });
    this.pickups.push({ x: 600, y: 500, type: 'damage', collected: false });
    this.pickups.push({ x: 450, y: 350, type: 'health', collected: false });
    this.pickups.push({ x: 750, y: 250, type: 'health', collected: false });
    this.pickups.push({ x: 200, y: 600, type: 'health', collected: false });
    this.pickups.push({ x: 800, y: 400, type: 'health', collected: false });

    // Castle Keeper NPC (password gate)
    this.castleKeeper = {
      x: this.worldWidth - 80, y: 420,
      width: 24, height: 24,
      interacted: false,
    };

    // Gate to boss (starts locked, opens with password)
    this.gates.push({
      x: this.worldWidth - 30, y: 350, width: 30, height: 150,
      open: false, requirePassword: true,
    });
  }

  // ─── LEVEL 3.5: INFERNAL DUNGEON GAUNTLET ─────────────────────────────
  _buildLevel3_5() {
    this.worldWidth = 900;
    this.worldHeight = 900;
    this.player.x = 450;
    this.player.y = 800;
    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);

    this.tiles = this._generateDungeonTiles();

    // Dungeon walls - enclosed dark chamber
    this._addWall(0, 0, this.worldWidth, 50);
    this._addWall(0, this.worldHeight - 50, this.worldWidth, 50);
    this._addWall(0, 0, 50, this.worldHeight);
    this._addWall(this.worldWidth - 50, 0, 50, this.worldHeight);

    // Ruined stone pillars (strategic cover)
    this._addWall(180, 180, 30, 30);
    this._addWall(690, 180, 30, 30);
    this._addWall(180, 620, 30, 30);
    this._addWall(690, 620, 30, 30);
    this._addWall(435, 400, 30, 30); // Center pillar

    // Smaller cover - broken altar fragments
    this._addWall(300, 280, 22, 22);
    this._addWall(578, 280, 22, 22);
    this._addWall(300, 560, 22, 22);
    this._addWall(578, 560, 22, 22);

    // Side alcove walls (create dungeon nooks)
    this._addWall(50, 300, 60, 20);
    this._addWall(50, 560, 60, 20);
    this._addWall(790, 300, 60, 20);
    this._addWall(790, 560, 60, 20);

    // Gate to boss room (locked until waves cleared)
    this.gates.push({
      x: 400, y: 50, width: 100, height: 50,
      open: false, requireWaves: true,
    });

    // NPC - cursed dungeon spirit
    this.npcs.push({
      x: 440, y: 740,
      width: 24, height: 24,
      name: 'Fallen Dragon Rider',
      dialogue: '"Seven trials of fire and dragon fury await you. Dragon Hunters forged in shadow, Fire Mages wielding dragon flame, and the Bewilderbeast... an unstoppable alpha dragon. Approach the gate when you are ready. Survive them all, or perish in this pit forever."',
      interacted: false,
    });

    this._showHudMessage('Talk to the fallen rider near you (F to interact), then approach the north gate to begin.');

    // Enable wave system
    this.waveLevel = true;
    this.currentWave = 0;
    this.waveState = 'idle';
    this.wavePauseTimer = 0;
    this.waveAnnounceTimer = 0;
    this.totalWaves = 7;
    this.wavesCleared = false;
    this.waveGatePromptShown = false;

    // Initial spike hazards - dungeon traps
    this.hazards.push({ x: 120, y: 400, width: 30, height: 30, damage: 5, cooldown: 0 });
    this.hazards.push({ x: 750, y: 400, width: 30, height: 30, damage: 5, cooldown: 0 });
    this.hazards.push({ x: 435, y: 200, width: 30, height: 30, damage: 5, cooldown: 0 });
    this.hazards.push({ x: 435, y: 650, width: 30, height: 30, damage: 5, cooldown: 0 });

    // Initial lava pools
    this.lavaPools = [];
    this.lavaPoolSpawnTimer = 0;
    this.lavaPoolMaxActive = 3;

    // Dungeon decorations — bone piles, weapon racks, magic circles, cages, torch brackets
    this.dungeonDecorations = [
      // Bone piles in corners
      { x: 70, y: 70, type: 'bones' },
      { x: 810, y: 70, type: 'bones' },
      { x: 70, y: 810, type: 'bones' },
      { x: 810, y: 810, type: 'bones' },
      // Weapon racks along walls
      { x: 150, y: 60, type: 'weapon_rack' },
      { x: 350, y: 60, type: 'weapon_rack' },
      { x: 550, y: 60, type: 'weapon_rack' },
      { x: 750, y: 60, type: 'weapon_rack' },
      // Magic summoning circle in center
      { x: 450, y: 450, type: 'magic_circle', radius: 50 },
      // Smaller ritual circles near pillars
      { x: 195, y: 195, type: 'magic_circle', radius: 20 },
      { x: 705, y: 195, type: 'magic_circle', radius: 20 },
      { x: 195, y: 635, type: 'magic_circle', radius: 20 },
      { x: 705, y: 635, type: 'magic_circle', radius: 20 },
      // Cage alcoves along side walls
      { x: 60, y: 200, type: 'cage' },
      { x: 60, y: 420, type: 'cage' },
      { x: 60, y: 680, type: 'cage' },
      { x: 830, y: 200, type: 'cage' },
      { x: 830, y: 420, type: 'cage' },
      { x: 830, y: 680, type: 'cage' },
      // Blood splatters near hazards
      { x: 130, y: 410, type: 'blood' },
      { x: 760, y: 410, type: 'blood' },
      { x: 445, y: 210, type: 'blood' },
      // Torch brackets (animated)
      { x: 60, y: 150, type: 'torch' },
      { x: 60, y: 450, type: 'torch' },
      { x: 60, y: 750, type: 'torch' },
      { x: 840, y: 150, type: 'torch' },
      { x: 840, y: 450, type: 'torch' },
      { x: 840, y: 750, type: 'torch' },
      // Crumbled stone rubble
      { x: 250, y: 480, type: 'rubble' },
      { x: 650, y: 480, type: 'rubble' },
      { x: 370, y: 700, type: 'rubble' },
    ];

    // Rune Altar Puzzle — appears between waves 3 and 4
    this.runePuzzle = {
      active: false,
      solved: false,
      runes: [
        { x: 250, y: 350, symbol: 'fire', order: 2, stepped: false, glow: 0 },
        { x: 650, y: 350, symbol: 'earth', order: 4, stepped: false, glow: 0 },
        { x: 250, y: 550, symbol: 'water', order: 1, stepped: false, glow: 0 },
        { x: 650, y: 550, symbol: 'wind', order: 3, stepped: false, glow: 0 },
      ],
      correctOrder: ['water', 'fire', 'wind', 'earth'],
      playerSequence: [],
      hintShown: false,
      altar: { x: 435, y: 435, width: 30, height: 30, active: false },
      failFlash: 0,
    };
  }

  _generateDungeonTiles() {
    return { type: 'dungeon' };
  }

  _generateAntechamberTiles() {
    return { type: 'antechamber' };
  }

  _spawnWave(waveNum) {
    this.currentWave = waveNum;
    this.waveState = 'active';
    this.waveKills = 0;
    this.waveSpawnEffects = [];

    // Wave announcement
    const waveNames = [
      '', 
      'WAVE 1 — FIRST BLOOD', 
      'WAVE 2 — SIEGE FORMATION',
      'WAVE 3 — DARK VANGUARD',
      'WAVE 4 — INFERNAL ONSLAUGHT',
      'WAVE 5 — THE GOLEM AWAKENS',
      'WAVE 6 — HORDE OF DESPAIR',
      'WAVE 7 — ARMAGEDDON'
    ];
    this.waveAnnounceText = waveNames[waveNum] || `WAVE ${waveNum}`;
    this.waveAnnounceTimer = 120;
    this._playSound('horn');
    this.shakeAmount = 5;
    this.shakeTimer = 12;

    const spawnPoints = [
      { x: 100, y: 100 },    // 0  top-left
      { x: 780, y: 100 },   // 1  top-right
      { x: 100, y: 760 },   // 2  bottom-left
      { x: 780, y: 760 },  // 3  bottom-right
      { x: 450, y: 100 },   // 4  top-center
      { x: 100, y: 450 },   // 5  left-center
      { x: 780, y: 450 },  // 6  right-center
      { x: 250, y: 100 },   // 7  top-left-mid
      { x: 650, y: 100 },   // 8  top-right-mid
      { x: 250, y: 760 },   // 9  bottom-left-mid
      { x: 650, y: 760 },   // 10 bottom-right-mid
      { x: 450, y: 450 },   // 11 center
    ];

    const spawnWithEffect = (x, y, type, hp, dmg) => {
      this._spawnEnemy(x, y, type, hp, dmg);
      this.waveSpawnEffects.push({ x, y, timer: 30 });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        this.particles.push({
          x, y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
          life: 20, color: '#ff6644', size: 3,
        });
      }
    };

    switch (waveNum) {
      case 1: // FIRST BLOOD — Warm-up. 5 enemies.
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'knight', 35, 5);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'knight', 35, 5);
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'crossbow_archer', 25, 8);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'slime', 20, 3);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'slime', 20, 3);
        break;

      case 2: // SIEGE FORMATION — 8 enemies, all sides.
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'shield_guard', 45, 5);
        spawnWithEffect(spawnPoints[0].x + 30, spawnPoints[0].y, 'crossbow_archer', 25, 9); // adjacent to shield
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'shield_guard', 45, 5);
        spawnWithEffect(spawnPoints[1].x - 30, spawnPoints[1].y, 'crossbow_archer', 25, 9); // adjacent to shield
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'knight', 35, 5);
        spawnWithEffect(spawnPoints[3].x, spawnPoints[3].y, 'knight', 35, 5);
        spawnWithEffect(spawnPoints[11].x, spawnPoints[11].y, 'archer', 22, 7);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'berserker', 28, 6);
        break;

      case 3: // DARK VANGUARD — 7 enemies. First Dark Knights & Necromancer.
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'dark_knight', 70, 14);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'dark_knight', 70, 14);
        spawnWithEffect(spawnPoints[11].x, spawnPoints[11].y, 'necromancer', 35, 7);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'berserker', 28, 6);
        spawnWithEffect(spawnPoints[3].x, spawnPoints[3].y, 'berserker', 28, 6);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'crossbow_archer', 25, 9);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'crossbow_archer', 25, 9);
        break;

      case 4: // INFERNAL ONSLAUGHT — 9 enemies. Fire Mages & Assassins appear.
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'fire_mage', 40, 12);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'fire_mage', 40, 12);
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'dark_knight', 70, 14);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'shield_guard', 50, 6);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'assassin', 30, 11);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'berserker', 30, 7);
        spawnWithEffect(spawnPoints[11].x, spawnPoints[11].y, 'necromancer', 38, 8);
        spawnWithEffect(spawnPoints[7].x, spawnPoints[7].y, 'knight', 38, 6);
        spawnWithEffect(spawnPoints[8].x, spawnPoints[8].y, 'crossbow_archer', 28, 10);
        this.lavaPoolMaxActive = 4;
        this._showHudMessage('🔥 The dungeon burns! Lava erupts from the ground!');
        break;

      case 5: // THE GOLEM AWAKENS — 7 enemies. War Golem appears.
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'war_golem', 120, 18);
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'fire_mage', 40, 12);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'dark_knight', 75, 14);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'shield_guard', 50, 6);
        spawnWithEffect(spawnPoints[3].x, spawnPoints[3].y, 'shield_guard', 50, 6);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'crossbow_archer', 28, 10);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'crossbow_archer', 28, 10);
        this.shakeAmount = 10;
        this.shakeTimer = 30;
        this._showHudMessage('⚠️ THE GROUND TREMBLES! A WAR GOLEM APPROACHES!');
        break;

      case 6: // HORDE OF DESPAIR — 12 enemies. Largest count before finale.
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'dark_knight', 65, 13);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'dark_knight', 65, 13);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'berserker', 30, 8);
        spawnWithEffect(spawnPoints[3].x, spawnPoints[3].y, 'berserker', 30, 8);
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'fire_mage', 42, 12);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'necromancer', 40, 8);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'necromancer', 40, 8);
        spawnWithEffect(spawnPoints[7].x, spawnPoints[7].y, 'assassin', 32, 12);
        spawnWithEffect(spawnPoints[8].x, spawnPoints[8].y, 'assassin', 32, 12);
        spawnWithEffect(spawnPoints[9].x, spawnPoints[9].y, 'knight', 40, 7);
        spawnWithEffect(spawnPoints[10].x, spawnPoints[10].y, 'knight', 40, 7);
        spawnWithEffect(spawnPoints[11].x, spawnPoints[11].y, 'crossbow_archer', 30, 11);
        this.lavaPoolMaxActive = 5;
        this._showHudMessage('💀 THE HORDE DESCENDS! NO MERCY!');
        break;

      case 7: // ARMAGEDDON — 12 enemies. Captain with command aura. Final wave.
        spawnWithEffect(spawnPoints[4].x, spawnPoints[4].y, 'captain', 100, 12);
        spawnWithEffect(spawnPoints[0].x, spawnPoints[0].y, 'war_golem', 110, 16);
        spawnWithEffect(spawnPoints[1].x, spawnPoints[1].y, 'dark_knight', 80, 15);
        spawnWithEffect(spawnPoints[2].x, spawnPoints[2].y, 'dark_knight', 75, 15);
        spawnWithEffect(spawnPoints[3].x, spawnPoints[3].y, 'fire_mage', 45, 13);
        spawnWithEffect(spawnPoints[5].x, spawnPoints[5].y, 'fire_mage', 45, 13);
        spawnWithEffect(spawnPoints[6].x, spawnPoints[6].y, 'berserker', 32, 9);
        spawnWithEffect(spawnPoints[7].x, spawnPoints[7].y, 'berserker', 32, 9);
        spawnWithEffect(spawnPoints[8].x, spawnPoints[8].y, 'assassin', 35, 13);
        spawnWithEffect(spawnPoints[9].x, spawnPoints[9].y, 'necromancer', 42, 9);
        spawnWithEffect(spawnPoints[10].x, spawnPoints[10].y, 'shield_guard', 55, 8);
        spawnWithEffect(spawnPoints[11].x, spawnPoints[11].y, 'crossbow_archer', 32, 12);
        this.lavaPoolMaxActive = 6;
        this.shakeAmount = 12;
        this.shakeTimer = 40;
        this._showHudMessage('⚠️ ARMAGEDDON! The final army rises! NO HEALTH DROPS!');
        break;
    }

    this.waveEnemiesRemaining = this.enemies.filter(e => !e.dead).length;
  }

  // ─── LEVEL 4: BOSS FIGHT ─────────────────────────────────────────────
  _buildLevel4() {
    this.worldWidth = 600;
    this.worldHeight = 600;
    this.player.x = 300;
    this.player.y = 530;
    this.player.hp = Math.min(this.player.hp + 50, this.player.maxHp);

    // Safety: ensure Blades of Chaos are granted (reward from wave gauntlet)
    if (!this.player.hasWeapons.bladesOfChaos) {
      this.player.hasWeapons.bladesOfChaos = true;
      this.player.weapon = 'bladesOfChaos';
      this._showWeaponPickup('bladesOfChaos');
      this._showHudMessage('⛓️🔥 INFERNO BLADE — forged from dragon fire, your reward for surviving the gauntlet! 🔥⛓️');
    }

    this.tiles = this._generateThroneTiles(this.worldWidth, this.worldHeight);

    // Arena walls - larger and more complex
    this._addWall(0, 0, this.worldWidth, 40);
    this._addWall(0, this.worldHeight - 40, this.worldWidth, 40);
    this._addWall(0, 0, 40, this.worldHeight);
    this._addWall(this.worldWidth - 40, 0, 40, this.worldHeight);

    // Grand pillars (4 corner pillars)
    this._addWall(100, 100, 35, 35);
    this._addWall(465, 100, 35, 35);
    this._addWall(100, 465, 35, 35);
    this._addWall(465, 465, 35, 35);

    // Inner altar pillars (small, for dodging)
    this._addWall(220, 220, 20, 20);
    this._addWall(360, 220, 20, 20);
    this._addWall(220, 380, 20, 20);
    this._addWall(360, 380, 20, 20);

    // Central dais - cosmetic obstacles
    this._addWall(275, 275, 50, 50);

    // Boss sits on throne until General is defeated
    this.bossOnThrone = true;
    this.generalDefeated = false;
    this.bossAwakeningTimer = 0;
    this.bossDialogueSequence = null;
    this.bossDialogueTimer = 0;
    this.bossDialoguePhase = 0;
    
    // Spawn the General — boss's protector (positioned away from central dais)
    this._spawnEnemy(300, 350, 'general', 300, 15);
    this._showHudMessage('⚔️ The Alpha Dragon stands guard before the nest! Defeat it first! ⚔️');
    
    // Boss - The Red Death (HEAVILY BUFFED)
    this.boss = {
      x: 280, y: 55,
      width: 40, height: 40,
      hp: 1000, maxHp: 1000,
      speed: 1.2,
      dir: 'down',
      attackTimer: 0,
      attackCooldown: 80,
      phase: 1,
      invincible: 0,
      animFrame: 0,
      animTimer: 0,
      slamming: false,
      slamTimer: 0,
      summonTimer: 0,
      dying: false,
      deathTimer: 0,
      flashTimer: 0,
      dialogueTimer: 0,
      currentDialogue: null,
      dialogueDuration: 0,
      dashCharging: false,
      dashTimer: 0,
      dashDir: { x: 0, y: 0 },
      orbTimer: 0,
      curseTimer: 0,
      barrier: 0,
      barrierMax: 0,
      powerAttackCharging: false,
      powerAttackTimer: 0,
      powerAttackWarningX: 0,
      powerAttackWarningY: 0,
      rageLevel: 0,
      timeInBattle: 0,
      meteorTimer: 0,
    };
  }

  // ─── TILE GENERATION (visual only) ────────────────────────────────────
  _generateGrassTiles() {
    return { type: 'grass' };
  }
  _generateForestTiles() {
    return { type: 'forest' };
  }
  _generateCastleTiles() {
    return { type: 'castle' };
  }
  _generateThroneTiles() {
    return { type: 'throne' };
  }
  _generatePuzzleTiles() {
    return { type: 'puzzle' };
  }

  // Deterministic hash for per-tile decoration
  _tileHash(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    h = (h ^ (h >> 16)) | 0;
    return ((h & 0x7fffffff) / 0x7fffffff);
  }

  _addWall(x, y, w, h) {
    this.walls.push({ x, y, width: w, height: h });
  }

  _spawnEnemy(x, y, type, hp, dmg) {
    const speedMap = {
      dummy: 0,
      slime: 0.9,
      forest_creature: 1.0,
      archer: 0.6,
      knight: 0.9,
      shield_guard: 0.7,
      crossbow_archer: 0.5,
      berserker: 1.8,
      captain: 0.8,
      necromancer: 0.5,
      assassin: 2.2,
      dark_knight: 0.6,
      fire_mage: 0.4,
      war_golem: 0.35,
      general: 0.8,
    };
    const cooldownMap = {
      archer: 120,
      crossbow_archer: 150,
      berserker: 50,
      captain: 80,
      necromancer: 180,
      assassin: 60,
      dark_knight: 70,
      fire_mage: 100,
      war_golem: 200,
      general: 60,
    };
    const aggroMap = {
      dummy: 0,
      archer: 180,
      crossbow_archer: 200,
      berserker: 200,
      captain: 160,
      necromancer: 220,
      assassin: 180,
      dark_knight: 150,
      fire_mage: 200,
      war_golem: 160,
      general: 300,
    };
    const sizeMap = { general: 30, war_golem: 24 };
    const eWidth = sizeMap[type] || 20;
    const eHeight = sizeMap[type] || 20;
    this.enemies.push({
      x, y, width: eWidth, height: eHeight,
      type, hp, maxHp: hp, damage: dmg,
      speed: speedMap[type] !== undefined ? speedMap[type] : 0.9,
      dir: 'down',
      attackTimer: 0,
      attackCooldown: cooldownMap[type] || 90,
      invincible: 0,
      animFrame: 0,
      animTimer: 0,
      aggroRange: aggroMap[type] !== undefined ? aggroMap[type] : 120,
      flashTimer: 0,
      dead: false,
      // Shield guard specific
      shieldDir: type === 'shield_guard' ? 'down' : null,
      // Captain specific - buffs nearby allies
      isCaptain: type === 'captain',
      buffAura: type === 'captain',
      // Berserker - charges
      charging: false,
      chargeTimer: 0,
      chargeDir: { x: 0, y: 0 },
      // Necromancer - summons minions
      summonTimer: type === 'necromancer' ? 0 : null,
      summonCooldown: type === 'necromancer' ? 300 : null,
      // Assassin - teleports
      teleportTimer: type === 'assassin' ? 0 : null,
      teleportCooldown: type === 'assassin' ? 180 : null,
      teleporting: false,
      teleportPhase: 0,
      // Dark Knight - heavy cleave
      cleaveTimer: type === 'dark_knight' ? 0 : null,
      cleaveCooldown: type === 'dark_knight' ? 120 : null,
      cleaving: false,
      cleavePhase: 0,
      // Fire Mage - fire wave
      fireTimer: type === 'fire_mage' ? 0 : null,
      fireCooldown: type === 'fire_mage' ? 160 : null,
      casting: false,
      castPhase: 0,
      // War Golem - ground pound
      poundTimer: type === 'war_golem' ? 0 : null,
      poundCooldown: type === 'war_golem' ? 250 : null,
      pounding: false,
      poundPhase: 0,
    });
  }

  // ─── PLAYER ACTIONS ───────────────────────────────────────────────────
  _playerAttack() {
    if (this.player.attackCooldown > 0 || this.showingPasswordUI || this.transitioning || this.showingHelp) return;

    if (this.player.weapon === 'sword') {
      this.player.attacking = true;
      this.player.attackTimer = this.player.attackDuration;
      this.player.attackCooldown = 15;
      this._playSound('sword');
      this._swordHitCheck();
    } else if (this.player.weapon === 'bow') {
      if (this.player.bowCooldown > 0) return;
      this.player.bowCooldown = 25;
      this._playSound('bow');
      this._shootArrow();
    } else if (this.player.weapon === 'spear') {
      if (this.player.spearCooldown > 0) return;
      this.player.spearCooldown = 35;
      this._playSound('sword');
      this._spearThrust();
    } else if (this.player.weapon === 'halberd') {
      if (this.player.halberdCooldown > 0) return;
      this.player.halberdCooldown = 45; // Slower but powerful
      this._playSound('slam');
      this._halberdSwing();
    } else if (this.player.weapon === 'bladesOfChaos') {
      this._bladesQuickSlash();
    }
  }

  _swordHitCheck() {
    const p = this.player;
    const range = 32;
    let hitBox;

    switch (p.dir) {
      case 'up': hitBox = { x: p.x - 10, y: p.y - range, width: p.width + 20, height: range }; break;
      case 'down': hitBox = { x: p.x - 10, y: p.y + p.height, width: p.width + 20, height: range }; break;
      case 'left': hitBox = { x: p.x - range, y: p.y - 10, width: range, height: p.height + 20 }; break;
      case 'right': hitBox = { x: p.x + p.width, y: p.y - 10, width: range, height: p.height + 20 }; break;
    }

    const dmg = this.player.dmgBoost ? 25 : 15;

    // Check enemies
    this.enemies.forEach(e => {
      if (e.dead || e.invincible > 0) return;
      if (this._rectsOverlap(hitBox, e)) {
        this._damageEnemy(e, dmg);
      }
    });

    // Check boss
    if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
      if (this._rectsOverlap(hitBox, this.boss)) {
        this._damageBoss(dmg);
      }
    }
  }

  _shootArrow() {
    const p = this.player;
    const speed = 5;
    let vx = 0, vy = 0;
    switch (p.dir) {
      case 'up': vy = -speed; break;
      case 'down': vy = speed; break;
      case 'left': vx = -speed; break;
      case 'right': vx = speed; break;
    }
    this.player.arrows.push({
      x: p.x + p.width / 2, y: p.y + p.height / 2,
      vx, vy, life: 80,
    });
  }
  
  _spearThrust() {
    const p = this.player;
    const range = 48; // Longer range than sword
    let hitBox;

    switch (p.dir) {
      case 'up': hitBox = { x: p.x - 8, y: p.y - range, width: p.width + 16, height: range }; break;
      case 'down': hitBox = { x: p.x - 8, y: p.y + p.height, width: p.width + 16, height: range }; break;
      case 'left': hitBox = { x: p.x - range, y: p.y - 8, width: range, height: p.height + 16 }; break;
      case 'right': hitBox = { x: p.x + p.width, y: p.y - 8, width: range, height: p.height + 16 }; break;
    }

    const dmg = this.player.dmgBoost ? 30 : 20; // More damage than sword

    // Check enemies
    this.enemies.forEach(e => {
      if (e.dead || e.invincible > 0) return;
      if (this._rectsOverlap(hitBox, e)) {
        this._damageEnemy(e, dmg);
      }
    });

    // Check boss
    if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
      if (this._rectsOverlap(hitBox, this.boss)) {
        this._damageBoss(dmg);
      }
    }
    
    // Visual thrust effect
    this.player.attacking = true;
    this.player.attackTimer = 20;
  }

  _halberdSwing() {
    const p = this.player;
    const range = 50; // 360-degree spin radius
    
    const dmg = this.player.dmgBoost ? 35 : 25; // High damage
    const knockback = 20; // Strong knockback

    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    // Check all enemies in radius (360-degree attack)
    this.enemies.forEach(e => {
      if (e.dead || e.invincible > 0) return;
      
      const ex = e.x + e.width / 2;
      const ey = e.y + e.height / 2;
      const dist = Math.hypot(ex - cx, ey - cy);
      
      if (dist <= range) {
        // Halberd ignores shield guards' frontal shield
        this._damageEnemy(e, dmg);
        // Extra knockback outward from player
        const dx = ex - cx;
        const dy = ey - cy;
        const d = dist || 1;
        e.x += (dx / d) * knockback;
        e.y += (dy / d) * knockback;
        e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
        e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
      }
    });

    // Check boss
    if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
      const bx = this.boss.x + this.boss.width / 2;
      const by = this.boss.y + this.boss.height / 2;
      const dist = Math.hypot(bx - cx, by - cy);
      
      if (dist <= range) {
        this._damageBoss(dmg);
      }
    }

    // Visual 360-degree spin effect
    this.player.attacking = true;
    this.player.attackTimer = 25;
    this.shakeAmount = 4;
    this.shakeTimer = 8;

    // Full circle particle effect (360 degrees)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: cx + Math.cos(angle) * 20,
        y: cy + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 15, color: '#88ffaa', size: 3,
      });
    }
  }

  _playerSpecialAttack() {
    const p = this.player;
    p.specialCooldown = 240; // 4 seconds at 60fps
    p.specialReady = false;
    this._playSound('slam');
    this.shakeAmount = 6;
    this.shakeTimer = 12;

    // AoE around player
    const range = 80;
    const dmg = this.player.dmgBoost ? 35 : 22;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    this.enemies.forEach(e => {
      if (e.dead) return;
      const ex = e.x + e.width / 2;
      const ey = e.y + e.height / 2;
      const dist = Math.hypot(ex - cx, ey - cy);
      if (dist < range) {
        this._damageEnemy(e, dmg);
      }
    });

    if (this.boss && !this.boss.dying) {
      const bx = this.boss.x + this.boss.width / 2;
      const by = this.boss.y + this.boss.height / 2;
      if (Math.hypot(bx - cx, by - cy) < range) {
        this._damageBoss(dmg);
      }
    }

    // Visual burst
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 30, color: '#ffdd44', size: 3,
      });
    }
  }

  // ─── BLADES OF CHAOS — LEGENDARY WEAPON ──────────────────────────────
  _bladesQuickSlash() {
    const p = this.player;
    if (p.bladesOfChaosCooldown > 0) return;
    
    p.bladesCombo = (p.bladesComboTimer > 0) ? Math.min(p.bladesCombo + 1, 3) : 1;
    p.bladesComboTimer = 25; // combo window
    p.attacking = true;
    p.attackTimer = 12;
    p.bladesOfChaosCooldown = 8; // Very fast attacks
    this._playSound('sword');
    
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const range = 55; // Longer than sword due to chain reach
    
    // Damage scales with combo: hit 1=18, hit 2=24, hit 3=35 (finisher)
    const baseDmg = p.bladesCombo === 3 ? 35 : (p.bladesCombo === 2 ? 24 : 18);
    const dmg = p.dmgBoost ? Math.floor(baseDmg * 1.5) : baseDmg;
    
    // Directional hit with wide arc
    let hitBox;
    const arcWidth = 40;
    switch (p.dir) {
      case 'up':    hitBox = { x: cx - arcWidth, y: cy - range, width: arcWidth * 2, height: range }; break;
      case 'down':  hitBox = { x: cx - arcWidth, y: cy, width: arcWidth * 2, height: range }; break;
      case 'left':  hitBox = { x: cx - range, y: cy - arcWidth, width: range, height: arcWidth * 2 }; break;
      case 'right': hitBox = { x: cx, y: cy - arcWidth, width: range, height: arcWidth * 2 }; break;
    }
    
    this.enemies.forEach(e => {
      if (e.dead || e.invincible > 0) return;
      if (this._rectsOverlap(hitBox, e)) {
        this._damageEnemy(e, dmg);
        // Combo 3 finisher: extra knockback + fire
        if (p.bladesCombo === 3) {
          const ex = e.x + e.width / 2;
          const ey = e.y + e.height / 2;
          const d = Math.hypot(ex - cx, ey - cy) || 1;
          e.x += ((ex - cx) / d) * 25;
          e.y += ((ey - cy) / d) * 25;
          e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
          e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
        }
      }
    });
    
    if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
      if (this._rectsOverlap(hitBox, this.boss)) {
        this._damageBoss(dmg);
      }
    }
    
    // Fire slash particles (color depends on combo)
    const colors = ['#ff6600', '#ff3300', '#ffff00'];
    const count = p.bladesCombo === 3 ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (p.dir === 'up' ? -Math.PI / 2 : p.dir === 'down' ? Math.PI / 2 : p.dir === 'left' ? Math.PI : 0);
      const spread = (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 20, color: colors[p.bladesCombo - 1], size: 2 + Math.random() * 2,
      });
    }
    
    // Screen shake on finisher
    if (p.bladesCombo === 3) {
      this.shakeAmount = 5;
      this.shakeTimer = 8;
      p.bladesCombo = 0;
    }
  }
  
  _bladesSpinningFury(chargeTime) {
    const p = this.player;
    this._playSound('slam');
    
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    
    // Charge determines power: 30-60 frames = normal, 60+ = max
    const chargeLevel = Math.min(chargeTime, 90);
    const spinRange = 60 + Math.floor(chargeLevel * 0.5); // 75-105 range
    const spinDmg = p.dmgBoost ? Math.floor(55 + chargeLevel * 0.6) : Math.floor(40 + chargeLevel * 0.4); // 40-76 damage
    const spinHits = chargeLevel >= 60 ? 3 : 2; // how many spin hits
    
    p.attacking = true;
    p.attackTimer = 30;
    p.bladesOfChaosCooldown = 30;
    
    // Spin attack animation state
    p.bladesSpinning = true;
    p.bladesSpinTimer = 30;
    p.bladesSpinRange = spinRange;
    
    // Hit all enemies in radius — massive AoE
    this.enemies.forEach(e => {
      if (e.dead || e.invincible > 0) return;
      const ex = e.x + e.width / 2;
      const ey = e.y + e.height / 2;
      const dist = Math.hypot(ex - cx, ey - cy);
      if (dist <= spinRange) {
        this._damageEnemy(e, spinDmg);
        // Fling enemies outward
        const d = dist || 1;
        const fling = 30 + chargeLevel * 0.3;
        e.x += ((ex - cx) / d) * fling;
        e.y += ((ey - cy) / d) * fling;
        e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
        e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
      }
    });
    
    // Boss
    if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
      const bx = this.boss.x + this.boss.width / 2;
      const by = this.boss.y + this.boss.height / 2;
      if (Math.hypot(bx - cx, by - cy) <= spinRange) {
        this._damageBoss(spinDmg);
      }
    }
    
    // Massive fire vortex particles
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const r = spinRange * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: cx + Math.cos(angle) * r * 0.5,
        y: cy + Math.sin(angle) * r * 0.5,
        vx: Math.cos(angle) * 4 + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * 4 + (Math.random() - 0.5) * 2,
        life: 30 + Math.random() * 20,
        color: ['#ff2200', '#ff5500', '#ff8800', '#ffcc00', '#ffff66'][Math.floor(Math.random() * 5)],
        size: 3 + Math.random() * 3,
      });
    }
    
    // Ground fire ring
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: cx + Math.cos(angle) * spinRange,
        y: cy + Math.sin(angle) * spinRange,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        life: 40, color: '#ff4400', size: 4,
      });
    }
    
    this.shakeAmount = 8 + Math.floor(chargeLevel * 0.1);
    this.shakeTimer = 20;
    
    // Show power message
    if (chargeLevel >= 60) {
      this._showHudMessage('🔥⛓️ CHAOS FURY — MAXIMUM DEVASTATION! ⛓️🔥');
    } else {
      this._showHudMessage('🔥 Blades of Chaos — Spinning Fury! 🔥');
    }
  }

  _triggerLavaAttack() {
    if (!this.boss || !this.boss.dying) return;
    this.player.lavaAttackReady = false;
    this.boss.lavaAttackPhase = 1;
    this.boss.lavaAttackTimer = 0;
    this._showHudMessage('🔥 LAVA STRIKE! 🔥');
    this._playSound('slam');
    this.shakeAmount = 15;
    this.shakeTimer = 120;
  }

  _interact() {
    const p = this.player;
    
    // In puzzle level, use viewport visibility — interact with closest visible NPC
    if (this.level === 2.5 && !this.puzzleSolved) {
      const vpW = this.width / this.scale;
      const vpH = this.height / this.scale;
      const camCX = this.camera.x + vpW / 2;
      const camCY = this.camera.y + vpH / 2;
      
      let closestNpc = null;
      let closestDist = Infinity;
      this.npcs.forEach(npc => {
        const nx = npc.x + npc.width / 2;
        const ny = npc.y + npc.height / 2;
        // Check if NPC is visible on screen
        if (nx >= this.camera.x && nx <= this.camera.x + vpW &&
            ny >= this.camera.y && ny <= this.camera.y + vpH) {
          const dist = Math.hypot(camCX - nx, camCY - ny);
          if (dist < closestDist) {
            closestNpc = npc;
            closestDist = dist;
          }
        }
      });
      if (closestNpc) {
        closestNpc.interacted = true;
        this._showHudMessage(`${closestNpc.name}: ${closestNpc.dialogue}`);
        this._playSound('pickup');
      }
      
      // Also check gates on puzzle level
      const px = camCX;
      const py = camCY;
      this.gates.forEach(g => {
        if (g.open) return;
        const gx = g.x + g.width / 2;
        const gy = g.y + g.height / 2;
        if (gx >= this.camera.x && gx <= this.camera.x + vpW &&
            gy >= this.camera.y && gy <= this.camera.y + vpH) {
          if (g.requirePuzzle && !this.puzzleSolved) {
            this._showHudMessage('The passage is sealed! Restore power to the Dragon Eye to open it!');
          } else if (g.requirePuzzle && this.puzzleSolved) {
            g.open = true;
            this._playSound('gate');
            this._showHudMessage('The passage opens! Onward to Dragon Island!');
          }
        }
      });
      return;
    }
    
    let px = p.x + p.width / 2;
    let py = p.y + p.height / 2;

    // Check NPCs
    this.npcs.forEach(npc => {
      const nx = npc.x + npc.width / 2;
      const ny = npc.y + npc.height / 2;
      if (Math.hypot(px - nx, py - ny) < 80) {
        npc.interacted = true;
        this._showHudMessage(`${npc.name}: ${npc.dialogue}`);
        this._playSound('pickup');
      }
    });

    // Check gates
    this.gates.forEach(g => {
      if (g.open) return;
      const gx = g.x + g.width / 2;
      const gy = g.y + g.height / 2;
      if (Math.hypot(px - gx, py - gy) < 60) {
        if (g.requirePuzzle && !this.puzzleSolved) {
          this._showHudMessage('The passage is sealed! Restore power to the Dragon Eye to open it!');
        } else if (g.requirePassword) {
          this._showPasswordUI();
        } else if (g.requireWaves) {
          if (this.wavesCleared) {
            g.open = true;
            this._playSound('gate');
            this._showHudMessage('The gate opens! The Red Death awaits!');
          } else if (this.waveState === 'idle') {
            this.waveState = 'pause';
            this.wavePauseTimer = 60;
            this._showHudMessage('⚔️ The Infernal Dungeon Gauntlet begins! Survive all 7 waves!');
            this._playSound('horn');
          } else {
            this._showHudMessage(`Survive all ${this.totalWaves} waves to open this gate!`);
          }
        } else if (g.requireClear) {
          const alive = this.enemies.filter(e => !e.dead).length;
          if (alive === 0) {
            g.open = true;
            this._playSound('gate');
            this._showHudMessage('Gate opened!');
          } else {
            this._showHudMessage(`Defeat all enemies first! (${alive} remaining)`);
          }
        } else if (g.requireKills) {
          const killed = this.enemies.filter(e => e.dead).length;
          if (killed >= g.requireKills) {
            g.open = true;
            this._playSound('gate');
            this._showHudMessage('Gate opened!');
          } else {
            this._showHudMessage(`Defeat more enemies! (${killed}/${g.requireKills})`);
          }
        }
      }
    });

    // Check castle keeper
    if (this.castleKeeper) {
      const kx = this.castleKeeper.x + this.castleKeeper.width / 2;
      const ky = this.castleKeeper.y + this.castleKeeper.height / 2;
      if (Math.hypot(px - kx, py - ky) < 50) {
        this._showPasswordUI();
      }
    }
  }

  // ─── PASSWORD UI ──────────────────────────────────────────────────────
  _showPasswordUI() {
    if (this.showingPasswordUI) return;
    this.showingPasswordUI = true;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 10001;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Courier New', monospace;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #1a0a2e; border: 3px solid #8866ff;
      border-radius: 12px; padding: 30px 40px;
      text-align: center; max-width: 400px;
      box-shadow: 0 0 40px rgba(136,102,255,0.4);
    `;

    let hintText = '';
    if (this.passwordAttempts === 1) {
      hintText = '<div style="color:#ffaa44;margin-top:10px;font-size:14px;">Hint: The name of a Night Fury...</div>';
    } else if (this.passwordAttempts === 2) {
      hintText = '<div style="color:#ffaa44;margin-top:10px;font-size:14px;">Hint: Hiccup\'s best friend 🐉</div>';
    } else if (this.passwordAttempts >= 3) {
      hintText = '<div style="color:#ff6644;margin-top:10px;font-size:14px;">Hint: The dragon who lost a tail fin... all lowercase 🐾</div>';
    }

    box.innerHTML = `
      <div style="font-size:18px;color:#ddbbff;margin-bottom:8px;">🐉 Dragon Island Gatekeeper</div>
      <div style="font-size:14px;color:#aa88dd;margin-bottom:15px;">
        "Halt, Viking! Only those who know the password may enter the Dragon's Lair!"
      </div>
      ${hintText}
      <input type="text" maxlength="10" placeholder="Enter password..." 
        style="width:100%;padding:12px;font-size:18px;background:#0a0020;
        border:2px solid #6644aa;color:#eeddff;border-radius:8px;
        text-align:center;font-family:'Courier New',monospace;
        margin-top:15px;outline:none;" />
      <div style="display:flex;gap:10px;margin-top:15px;">
        <button id="pw-submit" style="flex:1;padding:10px;font-size:14px;
          background:#6644aa;border:none;color:#fff;border-radius:8px;
          cursor:pointer;font-family:'Courier New',monospace;">Submit</button>
        <button id="pw-cancel" style="flex:1;padding:10px;font-size:14px;
          background:#332244;border:1px solid #6644aa;color:#aa88dd;
          border-radius:8px;cursor:pointer;font-family:'Courier New',monospace;">Cancel</button>
      </div>
    `;

    overlay.appendChild(box);
    this.container.appendChild(overlay);
    this.passwordUI = overlay;

    const input = box.querySelector('input');
    setTimeout(() => input.focus(), 100);

    const submit = () => {
      const val = input.value.trim();
      if (val === 'toothless') {
        // Correct!
        this._closePasswordUI();
        this.gates.forEach(g => {
          if (g.requirePassword) g.open = true;
        });
        this._playSound('victory');
        this._showHudMessage('The gate opens! Enter the Dragon\'s Lair!');
      } else {
        this.passwordAttempts++;
        this._closePasswordUI();
        this._playSound('hit');
        this._showHudMessage('Wrong password! Talk to the gatekeeper again.');
      }
    };

    box.querySelector('#pw-submit').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter') submit();
      if (e.code === 'Escape') this._closePasswordUI();
    });
    box.querySelector('#pw-cancel').addEventListener('click', () => this._closePasswordUI());
  }

  _closePasswordUI() {
    if (this.passwordUI) {
      this.passwordUI.remove();
      this.passwordUI = null;
    }
    this.showingPasswordUI = false;
  }

  // ─── DAMAGE ───────────────────────────────────────────────────────────
  _damageEnemy(e, dmg) {
    // Shield guard frontal immunity (only for sword, not halberd/spear/arrows)
    if (e.type === 'shield_guard' && this.player.weapon === 'sword') {
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      const ex = e.x + e.width / 2;
      const ey = e.y + e.height / 2;
      const attackFromDir = px < ex ? 'left' : px > ex ? 'right' : py < ey ? 'up' : 'down';
      // Shield faces toward player
      if (attackFromDir === e.dir || (e.shieldDir && attackFromDir === e.shieldDir)) {
        // Blocked!
        this.damageNumbers.push({
          x: e.x + e.width / 2, y: e.y - 5,
          text: 'BLOCKED!', life: 40, color: '#4488ff',
        });
        this._playSound('pickup');
        return;
      }
    }

    e.hp -= dmg;
    e.invincible = 15;
    e.flashTimer = 10;
    this._playSound('hit');

    // Lifesteal: heal player on hit
    if (this.player.lifestealActive) {
      const healAmt = Math.ceil(dmg * 0.2);
      this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
      this.damageNumbers.push({
        x: this.player.x + this.player.width / 2, y: this.player.y - 15,
        text: `+${healAmt}`, life: 30, color: '#44ff88',
      });
    }

    // Knockback
    const dx = e.x - this.player.x;
    const dy = e.y - this.player.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.x += (dx / dist) * 12;
    e.y += (dy / dist) * 12;
    // Keep within bounds
    e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
    e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));

    // Damage number
    this.damageNumbers.push({
      x: e.x + e.width / 2, y: e.y - 5,
      text: dmg.toString(), life: 40, color: '#ffff44',
    });

    // Particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: e.x + e.width / 2, y: e.y + e.height / 2,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        life: 15, color: '#ff4444', size: 2,
      });
    }

    if (e.hp <= 0) {
      e.dead = true;
      this._playSound('death');
      // Death particles
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: e.x + e.width / 2, y: e.y + e.height / 2,
          vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
          life: 30, color: '#aa44ff', size: 3,
        });
      }
      // General defeated — awaken the boss!
      if (e.type === 'general') {
        this.generalDefeated = true;
        this.bossOnThrone = false;
        this.bossAwakeningTimer = 180; // 3 seconds of awakening
        this.shakeAmount = 12;
        this.shakeTimer = 60;
        this._playSound('horn');
        this._showHudMessage('💀 THE ALPHA DRAGON FALLS! The Red Death rises from its nest! 💀');
        // Massive particles from throne
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          this.particles.push({
            x: 300, y: 75,
            vx: Math.cos(angle) * (2 + Math.random() * 4),
            vy: Math.sin(angle) * (2 + Math.random() * 4),
            life: 50, color: ['#ff0000', '#ff4400', '#880000', '#ffaa00'][i % 4], size: 3,
          });
        }
        // Drop health for the player to prepare
        this.pickups.push({ x: 200, y: 300, type: 'health', collected: false });
        this.pickups.push({ x: 400, y: 300, type: 'health', collected: false });
        this.pickups.push({ x: 300, y: 450, type: 'shield', collected: false });
      }
      // Tough enemy drops in wave mode
      if (this.waveLevel) {
        const toughTypes = ['dark_knight', 'fire_mage', 'war_golem', 'berserker', 'captain', 'necromancer', 'assassin'];
        // Wave 7: ALL enemies drop health at high rate
        const isWave7 = this.currentWave >= 7;
        if (toughTypes.includes(e.type)) {
          // Shield drop from tough enemies (60% chance, 80% in wave 7)
          if (Math.random() < (isWave7 ? 0.8 : 0.6)) {
            this.pickups.push({
              x: e.x + e.width / 2, y: e.y + e.height / 2,
              type: 'shield', collected: false,
            });
          }
          // Health drop from tough enemies in wave 7 (70% chance)
          if (isWave7 && Math.random() < 0.7) {
            this.pickups.push({
              x: e.x + e.width / 2 - 15, y: e.y + e.height / 2 + 10,
              type: 'health', collected: false,
            });
          }
          // New powerup drops from tough enemies
          const roll = Math.random();
          if (roll < 0.2) {
            this.pickups.push({
              x: e.x + e.width / 2 + 10, y: e.y + e.height / 2,
              type: 'lifesteal', collected: false,
            });
          } else if (roll < 0.35) {
            this.pickups.push({
              x: e.x + e.width / 2 - 10, y: e.y + e.height / 2,
              type: 'thorns', collected: false,
            });
          } else if (roll < 0.5) {
            this.pickups.push({
              x: e.x + e.width / 2 + 15, y: e.y + e.height / 2,
              type: 'rage', collected: false,
            });
          }
        }
        // Regular enemies: higher health drop chance in wave 7
        const regularDropChance = isWave7 ? 0.5 : 0.15;
        if (!toughTypes.includes(e.type) && Math.random() < regularDropChance) {
          this.pickups.push({
            x: e.x + e.width / 2, y: e.y + e.height / 2,
            type: 'health', collected: false,
          });
        }
      }
    }
  }

  _damageBoss(dmg) {
    if (!this.boss || this.boss.dying) return;
    // Boss is immune while on throne
    if (this.bossOnThrone) {
      this.damageNumbers.push({
        x: this.boss.x + this.boss.width / 2, y: this.boss.y - 8,
        text: 'IMMUNE!', life: 40, color: '#8800ff',
      });
      this._showHudMessage('Defeat the General first!');
      return;
    }
    
    // Barrier shield absorbs damage first
    if (this.boss.barrier > 0) {
      const absorbed = Math.min(this.boss.barrier, dmg);
      this.boss.barrier -= absorbed;
      dmg -= absorbed;
      
      // Barrier damage feedback
      this.damageNumbers.push({
        x: this.boss.x + this.boss.width / 2, y: this.boss.y - 20,
        text: `-${absorbed} SHIELD`, life: 40, color: '#00ccff',
      });
      
      // Barrier break effect
      if (this.boss.barrier <= 0) {
        this._showHudMessage('💥 BARRIER BROKEN! 💥');
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          this.particles.push({
            x: this.boss.x + this.boss.width / 2,
            y: this.boss.y + this.boss.height / 2,
            vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
            life: 25, color: '#00ddff', size: 3,
          });
        }
        this._playSound('gate');
      } else {
        // Barrier still active - show shield particles
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: this.boss.x + this.boss.width / 2 + Math.cos(angle) * 30,
            y: this.boss.y + this.boss.height / 2 + Math.sin(angle) * 30,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
            life: 15, color: '#00aaff', size: 2,
          });
        }
      }
      
      if (dmg <= 0) return; // All damage absorbed
    }
    
    this.boss.hp -= dmg;
    this.boss.invincible = 20;
    this.boss.flashTimer = 12;
    this._playSound('bosshit');

    // Damage number
    this.damageNumbers.push({
      x: this.boss.x + this.boss.width / 2, y: this.boss.y - 8,
      text: dmg.toString(), life: 50, color: '#ff4444',
    });

    // Particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.boss.x + this.boss.width / 2, y: this.boss.y + this.boss.height / 2,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
        life: 20, color: '#ff8844', size: 3,
      });
    }
    
    // Boss drops shields when damaged (20% chance)
    if (Math.random() < 0.2) {
      this.pickups.push({
        x: this.boss.x + (Math.random() - 0.5) * 60,
        y: this.boss.y + (Math.random() - 0.5) * 60,
        type: 'shield',
        collected: false
      });
    }

    // Phase transitions (adjusted for 1000 HP)
    const hpPct = this.boss.hp / this.boss.maxHp;
    if (hpPct <= 0.85 && this.boss.phase === 1) {
      this.boss.phase = 1.5;
      this.bossPhase = 1.5;
      this._showHudMessage('🛡️ BARRIER ACTIVATED! Break through the shield! 🛡️');
      this.boss.barrier = 150;
      this.boss.barrierMax = 150;
      this.shakeAmount = 4;
      this.shakeTimer = 15;
      // Barrier activation particles
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        this.particles.push({
          x: this.boss.x + this.boss.width / 2,
          y: this.boss.y + this.boss.height / 2,
          vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
          life: 30, color: '#00aaff', size: 3,
        });
      }
    } else if (hpPct <= 0.65 && this.boss.phase <= 1.5) {
      this.boss.phase = 2;
      this.bossPhase = 2;
      this.boss.speed = 1.6;
      this.boss.attackCooldown = 55;
      this._showHudMessage('⚡ PHASE 2! The Red Death grows stronger! ⚡');
      this.shakeAmount = 6;
      this.shakeTimer = 20;
      this.pickups.push({
        x: this.boss.x + 50,
        y: this.boss.y + 50,
        type: 'shield',
        collected: false
      });
      this.pickups.push({
        x: this.boss.x - 50,
        y: this.boss.y - 30,
        type: 'health',
        collected: false
      });
    } else if (hpPct <= 0.40 && this.boss.phase === 2) {
      this.boss.phase = 3;
      this.bossPhase = 3;
      this.boss.speed = 2.0;
      this.boss.attackCooldown = 35;
      this._showHudMessage('🔥 PHASE 3! The beast is enraged! 🔥');
      this.shakeAmount = 10;
      this.shakeTimer = 30;
      this.pickups.push({
        x: this.boss.x - 50,
        y: this.boss.y + 50,
        type: 'shield',
        collected: false
      });
      this.pickups.push({
        x: this.boss.x + 60,
        y: this.boss.y - 40,
        type: 'health',
        collected: false
      });
      this.pickups.push({
        x: this.boss.x - 60,
        y: this.boss.y - 40,
        type: 'health',
        collected: false
      });
    } else if (hpPct <= 0.18 && this.boss.phase === 3) {
      this.boss.phase = 4;
      this.bossPhase = 4;
      this.boss.speed = 2.5;
      this.boss.attackCooldown = 25;
      this._showHudMessage('⚠️ PHASE 4! BERSERK MODE ACTIVATED! ⚠️');
      this.shakeAmount = 15;
      this.shakeTimer = 60;
      // Spawn dark energy particles
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        this.particles.push({
          x: this.boss.x + this.boss.width / 2,
          y: this.boss.y + this.boss.height / 2,
          vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
          life: 40, color: '#ff0000', size: 4,
        });
      }
      this.pickups.push({
        x: this.boss.x + 70,
        y: this.boss.y + 70,
        type: 'health',
        collected: false
      });
      this.pickups.push({
        x: this.boss.x - 70,
        y: this.boss.y - 50,
        type: 'health',
        collected: false
      });
      this.pickups.push({
        x: 100,
        y: 100,
        type: 'health',
        collected: false
      });
    } else if (hpPct <= 0.06 && this.boss.phase === 4) {
      this.boss.phase = 5;
      this.bossPhase = 5;
      this.boss.speed = 3.0;
      this.boss.attackCooldown = 18;
      this._showHudMessage('💀 FINAL STAND! ULTIMATE DESPERATION MODE! 💀');
      this.shakeAmount = 20;
      this.shakeTimer = 90;
      // Massive explosion of particles
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        this.particles.push({
          x: this.boss.x + this.boss.width / 2,
          y: this.boss.y + this.boss.height / 2,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 50, color: ['#ff0000', '#ff00ff', '#ffffff'][Math.floor(Math.random() * 3)], size: 5,
        });
      }
      // Spawn emergency health
      this.pickups.push({
        x: this.worldWidth / 2,
        y: this.worldHeight - 100,
        type: 'health',
        collected: false
      });
      this.pickups.push({
        x: this.worldWidth - 100,
        y: this.worldHeight - 100,
        type: 'health',
        collected: false
      });
    }

    if (this.boss.hp <= 0) {
      this._bossDefeated();
    }
  }

  _damagePlayer(dmg) {
    if (this.player.invincible > 0) return;
    
    // Complete immunity with shield in boss fight (Level 4)
    if (this.player.shieldActive && this.level === 4) {
      // Show blocked message
      this.damageNumbers.push({
        x: this.player.x + this.player.width / 2, y: this.player.y - 5,
        text: 'BLOCKED!', life: 40, color: '#4488ff',
      });
      this._playSound('pickup'); // Shield block sound
      return;
    }
    
    const actual = this.player.shieldActive ? Math.ceil(dmg / 2) : dmg;
    this.player.hp -= actual;
    this.player.invincible = 45;
    this._playSound('hit');

    // Thorns: reflect damage back to nearby enemies  
    if (this.player.thornsActive) {
      const px = this.player.x + this.player.width / 2;
      const py = this.player.y + this.player.height / 2;
      this.enemies.forEach(en => {
        if (en.dead) return;
        const ed = Math.hypot(en.x + en.width / 2 - px, en.y + en.height / 2 - py);
        if (ed < 50) {
          en.hp -= Math.ceil(actual * 0.5);
          en.flashTimer = 8;
          this.damageNumbers.push({
            x: en.x + en.width / 2, y: en.y - 5,
            text: Math.ceil(actual * 0.5).toString(), life: 30, color: '#44ddaa',
          });
          // Thorn particles
          for (let tp = 0; tp < 3; tp++) {
            this.particles.push({
              x: en.x + en.width / 2, y: en.y + en.height / 2,
              vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
              life: 12, color: '#44ff88', size: 2,
            });
          }
          if (en.hp <= 0) { en.dead = true; this._playSound('death'); }
        }
      });
    }

    // Damage number on player
    this.damageNumbers.push({
      x: this.player.x + this.player.width / 2, y: this.player.y - 5,
      text: actual.toString(), life: 40, color: '#ff0000',
    });

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this._playerDeath();
    }
  }

  _playerDeath() {
    this._playSound('death');
    this.shakeAmount = 10;
    this.shakeTimer = 20;

    // Save wave progress so player resumes from same wave
    const savedWave = this.waveLevel ? this.currentWave : 0;
    const savedWaveState = this.waveState;
    const savedWeapons = { ...this.player.hasWeapons };
    const savedWeapon = this.player.weapon;

    // Respawn after a moment — in the same level
    setTimeout(() => {
      this.player.hp = this.player.maxHp;
      this._loadLevel(this.level);
      // Restore weapons
      this.player.hasWeapons = savedWeapons;
      this.player.weapon = savedWeapon;
      // Restore wave progress — resume from the wave you died on
      if (savedWave > 0 && this.waveLevel) {
        this.currentWave = savedWave - 1; // Will increment when spawning
        this.waveState = 'pause';
        this.wavePauseTimer = 120;
        this._showHudMessage(`Resuming from Wave ${savedWave}... Get ready!`);
      }
    }, 1500);
  }

  _bossDefeated() {
    this.boss.dying = true;
    this.boss.deathTimer = 480; // Extended for dialogue + lava attack
    this._playSound('victory');
    this.shakeAmount = 12;
    this.shakeTimer = 60;
    
    // Boss dialogue sequence before death
    this.bossDialogueSequence = [
      { timer: 30, speaker: 'boss', text: '"No... this cannot be..."' },
      { timer: 150, speaker: 'hero', text: '"It\'s over. Release Toothless!"' },
      { timer: 270, speaker: 'boss', text: '"You think you\'ve won? I AM the Red Death!"' },
      { timer: 390, speaker: 'hero', text: '"I came for my dragon. Nothing stops me."' },
      { timer: 510, speaker: 'boss', text: '"Curse you, Viking... CURSE YOUUUUU!"' },
    ];
    this.bossDialogueTimer = 0;
    this.bossDialoguePhase = 0;
    this.bossDialogueText = null;
    this.bossDialogueSpeaker = null;
    
    this._showHudMessage('🔥 THE BEAST FALLS! 🔥');
    // Auto-trigger the lava attack after dialogue
    setTimeout(() => {
      this._triggerLavaAttack();
    }, 4000);
  }

  // ─── MAIN GAME LOOP ──────────────────────────────────────────────────
  _gameLoop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._gameLoop());

    this.frame++;
    this.elapsed += 1 / 60;

    if (this.transitioning) {
      this.transitionTimer--;
      if (this.transitionTimer <= 60) {
        this.transitionAlpha = this.transitionTimer / 60;
      }
      if (this.transitionTimer <= 0) {
        this.transitioning = false;
        this.transitionAlpha = 0;
      }
      this._draw();
      return;
    }

    if (this.ending) {
      this._updateEnding();
      this._draw();
      return;
    }

    if (this.showingPasswordUI) {
      this._draw();
      return;
    }
    
    if (this.showingHelp) {
      this._draw();
      return;
    }

    // In puzzle level, use free camera instead of player movement
    if (this.level === 2.5 && !this.puzzleSolved) {
      this._updatePuzzleCamera();
    } else if (this.level === 2.5 && this.puzzleSolved) {
      // After puzzle solved, run auto-transition sequence
      this._updatePuzzleSolvedSequence();
    } else {
      this._updatePlayer();
    }
    this._updateEnemies();
    this._updateBoss();
    this._updateProjectiles();
    this._updateArrows();
    this._updateParticles();
    this._updateDamageNumbers();
    this._updatePickups();
    if (this.level !== 2.5) {
      this._updateCamera();
    }
    this._updateShake();
    this._updateCircuitPuzzle();
    this._updateRunePuzzle();
    this._updateWeaponPickupIndicator();
    this._checkGateTransitions();
    this._updateHints();

    this._draw();
  }

  // ─── UPDATE ROUTINES ──────────────────────────────────────────────────
  _updatePlayer() {
    const p = this.player;
    let dx = 0, dy = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) { dy = -1; p.dir = 'up'; }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) { dy = 1; p.dir = 'down'; }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) { dx = -1; p.dir = 'left'; }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) { dx = 1; p.dir = 'right'; }

    // Normalize diagonal
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }

    const speed = p.speedBoost ? p.baseSpeed * 1.6 : p.baseSpeed;
    const nx = p.x + dx * speed;
    const ny = p.y + dy * speed;

    // Check wall collisions
    if (!this._collidesWithWalls({ x: nx, y: p.y, width: p.width, height: p.height })) {
      p.x = nx;
    }
    if (!this._collidesWithWalls({ x: p.x, y: ny, width: p.width, height: p.height })) {
      p.y = ny;
    }

    // Clamp to world
    p.x = Math.max(0, Math.min(this.worldWidth - p.width, p.x));
    p.y = Math.max(0, Math.min(this.worldHeight - p.height, p.y));

    // Attack timer
    if (p.attackTimer > 0) p.attackTimer--;
    else p.attacking = false;

    if (p.attackCooldown > 0) p.attackCooldown--;
    if (p.bowCooldown > 0) p.bowCooldown--;
    if (p.spearCooldown > 0) p.spearCooldown--;
    if (p.halberdCooldown > 0) p.halberdCooldown--;
    if (p.bladesOfChaosCooldown > 0) p.bladesOfChaosCooldown--;
    if (p.invincible > 0) p.invincible--;

    // Blades of Chaos charge tracking
    if (p.bladesCharging) {
      p.bladesChargeTimer++;
      // Charging particle aura
      if (p.bladesChargeTimer > 15 && this.frame % 3 === 0) {
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * 10;
        this.particles.push({
          x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
          vx: -Math.cos(angle) * 1.5, vy: -Math.sin(angle) * 1.5,
          life: 15, color: p.bladesChargeTimer > 50 ? '#ffff00' : '#ff6600', size: 2,
        });
      }
    }
    if (p.bladesComboTimer > 0) {
      p.bladesComboTimer--;
      if (p.bladesComboTimer <= 0) p.bladesCombo = 0;
    }
    // Blades spinning fury animation timer
    if (p.bladesSpinning) {
      p.bladesSpinTimer--;
      if (p.bladesSpinTimer <= 0) p.bladesSpinning = false;
    }

    // Special cooldown
    if (p.specialCooldown > 0) {
      p.specialCooldown--;
      if (p.specialCooldown <= 0) {
        p.specialReady = true;
      }
    }

    // Buffs
    if (p.dmgBoostTimer > 0) {
      p.dmgBoostTimer--;
      if (p.dmgBoostTimer <= 0) p.dmgBoost = false;
    }
    if (p.shieldTimer > 0) {
      p.shieldTimer--;
      if (p.shieldTimer <= 0) p.shieldActive = false;
    }
    if (p.speedBoostTimer > 0) {
      p.speedBoostTimer--;
      if (p.speedBoostTimer <= 0) p.speedBoost = false;
    }

    // New powerup timers
    if (p.lifestealTimer > 0) {
      p.lifestealTimer--;
      if (p.lifestealTimer <= 0) p.lifestealActive = false;
    }
    if (p.thornsTimer > 0) {
      p.thornsTimer--;
      if (p.thornsTimer <= 0) p.thornsActive = false;
    }
    if (p.rageTimer > 0) {
      p.rageTimer--;
      if (p.rageTimer <= 0) {
        p.rageActive = false;
        // Rage also set dmgBoost and speedBoost — those have their own timers
      }
    }

    // Animation
    if (dx || dy) {
      p.animTimer++;
      if (p.animTimer > 8) { p.animFrame = (p.animFrame + 1) % 4; p.animTimer = 0; }
    } else {
      p.animFrame = 0;
    }

    // Hazard damage
    this.hazards.forEach(h => {
      if (h.cooldown > 0) { h.cooldown--; return; }
      if (this._rectsOverlap(p, h)) {
        this._damagePlayer(h.damage);
        h.cooldown = 60;
      }
    });

    // Low HP vignette
    this.vignetteAlpha = p.hp < 30 ? (1 - p.hp / 30) * 0.4 : 0;
  }

  _updateEnemies() {
    const p = this.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;

    // Captain buff check - find if any captain is alive
    const captainAlive = this.enemies.some(e => e.type === 'captain' && !e.dead);

    this.enemies.forEach(e => {
      if (e.dead) return;
      if (e.invincible > 0) e.invincible--;
      if (e.flashTimer > 0) e.flashTimer--;

      const ex = e.x + e.width / 2;
      const ey = e.y + e.height / 2;
      const dist = Math.hypot(px - ex, py - ey);

      if (e.type === 'dummy') return; // Dummies don't move

      // Captain buff: nearby enemies get speed boost
      let speedMult = 1;
      if (captainAlive && e.type !== 'captain') {
        const captain = this.enemies.find(c => c.type === 'captain' && !c.dead);
        if (captain) {
          const cdist = Math.hypot(ex - (captain.x + captain.width/2), ey - (captain.y + captain.height/2));
          if (cdist < this.captainBuffRadius) {
            speedMult = 1.3; // Speed boost from captain
            e.buffed = true;
          } else {
            e.buffed = false;
          }
        }
      } else {
        e.buffed = false;
      }

      // Berserker charge behavior
      if (e.type === 'berserker') {
        if (e.charging) {
          e.chargeTimer--;
          const nx = e.x + e.chargeDir.x * e.speed * 3;
          const ny = e.y + e.chargeDir.y * e.speed * 3;
          if (!this._collidesWithWalls({ x: nx, y: e.y, width: e.width, height: e.height })) e.x = nx;
          if (!this._collidesWithWalls({ x: e.x, y: ny, width: e.width, height: e.height })) e.y = ny;
          if (e.chargeTimer <= 0) e.charging = false;
          // Damage on contact during charge
          if (dist < 25) {
            this._damagePlayer(e.damage);
            e.charging = false;
          }
          e.animTimer++;
          if (e.animTimer > 4) { e.animFrame = (e.animFrame + 1) % 4; e.animTimer = 0; }
          e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
          e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
          return;
        }
        // Start charge if in range
        if (dist < e.aggroRange && dist > 60 && e.attackTimer <= 0) {
          e.charging = true;
          e.chargeTimer = 20;
          const cdx = (px - ex) / dist;
          const cdy = (py - ey) / dist;
          e.chargeDir = { x: cdx, y: cdy };
          e.attackTimer = e.attackCooldown;
          e.dir = Math.abs(cdx) > Math.abs(cdy) ? (cdx > 0 ? 'right' : 'left') : (cdy > 0 ? 'down' : 'up');
        }
      }

      // Shield guard faces player
      if (e.type === 'shield_guard') {
        if (dist < e.aggroRange) {
          if (Math.abs(px - ex) > Math.abs(py - ey)) {
            e.shieldDir = px > ex ? 'right' : 'left';
          } else {
            e.shieldDir = py > ey ? 'down' : 'up';
          }
        }
      }

      // Necromancer summons minions
      if (e.type === 'necromancer') {
        if (e.summonTimer !== null) {
          e.summonTimer++;
          if (e.summonTimer >= e.summonCooldown && dist < e.aggroRange) {
            e.summonTimer = 0;
            // Summon 2 slimes
            for (let i = 0; i < 2; i++) {
              const angle = (Math.random() * Math.PI * 2);
              const spawnDist = 40 + Math.random() * 20;
              const sx = e.x + Math.cos(angle) * spawnDist;
              const sy = e.y + Math.sin(angle) * spawnDist;
              this._spawnEnemy(sx, sy, 'slime', 15, 3);
              // Spawn particles
              for (let j = 0; j < 8; j++) {
                const pAngle = (j / 8) * Math.PI * 2;
                this.particles.push({
                  x: sx, y: sy,
                  vx: Math.cos(pAngle) * 2, vy: Math.sin(pAngle) * 2,
                  life: 15, color: '#9944ff', size: 2,
                });
              }
            }
            this._playSound('gate');
          }
        }
      }

      // Assassin teleports
      if (e.type === 'assassin') {
        if (e.teleportTimer !== null) {
          e.teleportTimer++;
          if (e.teleporting) {
            e.teleportPhase++;
            if (e.teleportPhase === 15) {
              // Teleport behind player
              const angle = Math.atan2(py - ey, px - ex) + Math.PI;
              const teleportDist = 40;
              const newX = px + Math.cos(angle) * teleportDist - e.width / 2;
              const newY = py + Math.sin(angle) * teleportDist - e.height / 2;
              // Ensure teleport position is within bounds
              e.x = Math.max(50, Math.min(this.worldWidth - 70, newX));
              e.y = Math.max(50, Math.min(this.worldHeight - 70, newY));
              // Spawn particles at new location
              for (let j = 0; j < 12; j++) {
                const pAngle = (j / 12) * Math.PI * 2;
                this.particles.push({
                  x: e.x + e.width / 2, y: e.y + e.height / 2,
                  vx: Math.cos(pAngle) * 3, vy: Math.sin(pAngle) * 3,
                  life: 20, color: '#ff44aa', size: 3,
                });
              }
            }
            if (e.teleportPhase >= 30) {
              e.teleporting = false;
              e.teleportPhase = 0;
            }
            return;
          }
          if (e.teleportTimer >= e.teleportCooldown && dist < e.aggroRange && dist > 50) {
            e.teleportTimer = 0;
            e.teleporting = true;
            e.teleportPhase = 0;
            // Spawn particles at old location
            for (let j = 0; j < 12; j++) {
              const pAngle = (j / 12) * Math.PI * 2;
              this.particles.push({
                x: ex, y: ey,
                vx: Math.cos(pAngle) * 3, vy: Math.sin(pAngle) * 3,
                life: 20, color: '#ff44aa', size: 3,
              });
            }
            this._playSound('pickup');
          }
        }
      }

      // === Dark Knight cleave attack ===
      if (e.type === 'dark_knight') {
        if (e.cleaveTimer !== undefined) e.cleaveTimer++;
        if (e.cleaving) {
          e.cleavePhase++;
          // Cleave arc animation — damage at phase 10
          if (e.cleavePhase === 10) {
            // Wide arc damage in front
            const cleaveRange = 50;
            if (dist < cleaveRange) {
              this._damagePlayer(e.damage + 5);
              this.shakeAmount = 4;
              this.shakeTimer = 8;
            }
            // Cleave particles
            for (let j = 0; j < 8; j++) {
              const angle = Math.atan2(py - ey, px - ex) + (j - 4) * 0.3;
              this.particles.push({
                x: ex, y: ey,
                vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
                life: 15, color: '#ff4444', size: 3,
              });
            }
            this._playSound('hit');
          }
          if (e.cleavePhase >= 25) {
            e.cleaving = false;
            e.cleavePhase = 0;
          }
          e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
          e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
          return; // Can't move while cleaving
        }
        if (e.cleaveTimer >= e.cleaveCooldown && dist < 45 && dist > 10) {
          e.cleaveTimer = 0;
          e.cleaving = true;
          e.cleavePhase = 0;
          e.attackTimer = e.attackCooldown;
        }
      }

      // === Fire Mage casting ===
      if (e.type === 'fire_mage') {
        if (e.fireTimer !== undefined) e.fireTimer++;
        if (e.casting) {
          e.castPhase++;
          // Fire at phase 15
          if (e.castPhase === 15) {
            const dx2 = (px - ex) / dist;
            const dy2 = (py - ey) / dist;
            // Three fireball spread
            for (let j = -1; j <= 1; j++) {
              const spreadAngle = Math.atan2(dy2, dx2) + j * 0.25;
              this.projectiles.push({
                x: ex, y: ey,
                vx: Math.cos(spreadAngle) * 3, vy: Math.sin(spreadAngle) * 3,
                damage: e.damage + 3, life: 80,
                isFireball: true,
              });
            }
            // Cast particles
            for (let j = 0; j < 6; j++) {
              this.particles.push({
                x: ex + Math.random() * 8, y: ey - 5,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3,
                life: 20, color: j % 2 === 0 ? '#ff6600' : '#ffaa00', size: 3,
              });
            }
            this._playSound('pickup');
          }
          if (e.castPhase >= 30) {
            e.casting = false;
            e.castPhase = 0;
          }
          e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
          e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
          return; // Can't move while casting
        }
        if (e.fireTimer >= e.fireCooldown && dist < e.aggroRange && dist > 60) {
          e.fireTimer = 0;
          e.casting = true;
          e.castPhase = 0;
          e.attackTimer = e.attackCooldown;
        }
      }

      // === War Golem ground pound ===
      if (e.type === 'war_golem') {
        if (e.poundTimer !== undefined) e.poundTimer++;
        if (e.pounding) {
          e.poundPhase++;
          // Rise up (phase 0-15), slam down (phase 16-20), shockwave (phase 21-35)
          if (e.poundPhase === 20) {
            // Ground pound impact
            const poundRange = 70;
            if (dist < poundRange) {
              this._damagePlayer(e.damage + 8);
              this.shakeAmount = 8;
              this.shakeTimer = 15;
            }
            // Shockwave particles
            for (let j = 0; j < 16; j++) {
              const angle = (j / 16) * Math.PI * 2;
              this.particles.push({
                x: ex, y: ey,
                vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5,
                life: 25, color: j % 2 === 0 ? '#886644' : '#aa8855', size: 4,
              });
            }
            // Rock debris
            for (let j = 0; j < 6; j++) {
              this.particles.push({
                x: ex + (Math.random() - 0.5) * 40, y: ey + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 4,
                life: 30, color: '#666', size: 5,
              });
            }
            this._playSound('slam');
          }
          if (e.poundPhase >= 40) {
            e.pounding = false;
            e.poundPhase = 0;
          }
          e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
          e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));
          return; // Can't move while pounding
        }
        if (e.poundTimer >= e.poundCooldown && dist < 65) {
          e.poundTimer = 0;
          e.pounding = true;
          e.poundPhase = 0;
          e.attackTimer = e.attackCooldown;
        }
      }

      // Move toward player if in range
      if (dist < e.aggroRange && dist > 25) {
        const dx = (px - ex) / dist;
        const dy = (py - ey) / dist;
        
        // Ranged units and necromancers try to maintain distance
        let moveToward = true;
        if ((e.type === 'archer' || e.type === 'crossbow_archer' || e.type === 'necromancer' || e.type === 'fire_mage') && dist < 80) {
          moveToward = false; // Back away
          const nx = e.x - dx * e.speed * speedMult;
          const ny = e.y - dy * e.speed * speedMult;
          if (!this._collidesWithWalls({ x: nx, y: e.y, width: e.width, height: e.height })) e.x = nx;
          if (!this._collidesWithWalls({ x: e.x, y: ny, width: e.width, height: e.height })) e.y = ny;
        }
        
        if (moveToward) {
          const nx = e.x + dx * e.speed * speedMult;
          const ny = e.y + dy * e.speed * speedMult;
          if (!this._collidesWithWalls({ x: nx, y: e.y, width: e.width, height: e.height })) e.x = nx;
          if (!this._collidesWithWalls({ x: e.x, y: ny, width: e.width, height: e.height })) e.y = ny;
        }

        // Direction
        if (Math.abs(px - ex) > Math.abs(py - ey)) {
          e.dir = px > ex ? 'right' : 'left';
        } else {
          e.dir = py > ey ? 'down' : 'up';
        }
      }

      // Clamp enemies to world bounds
      e.x = Math.max(50, Math.min(this.worldWidth - 50 - e.width, e.x));
      e.y = Math.max(50, Math.min(this.worldHeight - 50 - e.height, e.y));

      // Animation
      e.animTimer++;
      if (e.animTimer > 10) { e.animFrame = (e.animFrame + 1) % 2; e.animTimer = 0; }

      // Attack
      if (e.attackTimer > 0) { e.attackTimer--; return; }

      if ((e.type === 'archer' || e.type === 'crossbow_archer' || e.type === 'necromancer') && dist < e.aggroRange) {
        e.attackTimer = e.attackCooldown;
        const dx = (px - ex) / dist;
        const dy = (py - ey) / dist;
        const projSpeed = e.type === 'crossbow_archer' ? 4 : e.type === 'necromancer' ? 3.5 : 3;
        this.projectiles.push({
          x: ex, y: ey, vx: dx * projSpeed, vy: dy * projSpeed,
          damage: e.damage, life: 100,
          isCrossbowBolt: e.type === 'crossbow_archer',
          isNecromancerBolt: e.type === 'necromancer',
        });
        if (e.type === 'crossbow_archer') {
          this._playSound('crossbow');
        } else if (e.type === 'necromancer') {
          this._playSound('pickup'); // Dark magic sound
        }
      } else if (dist < 30 && e.type !== 'archer' && e.type !== 'crossbow_archer' && e.type !== 'necromancer' && e.type !== 'fire_mage') {
        e.attackTimer = e.attackCooldown;
        this._damagePlayer(e.damage);
      }
    });

    // Update wave system
    if (this.waveLevel) {
      this._updateWaveSystem();
    }
  }

  _updateBoss() {
    if (!this.boss) return;
    const b = this.boss;
    const p = this.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const dist = Math.hypot(px - bx, py - by);

    if (b.invincible > 0) b.invincible--;
    if (b.flashTimer > 0) b.flashTimer--;

    // Boss sits on throne until general is defeated
    if (this.bossOnThrone) {
      // Taunt player while sitting
      b.dialogueTimer = (b.dialogueTimer || 0) + 1;
      if (b.dialogueTimer > 200 && Math.random() < 0.03) {
        b.dialogueTimer = 0;
        const taunts = [
          "My Alpha Dragon will crush you!",
          "You dare challenge the Red Death?!",
          "No Viking has ever reached me!",
          "Pathetic little dragon rider...",
          "HAHAHA your Night Fury cannot save you!",
        ];
        b.currentDialogue = taunts[Math.floor(Math.random() * taunts.length)];
        b.dialogueDuration = 240;
      }
      if (b.dialogueDuration > 0) {
        b.dialogueDuration--;
        if (b.dialogueDuration <= 0) b.currentDialogue = null;
      }
      return;
    }
    
    // Boss awakening sequence
    if (this.bossAwakeningTimer > 0) {
      this.bossAwakeningTimer--;
      // Dramatic particles while awakening
      if (this.frame % 3 === 0) {
        this.particles.push({
          x: bx + (Math.random() - 0.5) * 30,
          y: by + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3,
          life: 25, color: '#ff2200', size: 3,
        });
      }
      if (this.bossAwakeningTimer === 90) {
        this._showHudMessage('"You... defeated my Alpha Dragon? I\'ll END you myself, Viking!"');
      }
      if (this.bossAwakeningTimer <= 0) {
        // Boss now moves to attack position
        b.x = 270;
        b.y = 200;
        this._showHudMessage('\u26a0\ufe0f THE RED DEATH ATTACKS! \u26a0\ufe0f');
      }
      return;
    }

    if (b.dying) {
      b.deathTimer--;
      b.flashTimer = 3;
      
      // Boss death dialogue sequence
      if (this.bossDialogueSequence) {
        this.bossDialogueTimer++;
        for (let i = this.bossDialogueSequence.length - 1; i >= 0; i--) {
          const d = this.bossDialogueSequence[i];
          if (this.bossDialogueTimer >= d.timer && this.bossDialoguePhase <= i) {
            this.bossDialoguePhase = i + 1;
            this.bossDialogueText = d.text;
            this.bossDialogueSpeaker = d.speaker;
            break;
          }
        }
        // Clear after last dialogue
        if (this.bossDialogueTimer > 620) {
          this.bossDialogueText = null;
          this.bossDialogueSpeaker = null;
        }
      }
      
      // Lava attack animation
      if (b.lavaAttackPhase > 0) {
        b.lavaAttackTimer = (b.lavaAttackTimer || 0) + 1;
        
        // Phase 1: Ground cracks (0-30 frames)
        if (b.lavaAttackPhase === 1 && b.lavaAttackTimer > 30) {
          b.lavaAttackPhase = 2;
          b.lavaAttackTimer = 0;
        }
        // Phase 2: Lava eruption (30-60 frames)
        else if (b.lavaAttackPhase === 2 && b.lavaAttackTimer > 30) {
          b.lavaAttackPhase = 3;
          b.lavaAttackTimer = 0;
        }
        // Phase 3: Explosion (60-90 frames)
        else if (b.lavaAttackPhase === 3 && b.lavaAttackTimer > 30) {
          b.lavaAttackPhase = 4;
          b.lavaAttackTimer = 0;
          // Massive explosion particles
          for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
              x: b.x + b.width / 2,
              y: b.y + b.height / 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 60,
              color: ['#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff00'][Math.floor(Math.random() * 5)],
              size: 3 + Math.random() * 4,
            });
          }
        }
      }
      
      if (b.deathTimer <= 0) {
        this._startEnding();
      }
      return;
    }

    // Animation
    b.animTimer++;
    if (b.animTimer > 12) { b.animFrame = (b.animFrame + 1) % 2; b.animTimer = 0; }

    // Rage mode - boss gets angrier over time
    b.timeInBattle = (b.timeInBattle || 0) + 1;
    if (b.timeInBattle % 1800 === 0 && b.timeInBattle > 0) { // Every 30 seconds
      b.rageLevel++;
      b.speed += 0.15;
      this._showHudMessage(`⚡ RAGE LEVEL ${b.rageLevel}! Boss speed increased! ⚡`);
      this.shakeAmount = 3;
      this.shakeTimer = 10;
    }

    // Barrier shield mechanic (Phase 1.5+)
    if (b.barrier > 0) {
      // Barrier slowly regenerates
      if (b.phase >= 2 && this.frame % 120 === 0) {
        b.barrier = Math.min(b.barrierMax, b.barrier + 10);
      }
      // Barrier particles
      if (this.frame % 8 === 0) {
        const angle = (this.frame * 0.1) % (Math.PI * 2);
        this.particles.push({
          x: bx + Math.cos(angle) * 35,
          y: by + Math.sin(angle) * 35,
          vx: 0, vy: -0.5,
          life: 20, color: '#00ccff', size: 2,
        });
      }
    }

    // Power attack charging (Phase 3+)
    if (b.powerAttackCharging) {
      b.powerAttackTimer--;
      // Show warning circle
      const warningPulse = 0.3 + Math.sin(b.powerAttackTimer * 0.3) * 0.2;
      this.particles.push({
        x: b.powerAttackWarningX + (Math.random() - 0.5) * 60,
        y: b.powerAttackWarningY + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
        life: 5, color: '#ff0000', size: 3,
        alpha: warningPulse,
      });
      
      if (b.powerAttackTimer <= 0) {
        b.powerAttackCharging = false;
        // Execute power attack - AoE explosion
        const attackDist = Math.hypot(px - b.powerAttackWarningX, py - b.powerAttackWarningY);
        if (attackDist < 70) {
          this._damagePlayer(b.phase >= 5 ? 25 : 20);
        }
        // Massive explosion
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          this.particles.push({
            x: b.powerAttackWarningX, y: b.powerAttackWarningY,
            vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
            life: 30, color: '#ff4400', size: 4,
          });
        }
        this._playSound('slam');
        this.shakeAmount = 8;
        this.shakeTimer = 15;
      }
      return;
    }

    // Meteor rain attack (Phase 4+)
    if (b.phase >= 4) {
      b.meteorTimer = (b.meteorTimer || 0) + 1;
      const meteorInterval = b.phase === 5 ? 180 : 240;
      if (b.meteorTimer >= meteorInterval) {
        b.meteorTimer = 0;
        const meteorCount = b.phase === 5 ? 5 : 3;
        for (let i = 0; i < meteorCount; i++) {
          setTimeout(() => {
            const tx = 80 + Math.random() * (this.worldWidth - 160);
            const ty = 80 + Math.random() * (this.worldHeight - 160);
            // Warning marker
            for (let j = 0; j < 15; j++) {
              this.particles.push({
                x: tx + (Math.random() - 0.5) * 40,
                y: ty + (Math.random() - 0.5) * 40,
                vx: 0, vy: -1,
                life: 45, color: '#ffaa00', size: 3,
              });
            }
            // Delayed meteor impact
            setTimeout(() => {
              const impactDist = Math.hypot(px - tx, py - ty);
              if (impactDist < 50) {
                this._damagePlayer(b.phase === 5 ? 18 : 15);
              }
              // Impact explosion
              for (let k = 0; k < 25; k++) {
                const angle = (k / 25) * Math.PI * 2;
                this.particles.push({
                  x: tx, y: ty,
                  vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                  life: 25, color: '#ff6600', size: 4,
                });
              }
              this._playSound('slam');
            }, 600);
          }, i * 300);
        }
      }
    }

    // Slam attack animation
    if (b.slamming) {
      b.slamTimer--;
      if (b.slamTimer <= 0) {
        b.slamming = false;
        this._playSound('slam');
        // AoE damage around boss - bigger radius in later phases
        const slamRange = b.phase >= 3 ? 100 : 80;
        if (dist < slamRange) {
          this._damagePlayer(b.phase >= 4 ? 15 : (b.phase === 3 ? 12 : 8));
        }
        // Shockwave particles
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          this.particles.push({
            x: bx, y: by,
            vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
            life: 25, color: b.phase >= 4 ? '#ff0000' : '#ff6644', size: 4,
          });
        }
      }
      return;
    }

    // Dash charge attack (phase 2+)
    if (b.dashCharging) {
      b.dashTimer--;
      const dashSpeed = b.phase >= 4 ? 5 : 3.5;
      const nx = b.x + b.dashDir.x * dashSpeed;
      const ny = b.y + b.dashDir.y * dashSpeed;
      if (!this._collidesWithWalls({ x: nx, y: b.y, width: b.width, height: b.height })) b.x = nx;
      if (!this._collidesWithWalls({ x: b.x, y: ny, width: b.width, height: b.height })) b.y = ny;
      // Damage on contact during dash
      if (dist < 35) {
        this._damagePlayer(b.phase >= 4 ? 14 : 10);
        b.dashCharging = false;
      }
      if (b.dashTimer <= 0) b.dashCharging = false;
      // Trail particles
      this.particles.push({
        x: bx, y: by,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        life: 15, color: '#ff4400', size: 3,
      });
      return;
    }

    // Move toward player
    if (dist > 40) {
      const dx = (px - bx) / dist;
      const dy = (py - by) / dist;
      const nx = b.x + dx * b.speed;
      const ny = b.y + dy * b.speed;

      if (!this._collidesWithWalls({ x: nx, y: b.y, width: b.width, height: b.height })) {
        b.x = nx;
      }
      if (!this._collidesWithWalls({ x: b.x, y: ny, width: b.width, height: b.height })) {
        b.y = ny;
      }

      if (Math.abs(px - bx) > Math.abs(py - by)) {
        b.dir = px > bx ? 'right' : 'left';
      } else {
        b.dir = py > by ? 'down' : 'up';
      }
    }

    // Boss attack timer
    b.attackTimer++;
    if (b.attackTimer >= b.attackCooldown) {
      b.attackTimer = 0;

      const roll = Math.random();

      if (b.phase >= 3 && roll < 0.12) {
        // Telegraphed power attack (charges for 60 frames then explodes)
        b.powerAttackCharging = true;
        b.powerAttackTimer = 60;
        b.powerAttackWarningX = px;
        b.powerAttackWarningY = py;
        this._showHudMessage('💥 POWER ATTACK INCOMING! DODGE! 💥');
      } else if (b.phase >= 2 && roll < 0.25) {
        // Ground slam
        b.slamming = true;
        b.slamTimer = b.phase >= 5 ? 15 : (b.phase >= 4 ? 20 : 30);
      } else if (b.phase >= 2 && roll < 0.42) {
        // Dash charge
        b.dashCharging = true;
        b.dashTimer = b.phase >= 5 ? 35 : (b.phase >= 4 ? 30 : 20);
        const ddx = (px - bx) / (dist || 1);
        const ddy = (py - by) / (dist || 1);
        b.dashDir = { x: ddx, y: ddy };
        this._playSound('horn');
      } else if (dist < 50) {
        // Melee - scaled by phase
        this._damagePlayer(b.phase === 5 ? 20 : (b.phase === 4 ? 16 : (b.phase === 3 ? 12 : 9)));
      } else {
        // Ranged attack - scaled projectiles
        const dx = (px - bx) / (dist || 1);
        const dy = (py - by) / (dist || 1);
        
        if (b.phase === 5) {
          // Phase 5: shoot 7 projectiles in a spiral pattern
          for (let i = -3; i <= 3; i++) {
            const angle = Math.atan2(dy, dx) + (i * 0.15);
            this.projectiles.push({
              x: bx, y: by, 
              vx: Math.cos(angle) * 6, 
              vy: Math.sin(angle) * 6,
              damage: 14, life: 90, boss: true,
            });
          }
          // Also shoot a ring around the boss
          if (roll > 0.5) {
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              this.projectiles.push({
                x: bx, y: by,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                damage: 10, life: 70, boss: true,
              });
            }
          }
        } else if (b.phase === 4) {
          // Phase 4: shoot 5 projectiles in a wide fan
          for (let i = -2; i <= 2; i++) {
            const angle = Math.atan2(dy, dx) + (i * 0.18);
            this.projectiles.push({
              x: bx, y: by, 
              vx: Math.cos(angle) * 5.5, 
              vy: Math.sin(angle) * 5.5,
              damage: 12, life: 90, boss: true,
            });
          }
        } else if (b.phase === 3) {
          // Phase 3: shoot 3 projectiles in a spread
          for (let i = -1; i <= 1; i++) {
            const angle = Math.atan2(dy, dx) + (i * 0.2);
            this.projectiles.push({
              x: bx, y: by, 
              vx: Math.cos(angle) * 4.5, 
              vy: Math.sin(angle) * 4.5,
              damage: 10, life: 80, boss: true,
            });
          }
        } else {
          this.projectiles.push({
            x: bx, y: by, vx: dx * 4, vy: dy * 4,
            damage: b.phase === 2 ? 8 : 6, life: 80, boss: true,
          });
        }
      }
    }

    // Phase 2+: summon minions periodically (faster in higher phases)
    if (b.phase >= 2) {
      b.summonTimer++;
      const summonInterval = b.phase === 5 ? 240 : (b.phase === 4 ? 300 : (b.phase === 3 ? 400 : 500));
      if (b.summonTimer > summonInterval) {
        b.summonTimer = 0;
        const minions = b.phase === 5 ? 5 : (b.phase === 4 ? 4 : (b.phase === 3 ? 3 : 2));
        
        // Summon effect particles
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          this.particles.push({
            x: bx, y: by,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
            life: 20, color: b.phase === 5 ? '#ff00ff' : '#aa44ff', size: 3,
          });
        }
        
        for (let i = 0; i < minions; i++) {
          const mx = b.x + (Math.random() - 0.5) * 120;
          const my = b.y + (Math.random() - 0.5) * 120;
          const spawnX = Math.max(50, Math.min(this.worldWidth - 70, mx));
          const spawnY = Math.max(50, Math.min(this.worldHeight - 70, my));
          
          // Phase 2: knights and archers
          // Phase 3: knights, archers, and necromancers
          // Phase 4: dark_knights, fire_mages, and berserkers
          // Phase 5: ELITE mix of all dangerous enemies
          if (b.phase === 5) {
            const rand = Math.random();
            let enemyType, hp, dmg;
            if (rand < 0.2) {
              enemyType = 'dark_knight';
              hp = 60;
              dmg = 12;
            } else if (rand < 0.4) {
              enemyType = 'berserker';
              hp = 30;
              dmg = 10;
            } else if (rand < 0.6) {
              enemyType = 'fire_mage';
              hp = 35;
              dmg = 11;
            } else if (rand < 0.8) {
              enemyType = 'necromancer';
              hp = 30;
              dmg = 9;
            } else {
              enemyType = 'general';
              hp = 80;
              dmg = 13;
            }
            this._spawnEnemy(spawnX, spawnY, enemyType, hp, dmg);
          } else if (b.phase === 4) {
            const rand = Math.random();
            let enemyType, hp, dmg;
            if (rand < 0.3) {
              enemyType = 'dark_knight';
              hp = 50;
              dmg = 10;
            } else if (rand < 0.6) {
              enemyType = 'berserker';
              hp = 25;
              dmg = 8;
            } else {
              enemyType = 'fire_mage';
              hp = 30;
              dmg = 9;
            }
            this._spawnEnemy(spawnX, spawnY, enemyType, hp, dmg);
          } else if (b.phase === 2) {
            const enemyType = Math.random() < 0.5 ? 'knight' : 'archer';
            const hp = enemyType === 'knight' ? 25 : 18;
            const dmg = enemyType === 'knight' ? 5 : 6;
            this._spawnEnemy(spawnX, spawnY, enemyType, hp, dmg);
          } else {
            const rand = Math.random();
            let enemyType, hp, dmg;
            if (rand < 0.4) {
              enemyType = 'knight';
              hp = 30;
              dmg = 6;
            } else if (rand < 0.7) {
              enemyType = 'archer';
              hp = 20;
              dmg = 7;
            } else {
              enemyType = 'necromancer';
              hp = 25;
              dmg = 6;
            }
            this._spawnEnemy(spawnX, spawnY, enemyType, hp, dmg);
          }
        }
        
        const msg = b.phase === 5 ? '☠️ ULTIMATE DRAGON ARMY! ☠️' : (b.phase === 4 ? '💀 ELITE DRAGON HUNTERS EMERGE! 💀' : (b.phase === 3 ? '💀 Dragon reinforcements arrive! 💀' : 'Dragon minions summoned!'));
        this._showHudMessage(msg);
        this._playSound('gate');
      }
    }

    // Phase 3+ screen shake
    if (b.phase >= 3 && this.frame % 60 === 0) {
      this.shakeAmount = b.phase === 5 ? 7 : (b.phase === 4 ? 5 : 3);
      this.shakeTimer = b.phase === 5 ? 12 : (b.phase === 4 ? 10 : 5);
    }

    // === Frequent health drops during boss fight ===
    if (!b.healthDropTimer) b.healthDropTimer = 0;
    b.healthDropTimer++;
    // Drop health every 6-8 seconds depending on phase (faster in later phases due to difficulty)
    const dropInterval = b.phase === 5 ? 300 : (b.phase >= 4 ? 360 : (b.phase >= 3 ? 420 : 480));
    if (b.healthDropTimer >= dropInterval) {
      b.healthDropTimer = 0;
      const existingHealth = this.pickups.filter(pk => pk.type === 'health' && !pk.collected).length;
      const maxHealth = b.phase === 5 ? 4 : 3; // More health available in final phase
      if (existingHealth < maxHealth) {
        // Spawn health at a random spot away from boss
        let hx, hy;
        do {
          hx = 60 + Math.random() * (this.worldWidth - 120);
          hy = 60 + Math.random() * (this.worldHeight - 120);
        } while (Math.hypot(hx - bx, hy - by) < 100);
        this.pickups.push({ x: hx, y: hy, type: 'health', collected: false });
        // Small sparkle effect
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: hx, y: hy,
            vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
            life: 20, color: '#44ff44', size: 2,
          });
        }
      }
    }

    // Phase 4+: orbiting dark energy projectiles
    if (b.phase >= 4) {
      b.orbTimer = (b.orbTimer || 0) + 1;
      const orbInterval = b.phase === 5 ? 30 : 45; // Faster in phase 5
      if (b.orbTimer % orbInterval === 0) {
        // Fire homing orb
        const angle = Math.atan2(py - by, px - bx);
        this.projectiles.push({
          x: bx, y: by,
          vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
          damage: 8, life: 120, boss: true,
        });
      }
    }

    // Contact damage
    if (this._rectsOverlap(p, b) && p.invincible <= 0) {
      this._damagePlayer(4);
    }

    // Dialogue Logic
    if (b.dialogueDuration > 0) {
      b.dialogueDuration--;
      if (b.dialogueDuration <= 0) b.currentDialogue = null;
    }

    // Trigger new dialogue randomly (approx every 2-4 seconds)
    b.dialogueTimer++;
    if (b.dialogueTimer > 120 && Math.random() < 0.05) {
      b.dialogueTimer = 0;
      const lines = [
        "No Viking can defeat the Red Death!",
        "HAHAHAHAHAAA",
        "I AM THE RED DEATH! RULER OF ALL DRAGONS!",
        "Your Night Fury is MINE!"
      ];
      b.currentDialogue = lines[Math.floor(Math.random() * lines.length)];
      b.dialogueDuration = 240; // 4 seconds
    }
  }

  _updateProjectiles() {
    this.projectiles = this.projectiles.filter(proj => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.life--;

      // Hit player
      if (this._rectsOverlap(
        { x: proj.x - 4, y: proj.y - 4, width: 8, height: 8 },
        this.player
      )) {
        this._damagePlayer(proj.damage);
        return false;
      }

      // Hit wall
      if (this._collidesWithWalls({ x: proj.x - 2, y: proj.y - 2, width: 4, height: 4 })) {
        return false;
      }

      return proj.life > 0;
    });
  }

  _updateArrows() {
    const dmg = this.player.dmgBoost ? 18 : 12;
    this.player.arrows = this.player.arrows.filter(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.life--;

      // Hit enemies
      let hit = false;
      this.enemies.forEach(e => {
        if (e.dead || e.invincible > 0) return;
        if (this._rectsOverlap({ x: a.x - 3, y: a.y - 3, width: 6, height: 6 }, e)) {
          this._damageEnemy(e, dmg);
          hit = true;
        }
      });

      // Hit boss
      if (this.boss && !this.boss.dying && this.boss.invincible <= 0) {
        if (this._rectsOverlap(
          { x: a.x - 3, y: a.y - 3, width: 6, height: 6 },
          this.boss
        )) {
          this._damageBoss(dmg);
          hit = true;
        }
      }

      // Hit wall
      if (this._collidesWithWalls({ x: a.x - 2, y: a.y - 2, width: 4, height: 4 })) {
        hit = true;
      }

      return !hit && a.life > 0;
    });
  }

  _updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      return p.life > 0;
    });
  }

  _updateDamageNumbers() {
    this.damageNumbers = this.damageNumbers.filter(d => {
      d.y -= 0.8;
      d.life--;
      return d.life > 0;
    });
  }

  _updatePickups() {
    const p = this.player;
    this.pickups.forEach(pk => {
      if (pk.collected) return;
      if (this._rectsOverlap(p, { x: pk.x - 8, y: pk.y - 8, width: 16, height: 16 })) {
        pk.collected = true;
        this._playSound('pickup');

        switch (pk.type) {
          case 'health':
            p.hp = Math.min(p.hp + 50, p.maxHp);
            this._showHudMessage('+50 HP ❤️');
            break;
          case 'sword':
            p.hasWeapons.sword = true;
            this._showHudMessage('Sword equipped! ⚔️');
            this._showWeaponPickup('sword');
            break;
          case 'bow':
            p.hasWeapons.bow = true;
            this._showHudMessage('Bow acquired! Press E to switch 🏹');
            this._showWeaponPickup('bow');
            break;
          case 'spear':
            p.hasWeapons.spear = true;
            this._showHudMessage('Spear acquired! Press E to switch 🔱');
            this._showWeaponPickup('spear');
            break;
          case 'halberd':
            p.hasWeapons.halberd = true;
            p.weapon = 'halberd'; // Auto-equip
            this._showHudMessage('RUNIC HALBERD acquired! Wide arc, massive damage! Press E to switch ⚔️');
            this._showWeaponPickup('halberd');
            break;
          case 'bladesOfChaos':
            p.hasWeapons.bladesOfChaos = true;
            p.weapon = 'bladesOfChaos';
            this._showHudMessage('🔥⛓️ BLADES OF CHAOS ACQUIRED! Click: combo slash | Hold+Release: SPINNING FURY! ⛓️🔥');
            this._showWeaponPickup('bladesOfChaos');
            // Grant temporary buffs to celebrate
            p.dmgBoost = true;
            p.dmgBoostTimer = Math.max(p.dmgBoostTimer || 0, 300);
            p.speedBoost = true;
            p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 300);
            break;
          case 'speed':
            p.speedBoost = true;
            p.speedBoostTimer = 600; // 10 seconds
            this._showHudMessage('Speed Boost! ⚡');
            break;
          case 'shield':
            p.shieldActive = true;
            p.shieldTimer = 600;
            this._showHudMessage('Shield Active! 🛡️');
            break;
          case 'damage':
            p.dmgBoost = true;
            p.dmgBoostTimer = 600;
            this._showHudMessage('Damage Boost! 🔥');
            break;
          case 'lifesteal':
            p.lifestealActive = true;
            p.lifestealTimer = 900; // 15 seconds
            this._showHudMessage('Lifesteal! Heal on hit for 15s! 🩸');
            break;
          case 'thorns':
            p.thornsActive = true;
            p.thornsTimer = 600; // 10 seconds
            this._showHudMessage('Thorns! Enemies take damage when they hit you! 🌵');
            break;
          case 'rage':
            p.rageActive = true;
            p.rageTimer = 480; // 8 seconds
            p.speedBoost = true;
            p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 480);
            p.dmgBoost = true;
            p.dmgBoostTimer = Math.max(p.dmgBoostTimer || 0, 480);
            this._showHudMessage('RAGE MODE! Speed + Damage + Attack Speed! 💢');
            break;
        }
      }
    });
  }

  _updateCamera() {
    const p = this.player;
    const vpW = this.width / this.scale;
    const vpH = this.height / this.scale;

    const targetX = p.x + p.width / 2 - vpW / 2;
    const targetY = p.y + p.height / 2 - vpH / 2;

    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;

    // Clamp or Center Camera
    if (this.worldWidth < vpW) {
      this.camera.x = -(vpW - this.worldWidth) / 2;
    } else {
      this.camera.x = Math.max(0, Math.min(this.worldWidth - vpW, this.camera.x));
    }

    if (this.worldHeight < vpH) {
      this.camera.y = -(vpH - this.worldHeight) / 2;
    } else {
      this.camera.y = Math.max(0, Math.min(this.worldHeight - vpH, this.camera.y));
    }
  }

  _updateShake() {
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
    } else {
      this.shakeAmount = 0;
    }
  }

  _checkGateTransitions() {
    const p = this.player;
    this.gates.forEach(g => {
      if (!g.open) return;
      // Check if player walks through open gate
      if (this._rectsOverlap(p, g)) {
        if (this.level === 1) {
          this._loadLevel(2);
        } else if (this.level === 2) {
          this._loadLevel(2.5); // Go to puzzle
        } else if (this.level === 2.5) {
          this._loadLevel(3); // Go to castle
        } else if (this.level === 3) {
          this._loadLevel(3.5); // Go to wave arena
        } else if (this.level === 3.5) {
          this._loadLevel(4); // Go to boss
        }
      }
    });
  }

  _updateHints() {
    const p = this.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;

    this.hintBubble = null;
    this.tutorialHints.forEach(h => {
      const dist = Math.hypot(px - h.x, py - h.y);
      if (dist < h.radius) {
        h.shown = true;
        this.hintBubble = h;
      }
    });
  }
  
  _updatePuzzleCamera() {
    // Free camera panning with arrow keys / WASD
    const panSpeed = this.puzzleCamSpeed;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) this.puzzleCam.y -= panSpeed;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) this.puzzleCam.y += panSpeed;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.puzzleCam.x -= panSpeed;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) this.puzzleCam.x += panSpeed;
    
    // Clamp puzzle camera to world bounds
    const vpW = this.width / this.scale;
    const vpH = this.height / this.scale;
    if (this.worldWidth < vpW) {
      this.puzzleCam.x = -(vpW - this.worldWidth) / 2;
    } else {
      this.puzzleCam.x = Math.max(0, Math.min(this.worldWidth - vpW, this.puzzleCam.x));
    }
    if (this.worldHeight < vpH) {
      this.puzzleCam.y = -(vpH - this.worldHeight) / 2;
    } else {
      this.puzzleCam.y = Math.max(0, Math.min(this.worldHeight - vpH, this.puzzleCam.y));
    }
    
    // Smoothly apply puzzle camera
    this.camera.x += (this.puzzleCam.x - this.camera.x) * 0.15;
    this.camera.y += (this.puzzleCam.y - this.camera.y) * 0.15;
  }
  
  _updateCircuitPuzzle() {
    if (this.level !== 2.5 || this.puzzleSolved) return;
    
    // Handle mouse clicks on nodes
    if (this.mouseClick) {
      const mx = this.mousePos.x / this.scale + this.camera.x;
      const my = this.mousePos.y / this.scale + this.camera.y;
      
      let nodeClicked = false;
      this.circuitNodes.forEach(node => {
        const dist = Math.hypot(mx - node.x, my - node.y);
        if (dist < 30) {
          node.rotation = (node.rotation + 1) % 4;
          this._playSound('pickup');
          nodeClicked = true;
        }
      });
      
      this.mouseClick = false;
    }
    
    // Calculate power flow
    this._calculatePowerFlow();
    
    // Check if puzzle is solved
    if (this.gateNode.powered && !this.puzzleSolved) {
      this.puzzleSolved = true;
      this.puzzleSolvedTimer = 0;
      this.puzzleCameraMode = false;
      this._playSound('victory');
      this._showHudMessage('⚡ Dragon Eye power restored! The passage is opening... ⚡');
      this.gates.forEach(g => {
        if (g.requirePuzzle) g.open = true;
      });
      
      // Visual feedback
      this.shakeAmount = 8;
      this.shakeTimer = 60;
      
      // Particles celebration at gate
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        this.particles.push({
          x: this.gateNode.x,
          y: this.gateNode.y,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          life: 50,
          color: i % 2 === 0 ? '#ffd700' : '#44ff44',
          size: 4,
        });
      }
      // Particles at power source too
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        this.particles.push({
          x: this.powerSource.x,
          y: this.powerSource.y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 40,
          color: '#44aaff',
          size: 3,
        });
      }
    }
  }
  
  _updatePuzzleSolvedSequence() {
    this.puzzleSolvedTimer++;
    
    const vpW = this.width / this.scale;
    const vpH = this.height / this.scale;
    
    if (this.puzzleSolvedTimer < 90) {
      // Phase 1: Pan camera to the gate (0-90 frames = 1.5 sec)
      const targetX = Math.max(0, Math.min(this.worldWidth - vpW, this.gateNode.x - vpW / 2));
      const targetY = Math.max(0, Math.min(this.worldHeight - vpH, this.gateNode.y - vpH / 2));
      this.camera.x += (targetX - this.camera.x) * 0.08;
      this.camera.y += (targetY - this.camera.y) * 0.08;
      
      // Spawn occasional particles at the gate
      if (this.puzzleSolvedTimer % 10 === 0) {
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: this.gateNode.x + (Math.random() - 0.5) * 60,
            y: this.gateNode.y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2,
            life: 30,
            color: '#ffd700',
            size: 3,
          });
        }
      }
    } else if (this.puzzleSolvedTimer === 90) {
      // Phase 2: Show message
      this._showHudMessage('🐉 The passage opens! Proceeding to Dragon Island... 🐉');
    } else if (this.puzzleSolvedTimer < 180) {
      // Phase 2: Hold on gate view (90-180 = 1.5 sec)
      const targetX = Math.max(0, Math.min(this.worldWidth - vpW, this.gateNode.x - vpW / 2));
      const targetY = Math.max(0, Math.min(this.worldHeight - vpH, this.gateNode.y - vpH / 2));
      this.camera.x += (targetX - this.camera.x) * 0.1;
      this.camera.y += (targetY - this.camera.y) * 0.1;
    } else {
      // Phase 3: Transition to level 3
      this._loadLevel(3);
    }
  }
  
  _calculatePowerFlow() {
    // Reset powered state
    this.poweredNodes.clear();
    this.circuitNodes.forEach(n => n.powered = false);
    this.gateNode.powered = false;
    
    // BFS from power source — use direction-aware visited keys
    // so that the same node can be reached from multiple directions
    // (critical for split nodes whose decoy branches may reach main path nodes)
    const queue = [{ x: this.powerSource.x, y: this.powerSource.y, from: null }];
    const visited = new Set();
    visited.add(`${this.powerSource.x},${this.powerSource.y},null`);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Find connected nodes
      const connections = this._getNodeConnections(current.x, current.y, current.from);
      
      connections.forEach(conn => {
        const key = `${conn.x},${conn.y},${conn.from}`;
        if (!visited.has(key)) {
          visited.add(key);
          
          // Find the node at this position
          const node = this.circuitNodes.find(n => n.x === conn.x && n.y === conn.y);
          if (node) {
            node.powered = true;
            this.poweredNodes.add(`${conn.x},${conn.y}`);
            queue.push({ x: conn.x, y: conn.y, from: conn.from });
          }
          
          // Check if we reached the gate
          if (conn.x === this.gateNode.x && conn.y === this.gateNode.y) {
            this.gateNode.powered = true;
          }
        }
      });
    }
  }
  
  _getNodeConnections(x, y, fromDir) {
    const connections = [];
    
    // Check if this is the power source
    if (x === this.powerSource.x && y === this.powerSource.y) {
      // Power source connects to the right
      connections.push({ x: x + 100, y: y, from: 'left' });
      return connections;
    }
    
    // Find the node at this position
    const node = this.circuitNodes.find(n => n.x === x && n.y === y);
    if (!node) return connections;
    
    // Get output directions based on node type and rotation
    const outputs = this._getNodeOutputs(node, fromDir);
    
    outputs.forEach(dir => {
      let nx = x, ny = y;
      let nextFrom = null;
      
      if (dir === 'up') { ny -= 100; nextFrom = 'down'; }
      else if (dir === 'down') { ny += 100; nextFrom = 'up'; }
      else if (dir === 'left') { nx -= 100; nextFrom = 'right'; }
      else if (dir === 'right') { nx += 100; nextFrom = 'left'; }
      
      connections.push({ x: nx, y: ny, from: nextFrom });
    });
    
    return connections;
  }
  
  _getNodeOutputs(node, fromDir) {
    const dirs = ['up', 'right', 'down', 'left'];
    const outputs = [];
    
    if (node.type === 'straight') {
      // Straight: connects opposite sides
      // rotation 0 = vertical (up-down), 1 = horizontal (left-right)
      if (node.rotation % 2 === 0) { // vertical
        if (fromDir === 'down') outputs.push('up');
        if (fromDir === 'up') outputs.push('down');
      } else { // horizontal
        if (fromDir === 'left') outputs.push('right');
        if (fromDir === 'right') outputs.push('left');
      }
    } else if (node.type === 'corner') {
      // Corner: connects two adjacent sides
      // rotation 0 = up-right, 1 = right-down, 2 = down-left, 3 = left-up
      const pairs = [
        ['up', 'right'],
        ['right', 'down'],
        ['down', 'left'],
        ['left', 'up']
      ];
      const [dir1, dir2] = pairs[node.rotation];
      if (fromDir === dir1) outputs.push(dir2);
      if (fromDir === dir2) outputs.push(dir1);
    } else if (node.type === 'split') {
      // Split: one input, two outputs
      // rotation 0 = input down, outputs up+right
      // rotation 1 = input left, outputs right+down
      // rotation 2 = input up, outputs down+left
      // rotation 3 = input right, outputs left+up
      const configs = [
        { input: 'down', outputs: ['up', 'right'] },
        { input: 'left', outputs: ['right', 'down'] },
        { input: 'up', outputs: ['down', 'left'] },
        { input: 'right', outputs: ['left', 'up'] }
      ];
      const config = configs[node.rotation];
      if (fromDir === config.input) {
        outputs.push(...config.outputs);
      }
    } else if (node.type === 'dead') {
      // Dead end: no outputs
      return [];
    }
    
    return outputs;
  }
  
  _updateRunePuzzle() {
    if (!this.runePuzzle || !this.runePuzzle.active || this.runePuzzle.solved) return;
    const rp = this.runePuzzle;
    const p = this.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;

    // Decrease fail flash
    if (rp.failFlash > 0) rp.failFlash--;

    // Update rune glow
    rp.runes.forEach(r => {
      if (r.stepped) {
        r.glow = Math.min(1, r.glow + 0.05);
      } else {
        r.glow = 0.3 + Math.sin(this.elapsed * 3 + r.order) * 0.15;
      }
    });

    // Check if player steps on a rune
    rp.runes.forEach(r => {
      if (r.stepped) return;
      const dist = Math.hypot(px - r.x, py - r.y);
      if (dist < 20) {
        const expectedIndex = rp.playerSequence.length;
        if (rp.correctOrder[expectedIndex] === r.symbol) {
          // Correct rune!
          r.stepped = true;
          rp.playerSequence.push(r.symbol);
          this._playSound('pickup');
          // Spawn glow particles
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: r.x, y: r.y,
              vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
              life: 30, color: r.symbol === 'water' ? '#4488ff' : r.symbol === 'fire' ? '#ff4422' : r.symbol === 'wind' ? '#88ffcc' : '#886622',
              size: 3,
            });
          }

          // Check if all runes stepped
          if (rp.playerSequence.length === rp.correctOrder.length) {
            rp.solved = true;
            rp.active = false;
            rp.altar.active = true;
            rp.dissolveTimer = 0; // Start dissolve animation for runes
            this._playSound('victory');
            this.shakeAmount = 6;
            this.shakeTimer = 15;
            this._showHudMessage('🔮 The Altar awakens! A stash of loot appears! Full heal and power granted!');
            // Reward: full heal + damage boost
            this.player.hp = this.player.maxHp;
            this.player.dmgBoost = true;
            this.player.dmgBoostTimer = 600; // 10 seconds
            // === HALBERD REWARD — granted on puzzle solve ===
            if (!this.player.hasWeapons.halberd) {
              this.player.hasWeapons.halberd = true;
              this.player.weapon = 'halberd';
              this._showWeaponPickup('halberd');
              this._showHudMessage('⚔️ RUNIC HALBERD unlocked! The runes bestow their ancient weapon! Wide sweeping strikes pierce shields!');
            }
            // === STASH REWARD — drops around altar ===
            const altarX = rp.altar.x;
            const altarY = rp.altar.y;
            // Shield pickup
            this.pickups.push({ x: altarX - 40, y: altarY - 30, type: 'shield', collected: false });
            // Health pickups
            this.pickups.push({ x: altarX + 40, y: altarY - 30, type: 'health', collected: false });
            this.pickups.push({ x: altarX, y: altarY + 40, type: 'health', collected: false });
            // Damage boost
            this.pickups.push({ x: altarX - 40, y: altarY + 40, type: 'damage', collected: false });
            // Speed boost
            this.pickups.push({ x: altarX + 40, y: altarY + 40, type: 'speed', collected: false });
            // Special powerup — lifesteal or thorns
            const specialType = Math.random() < 0.5 ? 'lifesteal' : 'thorns';
            this.pickups.push({ x: altarX, y: altarY - 50, type: specialType, collected: false });
            // Spawn celebration particles around the stash
            for (let s = 0; s < 30; s++) {
              const angle = (s / 30) * Math.PI * 2;
              this.particles.push({
                x: altarX, y: altarY,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 40,
                color: ['#ffd700', '#44ff44', '#ff44ff', '#44ddff'][s % 4],
                size: 3,
              });
            }
            // Resume waves after short delay
            setTimeout(() => {
              this.waveState = 'pause';
              this.wavePauseTimer = 120;
            }, 1500);
          }
        } else {
          // Wrong rune! Reset
          rp.playerSequence = [];
          rp.runes.forEach(ru => { ru.stepped = false; });
          rp.failFlash = 30;
          this._playSound('hit');
          this.shakeAmount = 3;
          this.shakeTimer = 8;
          this._showHudMessage('Wrong order! Remember: Water → Fire → Wind → Earth');
        }
      }
    });
  }

  _updateWeaponPickupIndicator() {
    if (this.weaponPickupTimer > 0) {
      this.weaponPickupTimer--;
    }
  }

  // ─── LAVA POOL SYSTEM ──────────────────────────────────────────────────
  _updateLavaPools() {
    if (!this.waveLevel || !this.lavaPools) return;
    
    // Spawn new lava pools periodically
    this.lavaPoolSpawnTimer++;
    if (this.lavaPoolSpawnTimer >= 180 && this.lavaPools.length < this.lavaPoolMaxActive) { // every 3 seconds
      this.lavaPoolSpawnTimer = 0;
      // Spawn in arena area (avoid walls and edges)
      const margin = 120;
      const lx = margin + Math.random() * (this.worldWidth - margin * 2);
      const ly = margin + Math.random() * (this.worldHeight - margin * 2);
      this.lavaPools.push({
        x: lx, y: ly,
        radius: 5,
        maxRadius: 25 + Math.random() * 20,
        growRate: 0.3 + Math.random() * 0.2,
        phase: 'growing', // growing → active → shrinking → done
        activeTimer: 0,
        activeDuration: 300 + Math.random() * 200, // 5-8 seconds active
        damageTimer: 0,
        opacity: 0,
        bubbles: [],
      });
    }
    
    // Update each pool
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    
    this.lavaPools = this.lavaPools.filter(pool => {
      if (pool.phase === 'growing') {
        pool.radius += pool.growRate;
        pool.opacity = Math.min(1, pool.opacity + 0.03);
        if (pool.radius >= pool.maxRadius) {
          pool.phase = 'active';
          pool.radius = pool.maxRadius;
        }
      } else if (pool.phase === 'active') {
        pool.activeTimer++;
        // Bubbling effect
        if (Math.random() > 0.85) {
          pool.bubbles.push({
            x: pool.x + (Math.random() - 0.5) * pool.radius * 1.5,
            y: pool.y + (Math.random() - 0.5) * pool.radius * 1.5,
            size: 2 + Math.random() * 3,
            life: 20 + Math.random() * 15,
          });
        }
        if (pool.activeTimer >= pool.activeDuration) {
          pool.phase = 'shrinking';
        }
      } else if (pool.phase === 'shrinking') {
        pool.radius -= pool.growRate * 1.5;
        pool.opacity -= 0.02;
        if (pool.radius <= 0 || pool.opacity <= 0) {
          return false; // Remove pool
        }
      }
      
      // Update bubbles
      pool.bubbles = pool.bubbles.filter(b => {
        b.life--;
        b.y -= 0.3;
        b.size *= 0.97;
        return b.life > 0;
      });
      
      // Damage player if touching
      if (pool.phase !== 'shrinking' || pool.radius > 5) {
        const playerDist = Math.hypot(px - pool.x, py - pool.y);
        if (playerDist < pool.radius + 8) {
          pool.damageTimer++;
          if (pool.damageTimer >= 30) { // damage every half second
            pool.damageTimer = 0;
            this._damagePlayer(8);
            // Fire particles on player
            for (let i = 0; i < 4; i++) {
              this.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3,
                life: 15, color: i % 2 === 0 ? '#ff4400' : '#ffaa00', size: 3,
              });
            }
          }
        }
      }
      
      return true;
    });
  }

  _drawLavaPools(ctx) {
    if (!this.lavaPools || this.lavaPools.length === 0) return;
    
    this.lavaPools.forEach(pool => {
      ctx.save();
      ctx.globalAlpha = pool.opacity * 0.8;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(
        pool.x, pool.y, pool.radius * 0.3,
        pool.x, pool.y, pool.radius * 1.3
      );
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
      gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Main lava body
      const lavaGrad = ctx.createRadialGradient(
        pool.x - pool.radius * 0.2, pool.y - pool.radius * 0.2, 0,
        pool.x, pool.y, pool.radius
      );
      lavaGrad.addColorStop(0, '#ffcc00');
      lavaGrad.addColorStop(0.3, '#ff6600');
      lavaGrad.addColorStop(0.7, '#cc2200');
      lavaGrad.addColorStop(1, '#880000');
      ctx.fillStyle = lavaGrad;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Animated surface — bright veins
      const time = this.elapsed * 2;
      ctx.globalAlpha = pool.opacity * 0.5;
      for (let i = 0; i < 3; i++) {
        const angle = time + i * 2.1;
        const vx = pool.x + Math.cos(angle) * pool.radius * 0.5;
        const vy = pool.y + Math.sin(angle) * pool.radius * 0.4;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(vx, vy, pool.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Bubbles
      ctx.globalAlpha = pool.opacity;
      pool.bubbles.forEach(b => {
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Crust edge
      ctx.globalAlpha = pool.opacity * 0.6;
      ctx.strokeStyle = '#441100';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    });
  }

  _drawRunePuzzle(ctx) {
    if (!this.runePuzzle) return;
    const rp = this.runePuzzle;

    // Draw altar in center (always visible once in level 3.5)
    if (this.level === 3.5) {
      const a = rp.altar;
      const altarPulse = 0.4 + Math.sin(this.elapsed * 2) * 0.15;
      ctx.globalAlpha = rp.altar.active ? 1 : 0.4;
      // Altar base
      ctx.fillStyle = rp.altar.active ? '#aa88ff' : '#444466';
      ctx.fillRect(a.x - 15, a.y - 15, 30, 30);
      ctx.fillStyle = rp.altar.active ? '#ccaaff' : '#555577';
      ctx.fillRect(a.x - 12, a.y - 12, 24, 24);
      // Altar glow
      if (rp.altar.active) {
        ctx.globalAlpha = altarPulse;
        ctx.fillStyle = '#bb88ff';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Only draw runes in level 3.5 when puzzle is active, or briefly after solve (dissolve)
    if (this.level !== 3.5) return;
    // After solved: fade-out dissolve over ~60 frames, then stop drawing
    if (rp.solved) {
      if (rp.dissolveTimer === undefined) rp.dissolveTimer = 0;
      rp.dissolveTimer++;
      if (rp.dissolveTimer > 60) return; // fully dissolved, stop drawing runes
      const dissolveFactor = 1 - (rp.dissolveTimer / 60);
      // Draw dissolving runes
      const symbolColors = { water: '#4488ff', fire: '#ff4422', wind: '#88ffcc', earth: '#886622' };
      rp.runes.forEach(r => {
        ctx.save();
        const col = symbolColors[r.symbol];
        ctx.globalAlpha = dissolveFactor * 0.8;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 12 + (1 - dissolveFactor) * 8, 0, Math.PI * 2);
        ctx.fill();
        // Dissolve sparks
        if (rp.dissolveTimer % 5 === 0 && rp.dissolveTimer < 50) {
          for (let sp = 0; sp < 3; sp++) {
            this.particles.push({
              x: r.x + (Math.random() - 0.5) * 20,
              y: r.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 1,
              life: 20 + Math.random() * 15,
              color: col,
              size: 2 + Math.random() * 2,
            });
          }
        }
        ctx.restore();
      });
      return;
    }
    if (!rp.active) return;

    const symbolColors = { water: '#4488ff', fire: '#ff4422', wind: '#88ffcc', earth: '#886622' };
    const symbolIcons = { water: '~', fire: '🔥', wind: '◯', earth: '▲' };

    rp.runes.forEach(r => {
      ctx.save();
      const col = symbolColors[r.symbol];

      // Outer ring
      ctx.globalAlpha = r.glow;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle
      ctx.fillStyle = r.stepped ? col : '#1a1a2e';
      ctx.globalAlpha = r.stepped ? 0.9 : 0.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Symbol
      ctx.globalAlpha = 1;
      ctx.fillStyle = r.stepped ? '#fff' : col;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = { water: '≋', fire: '♦', wind: '❋', earth: '▲' };
      ctx.fillText(labels[r.symbol], r.x, r.y);

      // Label below
      ctx.font = '7px monospace';
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.7;
      ctx.fillText(r.symbol.toUpperCase(), r.x, r.y + 22);

      // Glow particles when active
      if (rp.active && !r.stepped) {
        ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 5 + r.order) * 0.2;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Fail flash overlay
    if (rp.failFlash > 0) {
      ctx.globalAlpha = rp.failFlash / 30 * 0.3;
      ctx.fillStyle = '#ff0000';
      rp.runes.forEach(r => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  _updateWaveSystem() {
    if (!this.waveLevel || this.wavesCleared) return;

    // Update wave spawn effects
    this.waveSpawnEffects = this.waveSpawnEffects.filter(e => {
      e.timer--;
      return e.timer > 0;
    });

    // Update wave announce timer
    if (this.waveAnnounceTimer > 0) this.waveAnnounceTimer--;

    if (this.waveState === 'pause') {
      this.wavePauseTimer--;
      if (this.wavePauseTimer <= 0) {
        this._spawnWave(this.currentWave + 1);
      }
    } else if (this.waveState === 'active') {
      const alive = this.enemies.filter(e => !e.dead).length;
      this.waveEnemiesRemaining = alive;
      
      // Periodic health drops during waves (every 15 seconds, but NOT on waves 6 and 7)
      if (!this.waveHealthDropTimer) this.waveHealthDropTimer = 0;
      this.waveHealthDropTimer++;
      if (this.waveHealthDropTimer >= 900) { // 15 seconds at 60fps
        // NO health drops during waves 6 and 7
        if (this.currentWave < 6) {
          const existingHealth = this.pickups.filter(p => p.type === 'health' && !p.collected).length;
          if (existingHealth < 2) {
            // Spawn health pickup in arena center
            this.pickups.push({ 
              x: 300 + Math.random() * 300, 
              y: 200 + Math.random() * 400, 
              type: 'health', 
              collected: false 
            });
          }
        }
        this.waveHealthDropTimer = 0;
      }
      
      // Update lava pools during waves
      this._updateLavaPools();
      
      if (alive === 0) {
        // Wave cleared
        if (this.currentWave >= this.totalWaves) {
          // All waves done
          this.waveState = 'complete';
          this.wavesCleared = true;
          this.waveHealthDropTimer = 0; // Reset timer
          this._playSound('victory');
          this.shakeAmount = 8;
          this.shakeTimer = 20;
          this._showHudMessage('🏰 ALL WAVES DEFEATED! The path to the boss is open! 🏰');
          // Open the gate
          this.gates.forEach(g => {
            if (g.requireWaves) g.open = true;
          });
          // Drop health pickups between waves
          this.pickups.push({ x: 300, y: 400, type: 'health', collected: false });
          this.pickups.push({ x: 400, y: 400, type: 'health', collected: false });
          // === REWARD: BLADES OF CHAOS — granted directly ===
          this.player.hasWeapons.bladesOfChaos = true;
          this.player.weapon = 'bladesOfChaos';
          this._showWeaponPickup('bladesOfChaos');
          this._showHudMessage('⛓️🔥 REWARD UNLOCKED: BLADES OF CHAOS! Click: combo | Hold+Release: SPINNING FURY! 🔥⛓️');
          // Grant temporary buffs to celebrate
          this.player.dmgBoost = true;
          this.player.dmgBoostTimer = Math.max(this.player.dmgBoostTimer || 0, 300);
          this.player.speedBoost = true;
          this.player.speedBoostTimer = Math.max(this.player.speedBoostTimer || 0, 300);
          // Dramatic particle burst at player position
          const pcx = this.player.x + this.player.width / 2;
          const pcy = this.player.y + this.player.height / 2;
          for (let bc = 0; bc < 50; bc++) {
            const angle = (bc / 50) * Math.PI * 2;
            this.particles.push({
              x: pcx, y: pcy,
              vx: Math.cos(angle) * (2 + Math.random() * 4),
              vy: Math.sin(angle) * (2 + Math.random() * 4),
              life: 50, color: ['#ff3300', '#ff6600', '#ff9900', '#ffcc00'][bc % 4], size: 3 + Math.random() * 2,
            });
          }
          // Silence moment - tension
          // Captain death gets extra screen shake
          this.waveAnnounceText = 'THE PATH IS OPEN';
          this.waveAnnounceTimer = 180;
        } else {
          // Pause before next wave
          this.waveState = 'pause';
          this.wavePauseTimer = 150; // 2.5 second pause
          this.waveHealthDropTimer = 0; // Reset drop timer

          // Activate rune puzzle after wave 3 — Halberd granted on puzzle solve
          if (this.currentWave === 3 && this.runePuzzle && !this.runePuzzle.solved) {
            this.runePuzzle.active = true;
            this.waveState = 'puzzle';
            this._showHudMessage('🔮 Ancient runes awaken! Step on them in the correct order: Water → Fire → Wind → Earth');
          }

          // Screen shake for wave clear
          this.shakeAmount = 5;
          this.shakeTimer = 10;
          this._playSound('gate');

          // Health drops between waves — NO health drops during waves 6 & 7
          if (this.currentWave < 6) {
            // Spawn 2-3 health pickups in arena area (larger arena)
            this.pickups.push({ x: 200 + Math.random() * 500, y: 200 + Math.random() * 500, type: 'health', collected: false });
            this.pickups.push({ x: 200 + Math.random() * 500, y: 200 + Math.random() * 500, type: 'health', collected: false });
            if (Math.random() > 0.5) {
              this.pickups.push({ x: 200 + Math.random() * 500, y: 200 + Math.random() * 500, type: 'health', collected: false });
            }
          }

          this._showHudMessage(`Wave ${this.currentWave} cleared! Prepare for the next!`);
        }
      }
    }
  }

  // ─── ENDING SEQUENCE ─────────────────────────────────────────────────
  _startEnding() {
    this.ending = true;
    this.endingTimer = 0;
    this.endingPhase = 0;
    this.boss = null;
    this.endingDialogueIndex = 0;
    this.endingDialogues = [
      { phase: 2, speaker: 'toothless', text: '*happy dragon warble*', color: '#88ddff' },
      { phase: 2, speaker: 'hero', text: '"Hey bud... I\'m here."', color: '#4488ff' },
      { phase: 3, speaker: 'toothless', text: '*nuzzles Hiccup*', color: '#88ddff' },
      { phase: 3, speaker: 'hero', text: '"Nobody takes you from me. Nobody."', color: '#4488ff' },
      { phase: 4, speaker: 'toothless', text: '*joyful roar*', color: '#88ddff' },
      { phase: 4, speaker: 'hero', text: '"Together, bud. Always."', color: '#4488ff' },
    ];
  }

  _updateEnding() {
    this.endingTimer++;

    if (this.endingPhase === 0 && this.endingTimer > 150) {
      this.endingPhase = 1; // Show Toothless
    }
    if (this.endingPhase === 1 && this.endingTimer > 400) {
      this.endingPhase = 2; // First dialogue pair
    }
    if (this.endingPhase === 2 && this.endingTimer > 700) {
      this.endingPhase = 3; // Second dialogue pair
    }
    if (this.endingPhase === 3 && this.endingTimer > 1000) {
      this.endingPhase = 4; // Final dialogue pair
    }
    if (this.endingPhase === 4 && this.endingTimer > 1350) {
      this.endingPhase = 5; // Victory screen
    }
    if (this.endingPhase === 5 && this.endingTimer > 1700) {
      // Game complete!
      this._endGame(true);
    }
  }

  // ─── HUD MESSAGE ─────────────────────────────────────────────────────
  _showHudMessage(msg) {
    this.hudMessage = msg;
    // Longer timer for longer messages
    const baseTime = 300;
    const extraTime = Math.max(0, (msg.length - 50) * 3);
    this.hudMessageTimer = baseTime + extraTime;
  }
  
  _showWeaponPickup(weaponType) {
    this.weaponPickupIndicator = weaponType;
    this.weaponPickupTimer = 420; // 7 seconds
  }
  
  _toggleHelp() {
    this.showingHelp = !this.showingHelp;
    if (this.showingHelp) {
      this.paused = true;
    } else {
      this.paused = false;
    }
  }

  // ─── COLLISION ────────────────────────────────────────────────────────
  _rectsOverlap(a, b) {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  _collidesWithWalls(rect) {
    return this.walls.some(w => this._rectsOverlap(rect, w));
  }

  // ─── DRAW ─────────────────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const s = this.scale;

    ctx.save();

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (this.shakeAmount > 0 && this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
      shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
    }

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.translate(shakeX, shakeY);
    ctx.scale(s, s);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Draw world
    this._drawTiles(ctx);
    this._drawDungeonDecorations(ctx);
    this._drawWalls(ctx);
    this._drawCircuitPuzzle(ctx);
    this._drawHazards(ctx);
    this._drawLavaPools(ctx);
    this._drawRunePuzzle(ctx);
    this._drawPickups(ctx);
    this._drawGates(ctx);
    this._drawEnemies(ctx);
    this._drawBoss(ctx);
    this._drawCastleKeeper(ctx);
    this._drawNPCs(ctx);
    this._drawPlayer(ctx);
    this._drawArrows(ctx);
    this._drawProjectiles(ctx);
    this._drawParticles(ctx);
    this._drawDamageNumbers(ctx);

    if (this.ending) {
      this._drawEnding(ctx);
    }

    ctx.restore();

    // HUD (screen space)
    this._drawHUD(ctx);
    
    // Weapon pickup indicator
    if (this.weaponPickupTimer > 0) {
      this._drawWeaponPickupIndicator(ctx);
    }

    // Tutorial hint bubble
    if (this.hintBubble) {
      this._drawHintBubble(ctx);
    }

    // HUD message
    if (this.hudMessageTimer > 0) {
      this.hudMessageTimer--;
      this._drawHudMessage(ctx);
    }

    // Vignette
    if (this.vignetteAlpha > 0) {
      this._drawVignette(ctx);
    }

    // Level transition overlay
    if (this.transitioning) {
      this._drawTransition(ctx);
    }
    
    // Help screen
    if (this.showingHelp) {
      this._drawHelpScreen(ctx);
    }
  }

  _drawTiles(ctx) {
    const t = this.tiles.type;
    const tw = 16;
    const h = (x, y, s) => this._tileHash(x, y, s);

    if (t === 'grass') {
      // Rich multi-shade grass with flowers, stones, grass tufts
      const greens = ['#4a9c3f', '#3d8a34', '#45932c', '#509e42', '#3a7c2e', '#56a548'];
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          // Base grass - pick from palette
          ctx.fillStyle = greens[(v * greens.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Sub-tile variation - darker blotch
          if (h(ti, tj, 1) > 0.6) {
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            const bx = (h(ti, tj, 2) * 10) | 0;
            const by = (h(ti, tj, 3) * 10) | 0;
            ctx.fillRect(x + bx, y + by, 6, 6);
          }
          // Lighter patch
          if (h(ti, tj, 4) > 0.75) {
            ctx.fillStyle = 'rgba(255,255,200,0.1)';
            ctx.fillRect(x + 2, y + 3, 8, 5);
          }
          // Grass blades (small dark lines)
          if (h(ti, tj, 5) > 0.5) {
            ctx.fillStyle = '#2d6e24';
            const gx = (h(ti, tj, 6) * 12) | 0;
            ctx.fillRect(x + gx, y + 4, 1, 4);
            ctx.fillRect(x + gx + 3, y + 6, 1, 3);
          }
          // Flowers - varied colors
          if (h(ti, tj, 7) > 0.82) {
            const flowerColors = ['#ffee44', '#ff88aa', '#ffffff', '#ff6688', '#aaddff', '#ffaadd'];
            ctx.fillStyle = flowerColors[(h(ti, tj, 8) * flowerColors.length) | 0];
            const fx = (h(ti, tj, 9) * 10 + 2) | 0;
            const fy = (h(ti, tj, 10) * 10 + 2) | 0;
            ctx.fillRect(x + fx, y + fy, 2, 2);
            ctx.fillRect(x + fx - 1, y + fy + 1, 1, 1);
            ctx.fillRect(x + fx + 2, y + fy + 1, 1, 1);
            // Stem
            ctx.fillStyle = '#2a6622';
            ctx.fillRect(x + fx, y + fy + 2, 1, 3);
          }
          // Small stone
          if (h(ti, tj, 11) > 0.92) {
            ctx.fillStyle = '#889988';
            ctx.fillRect(x + 5, y + 9, 4, 3);
            ctx.fillStyle = '#aabbaa';
            ctx.fillRect(x + 5, y + 9, 4, 1);
          }
          // Tiny mushroom
          if (h(ti, tj, 12) > 0.95) {
            ctx.fillStyle = '#cc4444';
            ctx.fillRect(x + 10, y + 8, 4, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 11, y + 8, 1, 1);
            ctx.fillRect(x + 13, y + 9, 1, 1);
            ctx.fillStyle = '#886644';
            ctx.fillRect(x + 11, y + 11, 2, 3);
          }
        }
      }
      // Cobblestone path
      this._drawPath(ctx, [
        { x: 30, y: 220, w: 120, h: 60 },
        { x: 150, y: 130, w: 150, h: 60 },
        { x: 280, y: 190, w: 20, h: 200 },
        { x: 300, y: 310, w: 160, h: 60 },
        { x: 440, y: 130, w: 20, h: 180 },
        { x: 440, y: 130, w: 130, h: 60 },
      ]);

    } else if (t === 'forest') {
      // Dark lush forest floor with undergrowth
      const greens = ['#1e4a18', '#224e1c', '#1a4014', '#265424', '#1d4616', '#2a5a22'];
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          ctx.fillStyle = greens[(v * greens.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Mossy patches
          if (h(ti, tj, 1) > 0.65) {
            ctx.fillStyle = '#305a28';
            ctx.fillRect(x + 2, y + 3, 7, 5);
          }
          // Fallen leaves
          if (h(ti, tj, 2) > 0.8) {
            const leafColors = ['#8B6914', '#a07818', '#c4962a', '#9a5a0a'];
            ctx.fillStyle = leafColors[(h(ti, tj, 3) * leafColors.length) | 0];
            const lx = (h(ti, tj, 4) * 10 + 2) | 0;
            const ly = (h(ti, tj, 5) * 10 + 2) | 0;
            ctx.fillRect(x + lx, y + ly, 3, 2);
          }
          // Mushrooms (forest floor)
          if (h(ti, tj, 6) > 0.93) {
            ctx.fillStyle = '#ddaa55';
            ctx.fillRect(x + 7, y + 10, 3, 2);
            ctx.fillStyle = '#886644';
            ctx.fillRect(x + 8, y + 12, 1, 2);
          }
          // Undergrowth fern
          if (h(ti, tj, 7) > 0.88) {
            ctx.fillStyle = '#2a6a24';
            ctx.fillRect(x + 3, y + 6, 1, 4);
            ctx.fillRect(x + 4, y + 5, 1, 3);
            ctx.fillRect(x + 5, y + 6, 1, 4);
            ctx.fillRect(x + 6, y + 7, 1, 3);
          }
          // Root/twig
          if (h(ti, tj, 8) > 0.9) {
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(x + 1, y + 11, 8, 1);
          }
        }
      }
      // River with rich water detail
      this._drawRiver(ctx, 380, 30, 24, 250);
      this._drawRiver(ctx, 380, 350, 24, 350);
      // Stone bridge
      this._drawStoneBridge(ctx, 368, 270, 48, 85);

    } else if (t === 'castle') {
      // Stone floor with mortar and cracks
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          // Stone tile shades
          const stones = ['#5a5a6a', '#4e4e5e', '#525262', '#585868', '#4a4a5a'];
          ctx.fillStyle = stones[(v * stones.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Mortar lines (lighter gaps between tiles)
          ctx.fillStyle = '#3a3a48';
          ctx.fillRect(x, y, tw, 1); // top
          ctx.fillRect(x, y, 1, tw); // left
          // Brick halving - offset every other row
          if (tj % 2 === 0) {
            ctx.fillRect(x + 8, y, 1, tw);
          } else {
            ctx.fillRect(x, y + 8, tw, 1);
          }
          // Crack details
          if (h(ti, tj, 1) > 0.88) {
            ctx.fillStyle = '#2a2a38';
            const cx2 = (h(ti, tj, 2) * 8 + 3) | 0;
            ctx.fillRect(x + cx2, y + 2, 1, 5);
            ctx.fillRect(x + cx2 + 1, y + 4, 1, 4);
          }
          // Lichen/moss spot
          if (h(ti, tj, 3) > 0.92) {
            ctx.fillStyle = '#4a6a45';
            ctx.fillRect(x + 4, y + 6, 4, 3);
          }
          // Worn/scuffed area
          if (h(ti, tj, 4) > 0.85) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.fillRect(x + 2, y + 2, tw - 4, tw - 4);
          }
        }
      }

    } else if (t === 'antechamber') {
      // Dark stone courtyard - ancient, worn, darker than castle
      const aStones = ['#3a3a4a', '#333348', '#363646', '#3e3e4e', '#313140'];
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          ctx.fillStyle = aStones[(v * aStones.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Mortar lines
          ctx.fillStyle = '#252535';
          ctx.fillRect(x, y, tw, 1);
          ctx.fillRect(x, y, 1, tw);
          if (tj % 2 === 0) {
            ctx.fillRect(x + 8, y, 1, tw);
          }
          // Blood stains
          if (h(ti, tj, 1) > 0.93) {
            ctx.fillStyle = 'rgba(100,20,20,0.25)';
            ctx.fillRect(x + 3, y + 4, 5, 4);
          }
          // Cracks
          if (h(ti, tj, 2) > 0.87) {
            ctx.fillStyle = '#1a1a28';
            const cx2 = (h(ti, tj, 3) * 8 + 3) | 0;
            ctx.fillRect(x + cx2, y + 2, 1, 6);
            ctx.fillRect(x + cx2 + 1, y + 5, 1, 4);
          }
          // Weapon debris
          if (h(ti, tj, 4) > 0.96) {
            ctx.fillStyle = '#666';
            ctx.fillRect(x + 5, y + 8, 6, 1);
            ctx.fillStyle = '#553311';
            ctx.fillRect(x + 4, y + 8, 2, 1);
          }
          // Torch scorch marks
          if (h(ti, tj, 5) > 0.95) {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

    } else if (t === 'dungeon') {
      // Infernal dungeon floor — dark stone with glowing runes, chains, lava cracks
      const dStones = ['#1a1018', '#1e1420', '#221826', '#1c1220', '#201628'];
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          ctx.fillStyle = dStones[(v * dStones.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Mortar lines — deep dark
          ctx.fillStyle = '#0a0810';
          ctx.fillRect(x, y, tw, 1);
          ctx.fillRect(x, y, 1, tw);
          if (tj % 2 === 0) {
            ctx.fillRect(x + 8, y, 1, tw);
          }
          // Glowing runes — pulsing magical symbols
          if (h(ti, tj, 1) > 0.9) {
            const runeGlow = 0.3 + Math.sin(this.elapsed * 2 + ti * 0.7 + tj * 1.3) * 0.2;
            ctx.globalAlpha = runeGlow;
            const runeColors = ['#ff2200', '#ff4400', '#cc0044', '#ff6600'];
            ctx.fillStyle = runeColors[(h(ti, tj, 6) * runeColors.length) | 0];
            // Rune shapes
            const runeType = (h(ti, tj, 7) * 3) | 0;
            if (runeType === 0) {
              ctx.fillRect(x + 5, y + 4, 6, 1);
              ctx.fillRect(x + 7, y + 3, 1, 4);
              ctx.fillRect(x + 9, y + 5, 1, 4);
            } else if (runeType === 1) {
              ctx.fillRect(x + 4, y + 6, 8, 1);
              ctx.fillRect(x + 6, y + 4, 1, 6);
              ctx.fillRect(x + 10, y + 4, 1, 6);
            } else {
              ctx.fillRect(x + 5, y + 5, 2, 2);
              ctx.fillRect(x + 9, y + 5, 2, 2);
              ctx.fillRect(x + 7, y + 3, 2, 6);
            }
            ctx.globalAlpha = 1;
          }
          // Lava cracks in floor
          if (h(ti, tj, 2) > 0.88) {
            const crackGlow = 0.4 + Math.sin(this.elapsed * 3 + ti + tj) * 0.15;
            ctx.globalAlpha = crackGlow;
            ctx.fillStyle = '#ff3300';
            const cx2 = (h(ti, tj, 3) * 6 + 3) | 0;
            ctx.fillRect(x + cx2, y + 2, 1, 6);
            ctx.fillRect(x + cx2 + 1, y + 5, 1, 5);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x + cx2, y + 4, 1, 2);
            ctx.globalAlpha = 1;
          }
          // Skull decorations
          if (h(ti, tj, 3) > 0.96) {
            ctx.fillStyle = '#888';
            ctx.fillRect(x + 5, y + 6, 6, 5);
            ctx.fillStyle = '#aaa';
            ctx.fillRect(x + 6, y + 7, 4, 3);
            ctx.fillStyle = '#111';
            ctx.fillRect(x + 6, y + 8, 1, 1);
            ctx.fillRect(x + 9, y + 8, 1, 1);
            ctx.fillRect(x + 7, y + 10, 2, 1);
          }
          // Chain links on floor
          if (h(ti, tj, 4) > 0.93) {
            ctx.fillStyle = '#555';
            ctx.fillRect(x + 2, y + 7, 3, 2);
            ctx.fillRect(x + 6, y + 7, 3, 2);
            ctx.fillRect(x + 10, y + 7, 3, 2);
            ctx.fillStyle = '#444';
            ctx.fillRect(x + 4, y + 8, 3, 1);
            ctx.fillRect(x + 8, y + 8, 3, 1);
          }
          // Torch scorch marks
          if (h(ti, tj, 5) > 0.94) {
            ctx.fillStyle = 'rgba(255,100,0,0.12)';
            ctx.beginPath();
            ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Ambient dungeon lighting — torch glow spots around edges
      const torchPositions = [
        { x: 80, y: 80 }, { x: 80, y: this.worldHeight / 2 }, { x: 80, y: this.worldHeight - 80 },
        { x: this.worldWidth - 80, y: 80 }, { x: this.worldWidth - 80, y: this.worldHeight / 2 },
        { x: this.worldWidth - 80, y: this.worldHeight - 80 },
        { x: this.worldWidth / 2, y: 80 }, { x: this.worldWidth / 2, y: this.worldHeight - 80 },
      ];
      torchPositions.forEach((tp, idx) => {
        const flicker = 0.2 + Math.sin(this.elapsed * 5 + idx * 1.5) * 0.05;
        ctx.globalAlpha = flicker;
        const torchGrad = ctx.createRadialGradient(tp.x, tp.y, 5, tp.x, tp.y, 60);
        torchGrad.addColorStop(0, 'rgba(255,150,50,0.4)');
        torchGrad.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = torchGrad;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

    } else if (t === 'throne') {
      // Dark ornate throne room floor
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          const darks = ['#1a0e1e', '#1e1222', '#22162a', '#1c1020', '#201428'];
          ctx.fillStyle = darks[(v * darks.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          // Tile border pattern
          ctx.fillStyle = '#2a1e30';
          ctx.fillRect(x, y, tw, 1);
          ctx.fillRect(x, y, 1, tw);
          // Corner ornament
          if ((ti + tj) % 3 === 0) {
            ctx.fillStyle = '#3a2844';
            ctx.fillRect(x + 6, y + 6, 4, 4);
            ctx.fillStyle = '#4a3854';
            ctx.fillRect(x + 7, y + 7, 2, 2);
          }
        }
      }
      // Rich carpet runner with gold border and pattern
      this._drawThroneCarpet(ctx);
      // Ornate throne
      this._drawThrone(ctx);
      
    } else if (t === 'puzzle') {
      // Dark circuit board / arcane chamber floor
      for (let x = 0; x < this.worldWidth; x += tw) {
        for (let y = 0; y < this.worldHeight; y += tw) {
          const ti = (x / tw) | 0, tj = (y / tw) | 0;
          const v = h(ti, tj, 0);
          
          // Dark blue-gray base
          const boardColors = ['#0a0e1a', '#0c1020', '#0e1224', '#0b0f1c', '#0d111e'];
          ctx.fillStyle = boardColors[(v * boardColors.length) | 0];
          ctx.fillRect(x, y, tw, tw);
          
          // Subtle grid lines (circuit board traces)
          ctx.fillStyle = 'rgba(40,60,100,0.15)';
          ctx.fillRect(x, y, tw, 1);
          ctx.fillRect(x, y, 1, tw);
          
          // Circuit trace patterns
          if (h(ti, tj, 1) > 0.7) {
            ctx.fillStyle = 'rgba(30,50,80,0.3)';
            const traceDir = h(ti, tj, 6) > 0.5;
            if (traceDir) {
              ctx.fillRect(x, y + 7, tw, 2);
            } else {
              ctx.fillRect(x + 7, y, 2, tw);
            }
          }
          
          // Tiny LED dots
          if (h(ti, tj, 2) > 0.92) {
            const pulse = 0.2 + Math.sin(this.elapsed * 2 + ti + tj * 0.7) * 0.15;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = h(ti, tj, 3) > 0.5 ? '#2244aa' : '#224488';
            ctx.fillRect(x + 7, y + 7, 2, 2);
            ctx.globalAlpha = 1;
          }
          
          // Chip / component decoration
          if (h(ti, tj, 4) > 0.96) {
            ctx.fillStyle = '#1a2244';
            ctx.fillRect(x + 3, y + 3, 10, 10);
            ctx.fillStyle = '#222e55';
            ctx.fillRect(x + 4, y + 4, 8, 8);
            // Pins
            ctx.fillStyle = '#334466';
            ctx.fillRect(x + 2, y + 5, 1, 2);
            ctx.fillRect(x + 2, y + 9, 1, 2);
            ctx.fillRect(x + 13, y + 5, 1, 2);
            ctx.fillRect(x + 13, y + 9, 1, 2);
          }
        }
      }
      
      // Central arcane platform area
      const platformY = 580;
      ctx.fillStyle = '#1a1e2e';
      ctx.fillRect(200, platformY, 300, 100);
      for (let bx = 200; bx < 500; bx += 20) {
        for (let by = platformY; by < platformY + 100; by += 10) {
          ctx.fillStyle = '#222640';
          ctx.fillRect(bx + 1, by + 1, 18, 8);
          ctx.fillStyle = '#2a2e48';
          ctx.fillRect(bx + 1, by + 1, 18, 2);
        }
      }
      // Platform border glow
      ctx.strokeStyle = 'rgba(68,170,255,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(200, platformY, 300, 100);
      
      // Castle wall at top with drawbridge mechanism
      const wallY = 30;
      ctx.fillStyle = '#444455';
      ctx.fillRect(0, wallY, this.worldWidth, 100);
      
      // Drawbridge (opens when puzzle solved)
      const bridgeOpen = this.puzzleSolved;
      if (!bridgeOpen) {
        // Closed drawbridge
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(this.worldWidth / 2 - 40, wallY + 70, 80, 60);
        // Wooden planks
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(this.worldWidth / 2 - 40, wallY + 70 + i * 7, 80, 6);
        }
        // Metal bands
        ctx.fillStyle = '#888';
        ctx.fillRect(this.worldWidth / 2 - 40, wallY + 80, 80, 3);
        ctx.fillRect(this.worldWidth / 2 - 40, wallY + 110, 80, 3);
        // Chains
        ctx.fillStyle = '#666';
        ctx.fillRect(this.worldWidth / 2 - 30, wallY + 50, 4, 20);
        ctx.fillRect(this.worldWidth / 2 + 26, wallY + 50, 4, 20);
      } else {
        // Open drawbridge (lowered)
        ctx.save();
        ctx.translate(this.worldWidth / 2, wallY + 130);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(-40, -60, 80, 60);
        // Wooden planks
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(-40, -60 + i * 7, 80, 6);
        }
        ctx.restore();
      }
      
      // Castle battlements
      for (let bx = 0; bx < this.worldWidth; bx += 40) {
        ctx.fillStyle = '#555566';
        ctx.fillRect(bx, wallY, 25, 30);
        ctx.fillStyle = '#666677';
        ctx.fillRect(bx + 2, wallY + 2, 21, 26);
      }
      
      // Decorative castle windows
      ctx.fillStyle = '#222233';
      ctx.fillRect(100, wallY + 40, 15, 25);
      ctx.fillRect(this.worldWidth - 115, wallY + 40, 15, 25);
      ctx.fillStyle = '#ffaa44';
      ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 2) * 0.1;
      ctx.fillRect(102, wallY + 42, 11, 21);
      ctx.fillRect(this.worldWidth - 113, wallY + 42, 11, 21);
      ctx.globalAlpha = 1;
    }
  }

  // Rich cobblestone path drawing
  _drawPath(ctx, rects) {
    rects.forEach(r => {
      // Base path color
      ctx.fillStyle = '#b89860';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Individual cobblestones
      const stoneSize = 8;
      for (let sx = r.x; sx < r.x + r.w; sx += stoneSize) {
        for (let sy = r.y; sy < r.y + r.h; sy += stoneSize) {
          const ti = (sx / stoneSize) | 0, tj = (sy / stoneSize) | 0;
          const v = this._tileHash(ti, tj, 20);
          const stoneColors = ['#c8a96e', '#bea062', '#d4b87a', '#b49558', '#caab70'];
          ctx.fillStyle = stoneColors[(v * stoneColors.length) | 0];
          const inset = 1;
          ctx.fillRect(sx + inset, sy + inset, stoneSize - inset * 2, stoneSize - inset * 2);
          // Stone highlight (top edge)
          ctx.fillStyle = 'rgba(255,255,220,0.15)';
          ctx.fillRect(sx + inset, sy + inset, stoneSize - inset * 2, 1);
          // Shadow (bottom edge)
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(sx + inset, sy + stoneSize - inset - 1, stoneSize - inset * 2, 1);
        }
      }
      // Path edges (darker border)
      ctx.fillStyle = '#8a7040';
      ctx.fillRect(r.x, r.y, r.w, 2);
      ctx.fillRect(r.x, r.y + r.h - 2, r.w, 2);
      ctx.fillRect(r.x, r.y, 2, r.h);
      ctx.fillRect(r.x + r.w - 2, r.y, 2, r.h);
    });
  }

  // Beautiful river with lily pads and lotus flowers
  _drawRiver(ctx, rx, ry, rw, rh) {
    // Water base - gradient of blues
    for (let y = ry; y < ry + rh; y += 4) {
      const wave = Math.sin((y + this.elapsed * 20) * 0.15) * 0.1;
      const r2 = 30 + wave * 20, g = 80 + wave * 30, b = 170 + Math.sin(y * 0.1) * 20;
      ctx.fillStyle = `rgb(${r2 | 0},${g | 0},${b | 0})`;
      ctx.fillRect(rx, y, rw, 4);
    }
    // Lighter wave highlights
    for (let y = ry; y < ry + rh; y += 12) {
      const wx = rx + 4 + Math.sin((y + this.elapsed * 30) * 0.2) * 3;
      ctx.fillStyle = 'rgba(100,180,255,0.3)';
      ctx.fillRect(wx, y, 8, 1);
      ctx.fillRect(wx + 3, y + 4, 6, 1);
    }
    // Sparkle highlights
    for (let y = ry + 8; y < ry + rh - 8; y += 24) {
      const sp = this._tileHash((y / 24) | 0, 0, 30);
      if (sp > 0.5) {
        const sx = rx + 4 + Math.sin(this.elapsed * 2 + y * 0.3) * 4;
        const alpha = 0.2 + Math.sin(this.elapsed * 3 + y) * 0.15;
        ctx.fillStyle = `rgba(200,230,255,${alpha})`;
        ctx.fillRect(sx, y, 2, 1);
      }
    }
    // Lily pads
    const padCount = Math.floor(rh / 60);
    for (let i = 0; i < padCount; i++) {
      const py = ry + 20 + i * 55 + (this._tileHash(i, 0, 40) * 20) | 0;
      const px = rx + 4 + (this._tileHash(i, 0, 41) * (rw - 12)) | 0;
      if (py < ry + rh - 15) {
        // Pad shadow
        ctx.fillStyle = 'rgba(0,40,80,0.3)';
        ctx.beginPath();
        ctx.ellipse(px + 1, py + 1, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lily pad (green circle with notch)
        ctx.fillStyle = '#2a8a2a';
        ctx.beginPath();
        ctx.ellipse(px, py, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lighter center
        ctx.fillStyle = '#3aaa3a';
        ctx.beginPath();
        ctx.ellipse(px, py, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Center vein line
        ctx.fillStyle = '#1a6a1a';
        ctx.fillRect(px - 4, py, 8, 1);
        // Lotus flower on some pads
        if (this._tileHash(i, 0, 42) > 0.4) {
          const bob = Math.sin(this.elapsed * 1.5 + i * 2) * 0.5;
          // Petals
          ctx.fillStyle = '#ffaacc';
          ctx.fillRect(px - 3, py - 4 + bob, 2, 3);
          ctx.fillRect(px + 1, py - 4 + bob, 2, 3);
          ctx.fillRect(px - 1, py - 5 + bob, 2, 3);
          // Inner petals (lighter)
          ctx.fillStyle = '#ffd4e8';
          ctx.fillRect(px - 1, py - 3 + bob, 2, 2);
          // Center
          ctx.fillStyle = '#ffee44';
          ctx.fillRect(px, py - 3 + bob, 1, 1);
        }
      }
    }
    // River bank edges
    ctx.fillStyle = '#3a6a2a';
    ctx.fillRect(rx - 3, ry, 3, rh);
    ctx.fillRect(rx + rw, ry, 3, rh);
    ctx.fillStyle = '#2a5a1a';
    ctx.fillRect(rx - 2, ry, 2, rh);
    ctx.fillRect(rx + rw, ry, 2, rh);
  }

  // Stone bridge with brick detail and arch shadow
  _drawStoneBridge(ctx, bx, by, bw, bh) {
    // Bridge shadow beneath
    ctx.fillStyle = 'rgba(0,20,40,0.3)';
    ctx.fillRect(bx + 4, by + bh - 4, bw - 8, 8);
    // Bridge base
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(bx, by, bw, bh);
    // Individual bricks
    const brickW = 10, brickH = 6;
    for (let sx = bx; sx < bx + bw; sx += brickW) {
      for (let sy = by; sy < by + bh; sy += brickH) {
        const ti = ((sx - bx) / brickW) | 0;
        const tj = ((sy - by) / brickH) | 0;
        const v = this._tileHash(ti + 100, tj + 100, 50);
        const brickColors = ['#9a9a9a', '#8e8e8e', '#a0a0a0', '#949494', '#a6a6a6'];
        ctx.fillStyle = brickColors[(v * brickColors.length) | 0];
        const offset = (tj % 2 === 0) ? 0 : brickW / 2;
        ctx.fillRect(sx + offset, sy + 1, brickW - 1, brickH - 1);
        // Brick highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(sx + offset, sy + 1, brickW - 1, 1);
      }
    }
    // Bridge railings
    ctx.fillStyle = '#707070';
    ctx.fillRect(bx, by, bw, 4);
    ctx.fillRect(bx, by + bh - 4, bw, 4);
    ctx.fillStyle = '#606060';
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillRect(bx, by + bh - 2, bw, 2);
    // Railing posts
    for (let px = bx; px < bx + bw; px += 12) {
      ctx.fillStyle = '#888';
      ctx.fillRect(px, by - 3, 3, 6);
      ctx.fillRect(px, by + bh - 3, 3, 6);
      ctx.fillStyle = '#999';
      ctx.fillRect(px, by - 3, 3, 2);
      ctx.fillRect(px, by + bh - 3, 3, 2);
    }
    // Moss on bridge
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(bx + 8, by + 10, 5, 2);
    ctx.fillRect(bx + bw - 16, by + bh - 14, 4, 2);
  }

  // Rich carpet for throne room
  _drawThroneCarpet(ctx) {
    const cx = 260, cw = 80;
    const carpetLen = 540;
    // Carpet base
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(cx, 30, cw, carpetLen);
    // Inner carpet - lighter red
    ctx.fillStyle = '#aa2020';
    ctx.fillRect(cx + 6, 30, cw - 12, carpetLen);
    // Gold border on both sides
    ctx.fillStyle = '#daa520';
    ctx.fillRect(cx + 2, 30, 3, carpetLen);
    ctx.fillRect(cx + cw - 5, 30, 3, carpetLen);
    // Inner gold trim
    ctx.fillStyle = '#c4962a';
    ctx.fillRect(cx + 6, 30, 1, carpetLen);
    ctx.fillRect(cx + cw - 7, 30, 1, carpetLen);
    // Diamond pattern on carpet
    for (let y = 40; y < 30 + carpetLen; y += 30) {
      const my = y;
      ctx.fillStyle = '#cc3030';
      ctx.fillRect(cx + cw / 2 - 4, my, 8, 8);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cx + cw / 2 - 2, my + 2, 4, 4);
      ctx.fillStyle = '#ffee88';
      ctx.fillRect(cx + cw / 2 - 1, my + 3, 2, 2);
    }
    // Tassels at carpet end
    for (let x = cx + 8; x < cx + cw - 8; x += 5) {
      ctx.fillStyle = '#daa520';
      ctx.fillRect(x, 30 + carpetLen, 2, 6);
    }
    // Central dais glow
    ctx.globalAlpha = 0.1 + Math.sin(this.elapsed * 1.5) * 0.05;
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.arc(300, 300, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Ornate throne at top of room
  _drawThrone(ctx) {
    const tx = 275, ty = 30;
    // Throne back (tall ornate)
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(tx, ty, 50, 8);
    ctx.fillStyle = '#a07818';
    ctx.fillRect(tx + 4, ty + 2, 42, 4);
    // Spires
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(tx + 5, ty - 10, 5, 12);
    ctx.fillRect(tx + 22, ty - 14, 6, 16);
    ctx.fillRect(tx + 40, ty - 10, 5, 12);
    // Jewels on spires
    ctx.fillStyle = '#ff2244';
    ctx.fillRect(tx + 6, ty - 8, 3, 3);
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(tx + 23, ty - 12, 4, 4);
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(tx + 41, ty - 8, 3, 3);
    // Seat
    ctx.fillStyle = '#6a1010';
    ctx.fillRect(tx + 5, ty + 8, 40, 16);
    // Cushion
    ctx.fillStyle = '#991020';
    ctx.fillRect(tx + 8, ty + 10, 34, 12);
    ctx.fillStyle = '#bb2030';
    ctx.fillRect(tx + 10, ty + 12, 30, 6);
    // Armrests
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(tx + 2, ty + 6, 6, 20);
    ctx.fillRect(tx + 42, ty + 6, 6, 20);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(tx + 3, ty + 6, 4, 3);
    ctx.fillRect(tx + 43, ty + 6, 4, 3);
  }

  _drawDungeonDecorations(ctx) {
    if (!this.dungeonDecorations || this.level !== 3.5) return;

    this.dungeonDecorations.forEach((d, idx) => {
      ctx.save();

      if (d.type === 'bones') {
        // Bone pile - scattered bones
        ctx.fillStyle = '#bba488';
        ctx.fillRect(d.x - 6, d.y, 4, 2);
        ctx.fillRect(d.x + 2, d.y - 3, 2, 6);
        ctx.fillRect(d.x - 3, d.y + 3, 6, 2);
        ctx.fillStyle = '#aa9478';
        ctx.fillRect(d.x - 4, d.y - 2, 3, 2);
        ctx.fillRect(d.x + 3, d.y + 1, 4, 2);
        // Skull
        ctx.fillStyle = '#ccbb99';
        ctx.fillRect(d.x - 1, d.y - 6, 5, 4);
        ctx.fillStyle = '#111';
        ctx.fillRect(d.x, d.y - 5, 1, 1);
        ctx.fillRect(d.x + 2, d.y - 5, 1, 1);

      } else if (d.type === 'weapon_rack') {
        // Wooden rack with weapons
        ctx.fillStyle = '#553311';
        ctx.fillRect(d.x - 10, d.y, 20, 3);
        ctx.fillRect(d.x - 10, d.y, 2, 10);
        ctx.fillRect(d.x + 8, d.y, 2, 10);
        // Sword on rack
        ctx.fillStyle = '#aaa';
        ctx.fillRect(d.x - 5, d.y + 2, 1, 8);
        ctx.fillStyle = '#886622';
        ctx.fillRect(d.x - 6, d.y + 8, 3, 2);
        // Axe on rack
        ctx.fillStyle = '#888';
        ctx.fillRect(d.x + 3, d.y + 2, 1, 8);
        ctx.fillStyle = '#777';
        ctx.fillRect(d.x + 1, d.y + 2, 4, 3);

      } else if (d.type === 'magic_circle') {
        const r = d.radius || 30;
        const pulse = 0.15 + Math.sin(this.elapsed * 1.5 + idx) * 0.08;
        ctx.globalAlpha = pulse;
        // Outer ring
        ctx.strokeStyle = '#8844cc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.strokeStyle = '#aa66ff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        // Rune marks around circle
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + this.elapsed * 0.3;
          const rx = d.x + Math.cos(ang) * r * 0.8;
          const ry = d.y + Math.sin(ang) * r * 0.8;
          ctx.fillStyle = '#7733bb';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
        }
        // Center glow
        ctx.fillStyle = '#6622aa';
        ctx.globalAlpha = pulse * 0.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

      } else if (d.type === 'cage') {
        // Iron cage alcove
        ctx.fillStyle = '#222';
        ctx.fillRect(d.x - 8, d.y - 10, 16, 20);
        // Bars
        ctx.fillStyle = '#555';
        for (let b = -6; b <= 6; b += 4) {
          ctx.fillRect(d.x + b, d.y - 10, 1, 20);
        }
        ctx.fillRect(d.x - 8, d.y - 10, 16, 1);
        ctx.fillRect(d.x - 8, d.y + 9, 16, 1);

      } else if (d.type === 'blood') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#551111';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#440808';
        ctx.beginPath();
        ctx.arc(d.x + 4, d.y + 3, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (d.type === 'torch') {
        // Animated torch bracket
        const flicker = Math.sin(this.elapsed * 8 + idx * 2.3) * 0.3;
        // Bracket
        ctx.fillStyle = '#444';
        ctx.fillRect(d.x - 2, d.y - 3, 4, 10);
        ctx.fillStyle = '#555';
        ctx.fillRect(d.x - 3, d.y + 5, 6, 2);
        // Flame
        const flameH = 6 + flicker * 2;
        ctx.fillStyle = '#ff8822';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - 3 - flameH);
        ctx.lineTo(d.x - 3, d.y - 3);
        ctx.lineTo(d.x + 3, d.y - 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - 3 - flameH * 0.6);
        ctx.lineTo(d.x - 1.5, d.y - 3);
        ctx.lineTo(d.x + 1.5, d.y - 3);
        ctx.closePath();
        ctx.fill();
        // Glow
        ctx.globalAlpha = 0.12 + flicker * 0.05;
        const tGrad = ctx.createRadialGradient(d.x, d.y - 5, 2, d.x, d.y - 5, 35);
        tGrad.addColorStop(0, 'rgba(255,150,50,0.5)');
        tGrad.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(d.x, d.y - 5, 35, 0, Math.PI * 2);
        ctx.fill();

      } else if (d.type === 'rubble') {
        // Scattered stone rubble
        ctx.fillStyle = '#3a3040';
        ctx.fillRect(d.x - 5, d.y, 4, 3);
        ctx.fillRect(d.x + 2, d.y - 2, 5, 4);
        ctx.fillRect(d.x - 2, d.y + 3, 3, 2);
        ctx.fillStyle = '#4a3a50';
        ctx.fillRect(d.x - 3, d.y - 1, 3, 2);
        ctx.fillRect(d.x + 4, d.y + 2, 3, 2);
      }

      ctx.restore();
    });
  }

  _drawWalls(ctx) {
    const t = this.tiles.type;
    this.walls.forEach(w => {
      if (t === 'grass') {
        // Hedgerow with leaf detail
        ctx.fillStyle = '#2d6a22';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        // Inner hedge (lighter)
        ctx.fillStyle = '#3a8a30';
        ctx.fillRect(w.x + 2, w.y + 2, w.width - 4, w.height - 4);
        // Leaf clusters
        for (let lx = w.x + 2; lx < w.x + w.width - 4; lx += 6) {
          for (let ly = w.y + 2; ly < w.y + w.height - 4; ly += 5) {
            const v = this._tileHash(lx, ly, 60);
            ctx.fillStyle = v > 0.5 ? '#45a038' : '#2a7a20';
            ctx.fillRect(lx, ly, 4, 3);
          }
        }
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,200,0.12)';
        ctx.fillRect(w.x + 1, w.y, w.width - 2, 2);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(w.x, w.y + w.height - 2, w.width, 2);

      } else if (t === 'forest') {
        // Trees (40x40) vs river bank walls
        if (w.width === 40 && w.height === 40) {
          this._drawTree(ctx, w.x, w.y, 40);
        } else if (w.width === 20 && w.height > 100) {
          // River bank wall - draw as mossy stone embankment
          ctx.fillStyle = '#3a5a30';
          ctx.fillRect(w.x, w.y, w.width, w.height);
          for (let sy = w.y; sy < w.y + w.height; sy += 8) {
            ctx.fillStyle = this._tileHash(w.x, sy, 61) > 0.5 ? '#4a6a40' : '#2a4a20';
            ctx.fillRect(w.x + 1, sy + 1, w.width - 2, 6);
          }
        } else {
          // Border/generic forest wall
          ctx.fillStyle = '#1a3a14';
          ctx.fillRect(w.x, w.y, w.width, w.height);
          ctx.fillStyle = '#224a1c';
          ctx.fillRect(w.x + 1, w.y + 1, w.width - 2, w.height - 2);
        }

      } else if (t === 'castle') {
        // Stone brick wall with mortar and detail
        ctx.fillStyle = '#555566';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        // Individual bricks
        const bw2 = 10, bh2 = 6;
        for (let bx = w.x; bx < w.x + w.width; bx += bw2) {
          for (let by = w.y; by < w.y + w.height; by += bh2) {
            const ti = ((bx - w.x) / bw2) | 0;
            const tj = ((by - w.y) / bh2) | 0;
            const v = this._tileHash(ti + w.x, tj + w.y, 62);
            const brickC = ['#666677', '#5e5e6f', '#6a6a7b', '#626272', '#6e6e7f'];
            ctx.fillStyle = brickC[(v * brickC.length) | 0];
            const off = (tj % 2 === 0) ? 0 : bw2 / 2;
            const bx2 = bx + off;
            if (bx2 < w.x + w.width) {
              ctx.fillRect(bx2 + 1, by + 1, Math.min(bw2 - 1, w.x + w.width - bx2 - 1), bh2 - 1);
            }
          }
        }
        // Top capstone (crenellation style)
        if (w.height > 15) {
          ctx.fillStyle = '#777788';
          ctx.fillRect(w.x, w.y, w.width, 3);
          ctx.fillStyle = '#888899';
          ctx.fillRect(w.x, w.y, w.width, 1);
        }
        // Cracks on larger walls
        if (w.width > 25 && w.height > 25) {
          ctx.fillStyle = '#3a3a4a';
          const cx2 = w.x + (this._tileHash(w.x, w.y, 63) * (w.width - 10)) | 0 + 5;
          ctx.fillRect(cx2, w.y + 5, 1, Math.min(w.height - 10, 20));
          ctx.fillRect(cx2 + 1, w.y + 8, 1, Math.min(w.height - 15, 15));
        }
        // Torch sconce on some walls
        if (w.height > 100 && this._tileHash(w.x, w.y, 64) > 0.5) {
          const tx = w.x + w.width / 2 - 2;
          const ty = w.y + 30;
          ctx.fillStyle = '#886644';
          ctx.fillRect(tx, ty, 4, 6);
          // Flame
          ctx.fillStyle = '#ff8822';
          ctx.fillRect(tx, ty - 4, 4, 4);
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(tx + 1, ty - 3, 2, 2);
          // Light glow
          ctx.globalAlpha = 0.08 + Math.sin(this.elapsed * 5) * 0.03;
          ctx.fillStyle = '#ffaa44';
          ctx.beginPath();
          ctx.arc(tx + 2, ty - 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

      } else if (t === 'throne') {
        // Dark ornate walls
        ctx.fillStyle = '#2a1a2e';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        ctx.fillStyle = '#3a2a3e';
        ctx.fillRect(w.x + 2, w.y + 2, w.width - 4, w.height - 4);
        // Pillar detail for square walls (30x30 original, 35x35 corner, 20x20 altar)
        const isSquarePillar = Math.abs(w.width - w.height) < 6 && w.width >= 20 && w.width <= 50;
        if (isSquarePillar) {
          const pw = w.width, ph = w.height;
          // Column body
          ctx.fillStyle = '#4a3a50';
          ctx.fillRect(w.x + 4, w.y + 4, pw - 8, ph - 8);
          ctx.fillStyle = '#5a4a60';
          ctx.fillRect(w.x + pw * 0.2, w.y + 2, pw * 0.6, ph - 4);
          // Capital (top trim)
          ctx.fillStyle = '#6a5a70';
          ctx.fillRect(w.x + pw * 0.15, w.y + 2, pw * 0.7, 4);
          // Gold trim
          ctx.fillStyle = '#c4962a';
          ctx.fillRect(w.x + pw * 0.2, w.y + 3, pw * 0.6, 1);
          ctx.fillRect(w.x + pw * 0.2, w.y + ph - 4, pw * 0.6, 1);
          // Larger pillars get extra decoration
          if (pw >= 35) {
            // Skull emblem
            ctx.fillStyle = '#888';
            ctx.fillRect(w.x + pw / 2 - 3, w.y + ph / 2 - 4, 6, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(w.x + pw / 2 - 2, w.y + ph / 2 - 2, 2, 2);
            ctx.fillRect(w.x + pw / 2 + 1, w.y + ph / 2 - 2, 2, 2);
          }
          if (pw <= 20) {
            // Small altar pillars - runic glow
            ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 2 + w.x) * 0.1;
            ctx.fillStyle = '#ff4466';
            ctx.beginPath();
            ctx.arc(w.x + pw / 2, w.y + ph / 2, pw * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
        // Gold trim on walls
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(w.x, w.y, w.width, 1);

      } else if (t === 'antechamber') {
        // Antechamber stone walls - darker, more rugged
        ctx.fillStyle = '#3a3a48';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        ctx.fillStyle = '#444458';
        ctx.fillRect(w.x + 2, w.y + 2, w.width - 4, w.height - 4);
        const isAPillar = Math.abs(w.width - w.height) < 6 && w.width >= 20 && w.width <= 40;
        if (isAPillar) {
          // Broken pillar appearance
          ctx.fillStyle = '#4a4a5a';
          ctx.fillRect(w.x + 3, w.y + 3, w.width - 6, w.height - 6);
          ctx.fillStyle = '#5a5a6a';
          ctx.fillRect(w.x + w.width * 0.25, w.y + 2, w.width * 0.5, w.height - 4);
          // Cracks
          ctx.fillStyle = '#2a2a38';
          ctx.fillRect(w.x + w.width / 2, w.y + 4, 1, w.height - 8);
          // Mossy base
          ctx.fillStyle = '#3a5a3a';
          ctx.fillRect(w.x + 3, w.y + w.height - 5, w.width - 6, 3);
        }
        // Top edge
        ctx.fillStyle = '#555568';
        ctx.fillRect(w.x, w.y, w.width, 2);

      } else if (t === 'dungeon') {
        // Infernal dungeon walls — dark obsidian with red rune glow
        ctx.fillStyle = '#1a0e18';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        ctx.fillStyle = '#241420';
        ctx.fillRect(w.x + 2, w.y + 2, w.width - 4, w.height - 4);
        
        const isDPillar = Math.abs(w.width - w.height) < 8 && w.width >= 20 && w.width <= 40;
        if (isDPillar) {
          // Obsidian pillar with rune glow
          ctx.fillStyle = '#2a1a2a';
          ctx.fillRect(w.x + 3, w.y + 3, w.width - 6, w.height - 6);
          ctx.fillStyle = '#3a2a3a';
          ctx.fillRect(w.x + w.width * 0.2, w.y + 2, w.width * 0.6, w.height - 4);
          // Glowing rune line
          const runeGlow = 0.3 + Math.sin(this.elapsed * 3 + w.x * 0.1) * 0.2;
          ctx.globalAlpha = runeGlow;
          ctx.fillStyle = '#ff3300';
          ctx.fillRect(w.x + w.width / 2 - 1, w.y + 4, 2, w.height - 8);
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(w.x + w.width / 2, w.y + 6, 1, w.height - 12);
          ctx.globalAlpha = 1;
          // Iron bands
          ctx.fillStyle = '#444';
          ctx.fillRect(w.x + 3, w.y + 4, w.width - 6, 2);
          ctx.fillRect(w.x + 3, w.y + w.height - 6, w.width - 6, 2);
        } else {
          // Standard wall — dark bricks with red mortar glow
          const bw2 = 10, bh2 = 6;
          for (let bx = w.x; bx < w.x + w.width; bx += bw2) {
            for (let by = w.y; by < w.y + w.height; by += bh2) {
              const ti = ((bx - w.x) / bw2) | 0;
              const tj = ((by - w.y) / bh2) | 0;
              const v = this._tileHash(ti + w.x, tj + w.y, 65);
              const brickC = ['#2a1a28', '#281820', '#2e1e2a', '#261624', '#301e2e'];
              ctx.fillStyle = brickC[(v * brickC.length) | 0];
              const off = (tj % 2 === 0) ? 0 : bw2 / 2;
              const bx2 = bx + off;
              if (bx2 < w.x + w.width) {
                ctx.fillRect(bx2 + 1, by + 1, Math.min(bw2 - 1, w.x + w.width - bx2 - 1), bh2 - 1);
              }
            }
          }
          // Red glow mortar
          ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 2) * 0.05;
          ctx.fillStyle = '#ff2200';
          ctx.fillRect(w.x, w.y, w.width, 1);
          ctx.fillRect(w.x, w.y, 1, w.height);
          ctx.globalAlpha = 1;
        }
        // Top edge — ember glow
        ctx.fillStyle = '#3a2030';
        ctx.fillRect(w.x, w.y, w.width, 2);
        // Chains hanging on tall walls
        if (w.height > 80 && this._tileHash(w.x, w.y, 66) > 0.4) {
          ctx.fillStyle = '#555';
          const chainX = w.x + w.width / 2;
          for (let cy = w.y + 5; cy < w.y + w.height - 10; cy += 6) {
            ctx.fillRect(chainX - 1, cy, 3, 4);
            ctx.fillStyle = '#666';
            ctx.fillRect(chainX, cy + 1, 1, 2);
            ctx.fillStyle = '#555';
          }
        }
      }
    });
  }

  // Draw a lush tree with multi-shade canopy
  _drawTree(ctx, tx, ty, size) {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(tx + size / 2, ty + size - 4, size / 2 + 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(tx + 14, ty + 18, 12, 18);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(tx + 16, ty + 20, 8, 14);
    // Trunk bark texture
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(tx + 17, ty + 22, 2, 6);
    ctx.fillRect(tx + 20, ty + 25, 1, 4);
    // Root details
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(tx + 12, ty + 34, 4, 3);
    ctx.fillRect(tx + 24, ty + 34, 4, 3);
    // Canopy - layered circles of green shades
    const cx = tx + size / 2, cy = ty + 12;
    // Outer canopy (darkest)
    ctx.fillStyle = '#1a5a14';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mid canopy
    ctx.fillStyle = '#2a7a22';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 1, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner highlight
    ctx.fillStyle = '#3a9a32';
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 3, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Top bright spot (sunlit)
    ctx.fillStyle = '#4aaa42';
    ctx.beginPath();
    ctx.ellipse(cx - 5, cy - 5, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Leaf cluster dots for texture
    const leafDots = [[cx - 8, cy - 6], [cx + 6, cy - 4], [cx - 10, cy + 2], [cx + 10, cy + 1],
    [cx - 4, cy + 8], [cx + 4, cy + 7], [cx - 12, cy - 1], [cx + 8, cy - 8]];
    leafDots.forEach(([lx, ly]) => {
      const v = this._tileHash(lx | 0, ly | 0, 65);
      ctx.fillStyle = v > 0.5 ? '#2a6a22' : '#4aaa42';
      ctx.fillRect(lx, ly, 3, 2);
    });
  }

  _drawCircuitPuzzle(ctx) {
    if (this.level !== 2.5) return;
    
    // ── Draw connection lines between adjacent nodes ──
    // This shows the "wiring" grid so players understand node relationships
    const allPoints = [
      this.powerSource,
      ...this.circuitNodes,
      this.gateNode
    ];
    
    // Draw subtle grid lines connecting nodes that are 100px apart
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    allPoints.forEach(a => {
      allPoints.forEach(b => {
        if (a === b) return;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if ((dx === 100 && dy === 0) || (dx === 0 && dy === 100)) {
          const bothPowered = (a.powered || a === this.powerSource) && (b.powered || b === this.powerSource);
          ctx.strokeStyle = bothPowered ? 'rgba(68,170,255,0.25)' : 'rgba(100,100,120,0.15)';
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });
    
    // ── Draw power source ──
    const ps = this.powerSource;
    // Outer glow ring
    const glowPulse = 0.3 + Math.sin(this.elapsed * 3) * 0.2;
    ctx.globalAlpha = glowPulse * 0.5;
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = glowPulse;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Main body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 22, 0, Math.PI * 2);
    ctx.fill();
    // Inner ring
    ctx.strokeStyle = '#fff8aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    // Lightning bolt symbol
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(ps.x + 2, ps.y - 12);
    ctx.lineTo(ps.x - 4, ps.y + 1);
    ctx.lineTo(ps.x + 1, ps.y + 1);
    ctx.lineTo(ps.x - 2, ps.y + 12);
    ctx.lineTo(ps.x + 4, ps.y - 1);
    ctx.lineTo(ps.x - 1, ps.y - 1);
    ctx.closePath();
    ctx.fill();
    // Label
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SOURCE', ps.x, ps.y + 32);
    
    // ── Draw gate node (target) ──
    const gn = this.gateNode;
    // Outer glow when powered
    if (gn.powered) {
      ctx.globalAlpha = 0.2 + Math.sin(this.elapsed * 4) * 0.15;
      ctx.fillStyle = '#44ff44';
      ctx.beginPath();
      ctx.arc(gn.x, gn.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Hexagonal gate shape
    ctx.fillStyle = gn.powered ? '#33cc33' : '#444455';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = gn.x + Math.cos(angle) * 28;
      const hy = gn.y + Math.sin(angle) * 28;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    // Inner hexagon
    ctx.fillStyle = gn.powered ? '#55ee55' : '#555566';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = gn.x + Math.cos(angle) * 22;
      const hy = gn.y + Math.sin(angle) * 22;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    // Border
    ctx.strokeStyle = gn.powered ? '#88ff88' : '#666677';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = gn.x + Math.cos(angle) * 28;
      const hy = gn.y + Math.sin(angle) * 28;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    // Gate icon (drawbridge)
    ctx.fillStyle = gn.powered ? '#fff' : '#777';
    ctx.fillRect(gn.x - 8, gn.y - 12, 16, 24);
    ctx.fillStyle = gn.powered ? '#55ee55' : '#555566';
    ctx.fillRect(gn.x - 6, gn.y - 10, 12, 20);
    ctx.fillStyle = gn.powered ? '#fff' : '#777';
    ctx.fillRect(gn.x - 4, gn.y - 8, 8, 8);
    // Label
    ctx.fillStyle = gn.powered ? '#44ff44' : '#888';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GATE', gn.x, gn.y + 38);
    
    // ── Draw circuit nodes ──
    this.circuitNodes.forEach(node => {
      const powered = node.powered;
      
      // Hover detection for visual feedback
      const mx = this.mousePos.x / this.scale + this.camera.x;
      const my = this.mousePos.y / this.scale + this.camera.y;
      const isHovered = Math.hypot(mx - node.x, my - node.y) < 30;
      
      // Outer glow
      if (powered) {
        ctx.globalAlpha = 0.25 + Math.sin(this.elapsed * 5 + node.x * 0.1) * 0.12;
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      
      // Hover highlight ring
      if (isHovered && !this.puzzleSolved) {
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Node background circle
      const grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, 22);
      if (powered) {
        grad.addColorStop(0, '#66ccff');
        grad.addColorStop(0.6, '#3388cc');
        grad.addColorStop(1, '#225588');
      } else {
        grad.addColorStop(0, '#666677');
        grad.addColorStop(0.6, '#444455');
        grad.addColorStop(1, '#333344');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Border ring
      ctx.strokeStyle = powered ? '#88ddff' : '#555566';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.fillStyle = powered ? '#1a2a44' : '#222233';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw node pattern based on type and rotation
      ctx.strokeStyle = powered ? '#aaddff' : '#667';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (node.type === 'straight') {
        if (node.rotation % 2 === 0) { // vertical
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - 14);
          ctx.lineTo(node.x, node.y + 14);
          ctx.stroke();
          // Connector dots at endpoints
          ctx.fillStyle = powered ? '#88ddff' : '#555';
          ctx.beginPath(); ctx.arc(node.x, node.y - 14, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(node.x, node.y + 14, 3, 0, Math.PI * 2); ctx.fill();
        } else { // horizontal
          ctx.beginPath();
          ctx.moveTo(node.x - 14, node.y);
          ctx.lineTo(node.x + 14, node.y);
          ctx.stroke();
          ctx.fillStyle = powered ? '#88ddff' : '#555';
          ctx.beginPath(); ctx.arc(node.x - 14, node.y, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(node.x + 14, node.y, 3, 0, Math.PI * 2); ctx.fill();
        }
      } else if (node.type === 'corner') {
        const angles = [
          [0, -14, 14, 0],  // up-right
          [14, 0, 0, 14],   // right-down
          [0, 14, -14, 0],  // down-left
          [-14, 0, 0, -14]  // left-up
        ];
        const [x1, y1, x2, y2] = angles[node.rotation];
        ctx.beginPath();
        ctx.moveTo(node.x + x1, node.y + y1);
        ctx.quadraticCurveTo(node.x, node.y, node.x + x2, node.y + y2);
        ctx.stroke();
        ctx.fillStyle = powered ? '#88ddff' : '#555';
        ctx.beginPath(); ctx.arc(node.x + x1, node.y + y1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(node.x + x2, node.y + y2, 3, 0, Math.PI * 2); ctx.fill();
      } else if (node.type === 'split') {
        const configs = [
          [[0, 14], [0, -14], [14, 0]],
          [[-14, 0], [14, 0], [0, 14]],
          [[0, -14], [0, 14], [-14, 0]],
          [[14, 0], [-14, 0], [0, -14]]
        ];
        const [[ix, iy], [ox1, oy1], [ox2, oy2]] = configs[node.rotation];
        // Input line
        ctx.beginPath();
        ctx.moveTo(node.x + ix, node.y + iy);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
        // Output lines
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.x + ox1, node.y + oy1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.x + ox2, node.y + oy2);
        ctx.stroke();
        // Center dot
        ctx.fillStyle = powered ? '#ffdd44' : '#666';
        ctx.beginPath(); ctx.arc(node.x, node.y, 3, 0, Math.PI * 2); ctx.fill();
        // Endpoint dots
        ctx.fillStyle = powered ? '#88ddff' : '#555';
        ctx.beginPath(); ctx.arc(node.x + ix, node.y + iy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(node.x + ox1, node.y + oy1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(node.x + ox2, node.y + oy2, 3, 0, Math.PI * 2); ctx.fill();
      } else if (node.type === 'dead') {
        const dirs = [[0, -14], [14, 0], [0, 14], [-14, 0]];
        const [dx, dy] = dirs[node.rotation];
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.x + dx, node.y + dy);
        ctx.stroke();
        ctx.fillStyle = powered ? '#88ddff' : '#555';
        ctx.beginPath(); ctx.arc(node.x + dx, node.y + dy, 3, 0, Math.PI * 2); ctx.fill();
        // X mark for dead end
        ctx.strokeStyle = powered ? '#ff8844' : '#553333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(node.x - 5, node.y - 5);
        ctx.lineTo(node.x + 5, node.y + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(node.x + 5, node.y - 5);
        ctx.lineTo(node.x - 5, node.y + 5);
        ctx.stroke();
      }
      
      // Rotation arrow indicator — triangular arrow pointing at connection direction
      ctx.fillStyle = powered ? '#ffff44' : '#aaaacc';
      const arrowDirs = [
        [0, -20, -4, -14, 4, -14],     // up triangle
        [20, 0, 14, -4, 14, 4],         // right triangle
        [0, 20, -4, 14, 4, 14],         // down triangle
        [-20, 0, -14, -4, -14, 4]       // left triangle
      ];
      
      // Draw arrows for each active connection direction
      const connDirs = [];
      if (node.type === 'straight') {
        if (node.rotation % 2 === 0) { connDirs.push(0, 2); } // up, down
        else { connDirs.push(1, 3); } // right, left
      } else if (node.type === 'corner') {
        const cornerDirs = [[0,1],[1,2],[2,3],[3,0]]; // up-right, right-down, down-left, left-up
        connDirs.push(...cornerDirs[node.rotation]);
      } else if (node.type === 'split') {
        const splitConf = [[2,0,1],[3,1,2],[0,2,3],[1,3,0]]; // input dir, out1, out2
        connDirs.push(...splitConf[node.rotation]);
      } else if (node.type === 'dead') {
        connDirs.push(node.rotation);
      }
      
      connDirs.forEach(dir => {
        const [tx, ty, ax, ay, bx, by] = arrowDirs[dir];
        ctx.beginPath();
        ctx.moveTo(node.x + tx, node.y + ty);
        ctx.lineTo(node.x + ax, node.y + ay);
        ctx.lineTo(node.x + bx, node.y + by);
        ctx.closePath();
        ctx.fill();
      });
      
      // Type label
      ctx.fillStyle = powered ? 'rgba(136,221,255,0.7)' : 'rgba(100,100,120,0.5)';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.type.toUpperCase(), node.x, node.y + 32);
    });
    
    // ── Power flow animation ──
    if (this.poweredNodes.size > 0) {
      const time = this.elapsed * 3;
      this.circuitNodes.forEach(node => {
        if (!node.powered) return;
        
        // Multiple animated particles along the path
        for (let p = 0; p < 3; p++) {
          const progress = ((time + p * 0.33) % 1);
          ctx.fillStyle = '#ffff44';
          ctx.globalAlpha = 0.5 + Math.sin(progress * Math.PI) * 0.3;
          const offset = progress * 28 - 14;
          
          if (node.type === 'straight') {
            if (node.rotation % 2 === 0) {
              ctx.beginPath();
              ctx.arc(node.x, node.y + offset, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(node.x + offset, node.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (node.type === 'corner' || node.type === 'split') {
            // Simple glow at center for other types
            if (p === 0) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 3 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
      });
    }
  }

  _drawHazards(ctx) {
    this.hazards.forEach(h => {
      // Spike trap base plate
      ctx.fillStyle = '#555';
      ctx.fillRect(h.x, h.y, h.width, h.height);
      ctx.fillStyle = '#444';
      ctx.fillRect(h.x + 1, h.y + 1, h.width - 2, h.height - 2);
      // Spike grid
      const cols = 4, rows = 4;
      const sw = h.width / cols, sh = h.height / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const sx = h.x + i * sw + sw / 2;
          const sy = h.y + j * sh + sh / 2;
          // Spike shadow
          ctx.fillStyle = '#333';
          ctx.fillRect(sx - 2, sy + 1, 4, 2);
          // Spike body (triangle-ish)
          ctx.fillStyle = '#aaa';
          ctx.fillRect(sx - 1, sy - 3, 2, 5);
          // Spike tip
          ctx.fillStyle = '#ddd';
          ctx.fillRect(sx, sy - 4, 1, 2);
          // Shine
          ctx.fillStyle = '#fff';
          ctx.fillRect(sx, sy - 3, 1, 1);
        }
      }
      // Pressure plate border
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(h.x, h.y, h.width, h.height);
    });
  }

  _drawPickups(ctx) {
    this.pickups.forEach(pk => {
      if (pk.collected) return;
      const bob = Math.sin(this.elapsed * 4 + pk.x) * 2;
      const x = pk.x;
      const y = pk.y + bob;

      // Glow
      ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 3) * 0.15;
      ctx.fillStyle =
        pk.type === 'health' ? '#ff4444' :
          pk.type === 'sword' ? '#cccccc' :
            pk.type === 'bow' ? '#88aa44' :
              pk.type === 'halberd' ? '#44ff88' :
                pk.type === 'speed' ? '#44aaff' :
                  pk.type === 'shield' ? '#4488ff' :
                    pk.type === 'damage' ? '#ff8844' :
                      pk.type === 'lifesteal' ? '#cc2244' :
                        pk.type === 'thorns' ? '#22aa66' :
                          pk.type === 'rage' ? '#ff4400' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Icon
      if (pk.type === 'health') {
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(x - 4, y - 1, 8, 3);
        ctx.fillRect(x - 1, y - 4, 3, 8);
      } else if (pk.type === 'sword') {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x - 1, y - 6, 2, 10);
        ctx.fillStyle = '#886611';
        ctx.fillRect(x - 3, y + 2, 6, 2);
      } else if (pk.type === 'bow') {
        ctx.strokeStyle = '#886611';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.stroke();
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x, y - 5, 1, 10);
      } else if (pk.type === 'spear') {
        // Spear shaft
        ctx.fillStyle = '#886611';
        ctx.fillRect(x - 1, y - 8, 2, 16);
        // Spearhead
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 3, y - 6);
        ctx.lineTo(x + 3, y - 6);
        ctx.closePath();
        ctx.fill();
        // Shine
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y - 9, 1, 2);
      } else if (pk.type === 'halberd') {
        // Halberd pickup - long weapon with axe head
        ctx.fillStyle = '#553311';
        ctx.fillRect(x - 1, y - 10, 2, 20);
        // Axe head
        ctx.fillStyle = '#44cc66';
        ctx.fillRect(x - 5, y - 9, 6, 4);
        ctx.fillStyle = '#66ee88';
        ctx.fillRect(x - 4, y - 8, 4, 2);
        // Spear tip on top
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x - 2, y - 9);
        ctx.lineTo(x + 2, y - 9);
        ctx.closePath();
        ctx.fill();
        // Rune glow
        ctx.globalAlpha = 0.4 + Math.sin(this.elapsed * 4) * 0.2;
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(x - 1, y - 5, 2, 4);
        ctx.globalAlpha = 1;
      } else if (pk.type === 'speed') {
        ctx.fillStyle = '#44ddff';
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 5);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x - 1, y);
        ctx.lineTo(x + 2, y + 5);
        ctx.lineTo(x - 3, y);
        ctx.lineTo(x + 1, y);
        ctx.closePath();
        ctx.fill();
      } else if (pk.type === 'shield') {
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 5, y - 3);
        ctx.lineTo(x + 5, y + 1);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x - 5, y + 1);
        ctx.lineTo(x - 5, y - 3);
        ctx.closePath();
        ctx.fill();
      } else if (pk.type === 'damage') {
        ctx.fillStyle = '#ff6622';
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 3, y - 2);
        ctx.lineTo(x + 1, y - 2);
        ctx.lineTo(x + 2, y + 4);
        ctx.lineTo(x - 1, y);
        ctx.lineTo(x + 1, y);
        ctx.lineTo(x - 3, y - 2);
        ctx.closePath();
        ctx.fill();
      } else if (pk.type === 'lifesteal') {
        // Blood drop icon
        ctx.fillStyle = '#cc2244';
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.bezierCurveTo(x - 5, y - 1, x - 5, y + 4, x, y + 6);
        ctx.bezierCurveTo(x + 5, y + 4, x + 5, y - 1, x, y - 7);
        ctx.fill();
        ctx.fillStyle = '#ff4466';
        ctx.fillRect(x - 2, y - 1, 2, 2);
      } else if (pk.type === 'thorns') {
        // Green spiky circle
        ctx.fillStyle = '#22aa66';
        ctx.beginPath();
        for (let sp = 0; sp < 8; sp++) {
          const ang = (sp / 8) * Math.PI * 2;
          const r = sp % 2 === 0 ? 6 : 3;
          ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#44ff88';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pk.type === 'rage') {
        // Red flame icon
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x + 2, y - 2);
        ctx.lineTo(x + 3, y + 5);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x - 3, y + 5);
        ctx.lineTo(x - 2, y - 2);
        ctx.lineTo(x - 4, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffaa22';
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 2, y + 2);
        ctx.lineTo(x - 2, y + 2);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  _drawGates(ctx) {
    this.gates.forEach(g => {
      if (g.open) {
        // Open gate - glowing passage
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(g.x, g.y, g.width, g.height);
        // Glow effect
        const pulse = 0.3 + Math.sin(this.elapsed * 3) * 0.1;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(g.x, g.y, g.width, g.height);
        ctx.globalAlpha = 1;
        // Glowing edges
        ctx.fillStyle = 'rgba(68,255,136,0.6)';
        ctx.fillRect(g.x, g.y, 2, g.height);
        ctx.fillRect(g.x + g.width - 2, g.y, 2, g.height);
        ctx.fillRect(g.x, g.y, g.width, 2);
        ctx.fillRect(g.x, g.y + g.height - 2, g.width, 2);
        // Arrow indicator
        ctx.fillStyle = '#88ffaa';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('→', g.x + g.width / 2, g.y + g.height / 2 + 4);
      } else {
        // Closed gate - iron portcullis
        ctx.fillStyle = '#4a3a1a';
        ctx.fillRect(g.x, g.y, g.width, g.height);
        // Wood frame
        ctx.fillStyle = '#6a5020';
        ctx.fillRect(g.x + 1, g.y + 1, g.width - 2, g.height - 2);
        // Iron bars (vertical)
        for (let by = g.y + 4; by < g.y + g.height - 4; by += 2) {
          ctx.fillStyle = '#555';
          ctx.fillRect(g.x + 4, by, g.width - 8, 1);
        }
        // Horizontal bars
        for (let bx = g.x + 4; bx < g.x + g.width - 4; bx += 6) {
          ctx.fillStyle = '#666';
          ctx.fillRect(bx, g.y + 4, 1, g.height - 8);
          // Rivet
          ctx.fillStyle = '#888';
          ctx.fillRect(bx, g.y + g.height / 2, 2, 2);
        }
        // Metal highlights
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(g.x + 4, g.y + 4, g.width - 8, 1);
        // Padlock
        ctx.fillStyle = '#daa520';
        const cx = g.x + g.width / 2;
        const cy = g.y + g.height / 2;
        ctx.fillRect(cx - 5, cy - 1, 10, 8);
        ctx.fillStyle = '#c4962a';
        ctx.fillRect(cx - 4, cy, 8, 6);
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 3, 4, Math.PI, 0);
        ctx.stroke();
        // Keyhole
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 1, cy + 2, 2, 3);

        // "Press F" proximity prompt for wave gate
        if (g.requireWaves && this.waveState === 'idle' && this.level === 3.5) {
          const px = this.player.x + this.player.width / 2;
          const py = this.player.y + this.player.height / 2;
          const gx = g.x + g.width / 2;
          const gy = g.y + g.height / 2;
          const distToGate = Math.hypot(px - gx, py - gy);
          if (distToGate < 120) {
            // Pulsing prompt above gate
            const pulse = 0.7 + Math.sin(this.elapsed * 4) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚔ Press F to begin the Gauntlet ⚔', gx, g.y - 12);
            ctx.globalAlpha = 1;
          }
        }
      }
    });
  }

  _drawPlayer(ctx) {
    const p = this.player;

    // Invincibility flash
    if (p.invincible > 0 && this.frame % 4 < 2) return;

    // Shield aura
    if (p.shieldActive) {
      // Enhanced shield effect in boss fight (Level 4)
      if (this.level === 4) {
        // Stronger, pulsing shield
        const pulse = 0.4 + Math.sin(this.elapsed * 5) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Multiple shield rings
        ctx.strokeStyle = '#66aaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 22, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 26, 0, Math.PI * 2);
        ctx.stroke();
        
        // Sparkles
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + this.elapsed * 2;
          const sx = p.x + p.width / 2 + Math.cos(angle) * 24;
          const sy = p.y + p.height / 2 + Math.sin(angle) * 24;
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.8;
          ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
      } else {
        // Normal shield effect
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        // Shield ring
        ctx.strokeStyle = '#66aaff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Speed trail
    if (p.speedBoost) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#44ddff';
      ctx.fillRect(p.x - 3, p.y - 3, p.width + 6, p.height + 6);
      ctx.globalAlpha = 1;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, p.y + p.height, p.width / 2 - 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const dir = p.dir;
    const walk = p.animFrame;
    const legOffset = walk % 2 === 0 ? 0 : 2;
    const armSwing = walk % 2 === 0 ? -1 : 1;

    // Shoes
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(p.x + 4, p.y + 20 + legOffset, 6, 4);
    ctx.fillRect(p.x + 13, p.y + 20 + (2 - legOffset), 6, 4);

    // Legs/pants
    ctx.fillStyle = '#334466';
    ctx.fillRect(p.x + 5, p.y + 15 + legOffset, 5, 7 - legOffset);
    ctx.fillRect(p.x + 14, p.y + 15 + (2 - legOffset), 5, 7 - (2 - legOffset));
    // Pants highlight
    ctx.fillStyle = '#3d5077';
    ctx.fillRect(p.x + 5, p.y + 15 + legOffset, 2, 5 - legOffset);
    ctx.fillRect(p.x + 14, p.y + 15 + (2 - legOffset), 2, 5 - (2 - legOffset));

    // Body / tunic
    ctx.fillStyle = '#2266bb';
    ctx.fillRect(p.x + 3, p.y + 7, 18, 10);
    // Tunic detail - darker folds
    ctx.fillStyle = '#1a55aa';
    ctx.fillRect(p.x + 9, p.y + 8, 1, 8);
    ctx.fillRect(p.x + 14, p.y + 9, 1, 7);
    // Tunic highlight
    ctx.fillStyle = '#3377cc';
    ctx.fillRect(p.x + 4, p.y + 7, 6, 2);
    // Belt
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(p.x + 3, p.y + 14, 18, 2);
    ctx.fillStyle = '#c4962a';
    ctx.fillRect(p.x + 10, p.y + 14, 4, 2); // buckle

    // Arms (swing with walk)
    ctx.fillStyle = '#ddb888';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(p.x + 1, p.y + 8 + armSwing, 3, 8);
      ctx.fillRect(p.x + 20, p.y + 8 - armSwing, 3, 8);
      // Sleeve
      ctx.fillStyle = '#2266bb';
      ctx.fillRect(p.x + 1, p.y + 8 + armSwing, 3, 3);
      ctx.fillRect(p.x + 20, p.y + 8 - armSwing, 3, 3);
    } else {
      ctx.fillRect(p.x + 3, p.y + 8 + armSwing, 3, 8);
      ctx.fillRect(p.x + 18, p.y + 8 - armSwing, 3, 8);
      ctx.fillStyle = '#2266bb';
      ctx.fillRect(p.x + 3, p.y + 8 + armSwing, 3, 3);
      ctx.fillRect(p.x + 18, p.y + 8 - armSwing, 3, 3);
    }

    // Head
    ctx.fillStyle = '#ddb888';
    ctx.fillRect(p.x + 5, p.y, 14, 9);
    // Ear
    ctx.fillStyle = '#ccaa77';
    if (dir === 'left') {
      ctx.fillRect(p.x + 4, p.y + 3, 2, 3);
    } else if (dir === 'right') {
      ctx.fillRect(p.x + 18, p.y + 3, 2, 3);
    }

    // Hair
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(p.x + 4, p.y - 1, 16, 4);
    ctx.fillRect(p.x + 4, p.y, 2, 6); // side hair left
    ctx.fillRect(p.x + 18, p.y, 2, 6); // side hair right
    // Hair highlight
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(p.x + 8, p.y - 1, 4, 2);

    // Face details based on direction
    if (dir === 'down') {
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 7, p.y + 3, 4, 3);
      ctx.fillRect(p.x + 13, p.y + 3, 4, 3);
      ctx.fillStyle = '#331100';
      ctx.fillRect(p.x + 9, p.y + 4, 2, 2);
      ctx.fillRect(p.x + 14, p.y + 4, 2, 2);
      // Eyebrows
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(p.x + 7, p.y + 2, 4, 1);
      ctx.fillRect(p.x + 13, p.y + 2, 4, 1);
      // Mouth
      ctx.fillStyle = '#cc8866';
      ctx.fillRect(p.x + 10, p.y + 7, 4, 1);
    } else if (dir === 'up') {
      // Back of head - just hair
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(p.x + 5, p.y, 14, 7);
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(p.x + 7, p.y + 1, 10, 3);
    } else if (dir === 'left') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 6, p.y + 3, 3, 3);
      ctx.fillStyle = '#331100';
      ctx.fillRect(p.x + 6, p.y + 4, 2, 2);
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(p.x + 6, p.y + 2, 3, 1);
      ctx.fillStyle = '#cc8866';
      ctx.fillRect(p.x + 7, p.y + 7, 3, 1);
    } else { // right
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 15, p.y + 3, 3, 3);
      ctx.fillStyle = '#331100';
      ctx.fillRect(p.x + 16, p.y + 4, 2, 2);
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(p.x + 15, p.y + 2, 3, 1);
      ctx.fillStyle = '#cc8866';
      ctx.fillRect(p.x + 14, p.y + 7, 3, 1);
    }

    // Sword attack animation
    if (p.attacking) {
      ctx.fillStyle = '#ddeeff';
      const progress = 1 - p.attackTimer / p.attackDuration;
      switch (p.dir) {
        case 'up':
          ctx.save();
          ctx.translate(p.x + p.width / 2, p.y - 2);
          ctx.rotate(-Math.PI / 4 + progress * Math.PI / 2);
          ctx.fillRect(-1, -16, 2, 16);
          // Blade shine
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, -14, 1, 8);
          ctx.fillStyle = '#886611';
          ctx.fillRect(-3, -1, 6, 3);
          ctx.fillStyle = '#c4962a';
          ctx.fillRect(-2, 0, 4, 1);
          ctx.restore();
          break;
        case 'down':
          ctx.save();
          ctx.translate(p.x + p.width / 2, p.y + p.height + 2);
          ctx.rotate(Math.PI / 4 - progress * Math.PI / 2);
          ctx.fillRect(-1, 0, 2, 16);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 2, 1, 8);
          ctx.fillStyle = '#886611';
          ctx.fillRect(-3, -2, 6, 3);
          ctx.fillStyle = '#c4962a';
          ctx.fillRect(-2, -1, 4, 1);
          ctx.restore();
          break;
        case 'left':
          ctx.save();
          ctx.translate(p.x - 2, p.y + p.height / 2);
          ctx.rotate(-Math.PI / 4 + progress * Math.PI / 2);
          ctx.fillRect(-16, -1, 16, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-14, 0, 8, 1);
          ctx.fillStyle = '#886611';
          ctx.fillRect(-1, -3, 3, 6);
          ctx.fillStyle = '#c4962a';
          ctx.fillRect(0, -2, 1, 4);
          ctx.restore();
          break;
        case 'right':
          ctx.save();
          ctx.translate(p.x + p.width + 2, p.y + p.height / 2);
          ctx.rotate(Math.PI / 4 - progress * Math.PI / 2);
          ctx.fillRect(0, -1, 16, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(2, 0, 8, 1);
          ctx.fillStyle = '#886611';
          ctx.fillRect(-2, -3, 3, 6);
          ctx.fillStyle = '#c4962a';
          ctx.fillRect(-1, -2, 1, 4);
          ctx.restore();
          break;
      }
    }

    // Halberd attack animation (wide arc swing)
    if (p.weapon === 'halberd' && p.attacking) {
      const progress = 1 - p.attackTimer / p.attackDuration;
      ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      ctx.translate(cx, cy);
      // Wide sweeping arc based on direction
      let baseAngle = 0;
      if (p.dir === 'up') baseAngle = -Math.PI / 2;
      else if (p.dir === 'down') baseAngle = Math.PI / 2;
      else if (p.dir === 'left') baseAngle = Math.PI;
      const swingAngle = baseAngle - Math.PI / 3 + progress * Math.PI * 2 / 3;
      ctx.rotate(swingAngle);
      // Shaft
      ctx.fillStyle = '#553311';
      ctx.fillRect(0, -2, 22, 3);
      // Axe head
      ctx.fillStyle = '#44cc66';
      ctx.fillRect(18, -6, 6, 5);
      ctx.fillStyle = '#66ee88';
      ctx.fillRect(19, -5, 4, 3);
      // Spear tip
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.moveTo(26, -1);
      ctx.lineTo(22, -4);
      ctx.lineTo(22, 2);
      ctx.closePath();
      ctx.fill();
      // Rune glow trail
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(8, -1, 10, 1);
      ctx.globalAlpha = 1;
      ctx.restore();
      // Arc trail effect
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, baseAngle - Math.PI / 3, baseAngle - Math.PI / 3 + progress * Math.PI * 2 / 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Blades of Chaos attack animation
    if (p.weapon === 'bladesOfChaos' && p.attacking) {
      const progress = 1 - p.attackTimer / (p.bladesSpinning ? 30 : 12);
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (p.bladesSpinning) {
        // Spinning fury: dual blades spin 360°
        const spinAngle = progress * Math.PI * 4; // 2 full rotations
        const reach = p.bladesSpinRange || 80;
        for (let b = 0; b < 2; b++) {
          const bladeAngle = spinAngle + b * Math.PI;
          ctx.save();
          ctx.rotate(bladeAngle);
          // Chain
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(reach * 0.8, 0);
          ctx.stroke();
          ctx.setLineDash([]);
          // Blade
          ctx.fillStyle = '#cc2200';
          ctx.fillRect(reach * 0.7, -3, 10, 6);
          ctx.fillStyle = '#ff4400';
          ctx.fillRect(reach * 0.75, -2, 6, 4);
          // Tip
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath();
          ctx.moveTo(reach * 0.7 + 12, 0);
          ctx.lineTo(reach * 0.7 + 8, -4);
          ctx.lineTo(reach * 0.7 + 8, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        // Fire vortex ring
        ctx.globalAlpha = 0.3 * (1 - progress);
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, reach, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        // Quick slash: single directional blade swing
        let baseAngle = 0;
        if (p.dir === 'up') baseAngle = -Math.PI / 2;
        else if (p.dir === 'down') baseAngle = Math.PI / 2;
        else if (p.dir === 'left') baseAngle = Math.PI;
        const swingAngle = baseAngle - Math.PI / 4 + progress * Math.PI / 2;
        ctx.rotate(swingAngle);
        // Chain
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        // Blade
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(30, -3, 12, 6);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(32, -2, 8, 4);
        // Tip
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(44, 0);
        ctx.lineTo(40, -4);
        ctx.lineTo(40, 4);
        ctx.closePath();
        ctx.fill();
        // Slash trail
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 40, baseAngle - Math.PI / 4, baseAngle - Math.PI / 4 + progress * Math.PI / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // Blades charge indicator (glowing when held)
    if (p.weapon === 'bladesOfChaos' && p.bladesCharging && p.bladesChargeTimer > 10) {
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      const chargeProgress = Math.min(p.bladesChargeTimer / 60, 1);
      ctx.save();
      ctx.globalAlpha = 0.3 + chargeProgress * 0.3;
      ctx.strokeStyle = chargeProgress >= 1 ? '#ffff00' : '#ff6600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 12 + chargeProgress * 8, 0, Math.PI * 2 * chargeProgress);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Weapon indicator (small icon)
    if (p.weapon === 'bow' && this.level >= 2) {
      // Quiver on back
      ctx.fillStyle = '#886644';
      ctx.fillRect(p.x - 5, p.y + 4, 3, 10);
      ctx.fillStyle = '#aa8855';
      ctx.fillRect(p.x - 5, p.y + 4, 3, 2);
      // Arrow tip
      ctx.fillStyle = '#aaa';
      ctx.fillRect(p.x - 5, p.y + 2, 1, 3);
    } else if (p.weapon === 'halberd') {
      // Halberd on back
      ctx.fillStyle = '#553311';
      ctx.fillRect(p.x + p.width + 1, p.y - 2, 2, 18);
      ctx.fillStyle = '#44cc66';
      ctx.fillRect(p.x + p.width, p.y - 4, 4, 3);
    } else if (p.weapon === 'bladesOfChaos') {
      // Crossed chain-blades on back
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      for (let b = 0; b < 2; b++) {
        ctx.save();
        ctx.rotate(b === 0 ? -0.4 : 0.4);
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -12, 2, 8); // chain
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(-2, -14, 4, 3); // blade
        ctx.restore();
      }
      ctx.restore();
      // Fire glow
      if (this.frame % 4 < 2) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2 - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawEnemies(ctx) {
    this.enemies.forEach(e => {
      if (e.dead) return;

      // Flash on hit
      if (e.flashTimer > 0 && this.frame % 3 === 0) return;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height, e.width / 2 - 1, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (e.type === 'dummy') {
        // Training dummy - straw figure on pole
        // Pole
        ctx.fillStyle = '#886644';
        ctx.fillRect(e.x + 8, e.y + 14, 4, 8);
        // Cross beam
        ctx.fillStyle = '#776633';
        ctx.fillRect(e.x + 2, e.y + 6, 16, 3);
        // Body (straw sack)
        ctx.fillStyle = '#ccaa66';
        ctx.fillRect(e.x + 4, e.y + 2, 12, 14);
        ctx.fillStyle = '#ddbb77';
        ctx.fillRect(e.x + 6, e.y + 3, 8, 10);
        // Straw texture
        ctx.fillStyle = '#bb9955';
        ctx.fillRect(e.x + 7, e.y + 5, 1, 4);
        ctx.fillRect(e.x + 11, e.y + 4, 1, 5);
        ctx.fillRect(e.x + 9, e.y + 8, 1, 3);
        // "Face" - painted X
        ctx.fillStyle = '#664422';
        ctx.fillRect(e.x + 7, e.y + 4, 2, 2);
        ctx.fillRect(e.x + 11, e.y + 4, 2, 2);
        ctx.fillRect(e.x + 8, e.y + 7, 4, 1);

      } else if (e.type === 'slime') {
        const bounce = Math.sin(this.elapsed * 5 + e.x) * 2;
        const squash = Math.abs(Math.sin(this.elapsed * 5 + e.x)) * 2;
        // Slime body - translucent blob
        ctx.fillStyle = '#22aa22';
        ctx.beginPath();
        ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2 + bounce, e.width / 2 + squash / 2, e.height / 2 - squash / 2 + 1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = '#44dd44';
        ctx.beginPath();
        ctx.ellipse(e.x + e.width / 2 - 2, e.y + e.height / 2 + bounce - 2, e.width / 3, e.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shine spot
        ctx.fillStyle = '#88ff88';
        ctx.fillRect(e.x + 5, e.y + 3 + bounce, 3, 2);
        // Eyes - cute
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x + 5, e.y + 6 + bounce, 4, 4);
        ctx.fillRect(e.x + 12, e.y + 6 + bounce, 4, 4);
        ctx.fillStyle = '#111';
        ctx.fillRect(e.x + 6, e.y + 7 + bounce, 2, 3);
        ctx.fillRect(e.x + 13, e.y + 7 + bounce, 2, 3);
        // Pupil highlight
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x + 6, e.y + 7 + bounce, 1, 1);
        ctx.fillRect(e.x + 13, e.y + 7 + bounce, 1, 1);
        // Mouth
        ctx.fillStyle = '#118811';
        ctx.fillRect(e.x + 8, e.y + 12 + bounce, 4, 1);

      } else if (e.type === 'forest_creature') {
        // Horned beast with fur texture
        // Body
        ctx.fillStyle = '#5a3820';
        ctx.fillRect(e.x + 2, e.y + 6, 16, 12);
        ctx.fillStyle = '#6a4830';
        ctx.fillRect(e.x + 4, e.y + 7, 12, 9);
        // Fur texture
        ctx.fillStyle = '#7a5840';
        ctx.fillRect(e.x + 5, e.y + 8, 2, 3);
        ctx.fillRect(e.x + 10, e.y + 9, 2, 3);
        ctx.fillRect(e.x + 14, e.y + 7, 2, 2);
        // Head
        ctx.fillStyle = '#7a5838';
        ctx.fillRect(e.x + 3, e.y + 1, 14, 8);
        ctx.fillStyle = '#8a6848';
        ctx.fillRect(e.x + 5, e.y + 2, 10, 5);
        // Horns with highlights
        ctx.fillStyle = '#ccaa77';
        ctx.fillRect(e.x + 2, e.y - 5, 3, 7);
        ctx.fillRect(e.x + 15, e.y - 5, 3, 7);
        ctx.fillStyle = '#ddbb88';
        ctx.fillRect(e.x + 2, e.y - 5, 3, 2);
        ctx.fillRect(e.x + 15, e.y - 5, 3, 2);
        // Eyes - menacing red
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(e.x + 5, e.y + 3, 3, 3);
        ctx.fillRect(e.x + 12, e.y + 3, 3, 3);
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(e.x + 6, e.y + 3, 1, 1);
        ctx.fillRect(e.x + 13, e.y + 3, 1, 1);
        // Snout
        ctx.fillStyle = '#5a3020';
        ctx.fillRect(e.x + 7, e.y + 6, 6, 2);
        // Legs
        ctx.fillStyle = '#4a2810';
        ctx.fillRect(e.x + 3, e.y + 16, 4, 4);
        ctx.fillRect(e.x + 13, e.y + 16, 4, 4);

      } else if (e.type === 'knight') {
        // Armored knight with sword and shield
        // Legs
        ctx.fillStyle = '#555566';
        const kLeg = e.animFrame % 2 === 0 ? 0 : 1;
        ctx.fillRect(e.x + 4, e.y + 14 + kLeg, 5, 6 - kLeg);
        ctx.fillRect(e.x + 11, e.y + 14 + (1 - kLeg), 5, 6 - (1 - kLeg));
        // Body armor
        ctx.fillStyle = '#6a7a8a';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 11);
        // Armor highlight
        ctx.fillStyle = '#7a8a9a';
        ctx.fillRect(e.x + 3, e.y + 5, 14, 3);
        // Chest emblem
        ctx.fillStyle = '#aa3333';
        ctx.fillRect(e.x + 8, e.y + 9, 4, 4);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(e.x + 9, e.y + 10, 2, 2);
        // Helmet
        ctx.fillStyle = '#778899';
        ctx.fillRect(e.x + 3, e.y, 14, 8);
        ctx.fillStyle = '#8899aa';
        ctx.fillRect(e.x + 4, e.y, 12, 3);
        // Visor slit
        ctx.fillStyle = '#222';
        ctx.fillRect(e.x + 6, e.y + 4, 8, 2);
        // Plume
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(e.x + 8, e.y - 3, 4, 4);
        ctx.fillStyle = '#ee3333';
        ctx.fillRect(e.x + 9, e.y - 3, 2, 3);
        // Sword
        ctx.fillStyle = '#ddeeff';
        ctx.fillRect(e.x + e.width + 1, e.y + 5, 8, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x + e.width + 3, e.y + 5, 4, 1);
        ctx.fillStyle = '#886611';
        ctx.fillRect(e.x + e.width - 1, e.y + 3, 2, 6);
        // Shield (left arm)
        ctx.fillStyle = '#5566aa';
        ctx.fillRect(e.x - 3, e.y + 6, 6, 8);
        ctx.fillStyle = '#6677bb';
        ctx.fillRect(e.x - 2, e.y + 7, 4, 6);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(e.x - 1, e.y + 9, 2, 2);

      } else if (e.type === 'shield_guard') {
        // Heavy armored guard with large front-facing shield
        const sDir = e.shieldDir || 'down';
        // Legs
        ctx.fillStyle = '#4a4a55';
        const sgLeg = e.animFrame % 2 === 0 ? 0 : 1;
        ctx.fillRect(e.x + 4, e.y + 14 + sgLeg, 5, 6 - sgLeg);
        ctx.fillRect(e.x + 11, e.y + 14 + (1 - sgLeg), 5, 6 - (1 - sgLeg));
        // Body - heavy plate armor
        ctx.fillStyle = '#556677';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 11);
        ctx.fillStyle = '#667788';
        ctx.fillRect(e.x + 3, e.y + 5, 14, 3);
        // Armor rivets
        ctx.fillStyle = '#889999';
        ctx.fillRect(e.x + 5, e.y + 8, 2, 2);
        ctx.fillRect(e.x + 13, e.y + 8, 2, 2);
        // Helmet - heavier than knight
        ctx.fillStyle = '#5a6a7a';
        ctx.fillRect(e.x + 2, e.y - 1, 16, 9);
        ctx.fillStyle = '#6a7a8a';
        ctx.fillRect(e.x + 3, e.y, 14, 4);
        // Visor - narrow slit
        ctx.fillStyle = '#111';
        ctx.fillRect(e.x + 5, e.y + 4, 10, 1);
        // Shield (large, front-facing, direction-dependent)
        const shieldColor = e.buffed ? '#7788cc' : '#4466aa';
        const shieldHighlight = e.buffed ? '#99aadd' : '#5577bb';
        if (sDir === 'down' || sDir === 'up') {
          ctx.fillStyle = shieldColor;
          ctx.fillRect(e.x - 2, e.y + 3, 24, 12);
          ctx.fillStyle = shieldHighlight;
          ctx.fillRect(e.x, e.y + 4, 20, 4);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(e.x + 8, e.y + 7, 4, 4);
        } else {
          ctx.fillStyle = shieldColor;
          ctx.fillRect(sDir === 'left' ? e.x - 6 : e.x + e.width, e.y + 1, 8, 16);
          ctx.fillStyle = shieldHighlight;
          ctx.fillRect(sDir === 'left' ? e.x - 5 : e.x + e.width + 1, e.y + 2, 6, 6);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(sDir === 'left' ? e.x - 4 : e.x + e.width + 2, e.y + 7, 4, 4);
        }

      } else if (e.type === 'crossbow_archer') {
        // Crossbow-wielding ranged unit with dark leather
        // Legs
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(e.x + 5, e.y + 14, 4, 6);
        ctx.fillRect(e.x + 11, e.y + 14, 4, 6);
        // Body - dark leather armor
        ctx.fillStyle = '#3a3040';
        ctx.fillRect(e.x + 3, e.y + 6, 14, 10);
        ctx.fillStyle = '#4a4050';
        ctx.fillRect(e.x + 4, e.y + 7, 12, 7);
        // Belt with bolts
        ctx.fillStyle = '#665533';
        ctx.fillRect(e.x + 3, e.y + 13, 14, 2);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(e.x + 5, e.y + 12, 1, 2);
        ctx.fillRect(e.x + 8, e.y + 12, 1, 2);
        ctx.fillRect(e.x + 11, e.y + 12, 1, 2);
        // Head - leather cap
        ctx.fillStyle = '#3a3040';
        ctx.fillRect(e.x + 4, e.y, 12, 8);
        ctx.fillStyle = '#4a4050';
        ctx.fillRect(e.x + 5, e.y + 1, 10, 5);
        // Eyes - sharp, focused
        ctx.fillStyle = '#ddd';
        ctx.fillRect(e.x + 6, e.y + 3, 3, 2);
        ctx.fillRect(e.x + 11, e.y + 3, 3, 2);
        ctx.fillStyle = '#882222';
        ctx.fillRect(e.x + 7, e.y + 3, 2, 2);
        ctx.fillRect(e.x + 12, e.y + 3, 2, 2);
        // Crossbow (held in front)
        ctx.fillStyle = '#886644';
        ctx.fillRect(e.x + e.width + 1, e.y + 7, 8, 2);
        // Crossbow limbs
        ctx.fillStyle = '#665533';
        ctx.fillRect(e.x + e.width + 6, e.y + 3, 2, 10);
        // String
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(e.x + e.width + 7, e.y + 4);
        ctx.lineTo(e.x + e.width + 3, e.y + 8);
        ctx.lineTo(e.x + e.width + 7, e.y + 12);
        ctx.stroke();
        // Buff glow
        if (e.buffed) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#ffaa44';
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

      } else if (e.type === 'berserker') {
        // Fast, aggressive warrior with dual axes
        const bLeg = e.animFrame % 2 === 0 ? 0 : 2;
        // Charge trail
        if (e.charging) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#ff4400';
          for (let t = 1; t <= 3; t++) {
            const tx = e.x - (e.chargeDir?.x || 0) * t * 6;
            const ty = e.y - (e.chargeDir?.y || 0) * t * 6;
            ctx.globalAlpha = 0.3 - t * 0.08;
            ctx.fillRect(tx + 2, ty + 2, e.width - 4, e.height - 4);
          }
          ctx.globalAlpha = 1;
        }
        // Legs - dark fur boots
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(e.x + 3, e.y + 14 + bLeg, 6, 6 - bLeg);
        ctx.fillRect(e.x + 11, e.y + 14 + (2 - bLeg), 6, 6 - (2 - bLeg));
        // Body - bare chest with war paint
        ctx.fillStyle = '#8a6a4a';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 11);
        ctx.fillStyle = '#9a7a5a';
        ctx.fillRect(e.x + 3, e.y + 6, 14, 8);
        // War paint stripes
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(e.x + 4, e.y + 7, 2, 6);
        ctx.fillRect(e.x + 14, e.y + 7, 2, 6);
        ctx.fillRect(e.x + 8, e.y + 6, 4, 1);
        // Head - wild hair
        ctx.fillStyle = '#8a6a4a';
        ctx.fillRect(e.x + 4, e.y + 1, 12, 7);
        // Wild red hair
        ctx.fillStyle = '#aa3322';
        ctx.fillRect(e.x + 3, e.y - 3, 14, 5);
        ctx.fillRect(e.x + 2, e.y - 2, 3, 4);
        ctx.fillRect(e.x + 15, e.y - 2, 3, 4);
        // Fierce eyes
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(e.x + 6, e.y + 3, 3, 2);
        ctx.fillRect(e.x + 11, e.y + 3, 3, 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(e.x + 7, e.y + 3, 1, 1);
        ctx.fillRect(e.x + 12, e.y + 3, 1, 1);
        // Snarl
        ctx.fillStyle = '#662211';
        ctx.fillRect(e.x + 7, e.y + 6, 6, 1);
        // Dual axes
        ctx.fillStyle = '#888';
        ctx.fillRect(e.x - 4, e.y + 5, 5, 6);
        ctx.fillRect(e.x + e.width - 1, e.y + 5, 5, 6);
        ctx.fillStyle = '#665533';
        ctx.fillRect(e.x - 2, e.y + 4, 2, 12);
        ctx.fillRect(e.x + e.width, e.y + 4, 2, 12);
        // Rage aura when charging
        if (e.charging) {
          ctx.globalAlpha = 0.25 + Math.sin(this.elapsed * 10) * 0.1;
          ctx.strokeStyle = '#ff2200';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

      } else if (e.type === 'captain') {
        // Elite captain - larger, commanding presence with buff aura
        const cLeg = e.animFrame % 2 === 0 ? 0 : 1;
        // Command aura (golden circle)
        ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 2) * 0.05;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + e.height / 2, this.captainBuffRadius || 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + e.height / 2, this.captainBuffRadius || 80, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Legs - heavy armored
        ctx.fillStyle = '#3a3a44';
        ctx.fillRect(e.x + 4, e.y + 14 + cLeg, 5, 6 - cLeg);
        ctx.fillRect(e.x + 11, e.y + 14 + (1 - cLeg), 5, 6 - (1 - cLeg));
        // Body - gold-trimmed elite armor
        ctx.fillStyle = '#556688';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 11);
        ctx.fillStyle = '#6677aa';
        ctx.fillRect(e.x + 3, e.y + 5, 14, 3);
        // Gold trim
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 1);
        ctx.fillRect(e.x + 2, e.y + 15, 16, 1);
        ctx.fillRect(e.x + 2, e.y + 5, 1, 11);
        ctx.fillRect(e.x + 17, e.y + 5, 1, 11);
        // Captain emblem (larger, golden)
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(e.x + 7, e.y + 8, 6, 6);
        ctx.fillStyle = '#ffee66';
        ctx.fillRect(e.x + 8, e.y + 9, 4, 4);
        // Crown-helm
        ctx.fillStyle = '#556688';
        ctx.fillRect(e.x + 2, e.y - 1, 16, 9);
        ctx.fillStyle = '#ffd700';
        // Crown points
        ctx.fillRect(e.x + 4, e.y - 4, 3, 4);
        ctx.fillRect(e.x + 9, e.y - 5, 2, 5);
        ctx.fillRect(e.x + 13, e.y - 4, 3, 4);
        // Visor
        ctx.fillStyle = '#111';
        ctx.fillRect(e.x + 5, e.y + 3, 10, 2);
        // Eyes through visor - commanding
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(e.x + 6, e.y + 3, 3, 2);
        ctx.fillRect(e.x + 11, e.y + 3, 3, 2);
        // Cape (flowing behind)
        ctx.fillStyle = '#882222';
        ctx.fillRect(e.x + 4, e.y + 16, 12, 6);
        ctx.fillStyle = '#aa3333';
        ctx.fillRect(e.x + 5, e.y + 17, 10, 4);
        // Commander's sword (larger)
        ctx.fillStyle = '#ddeeff';
        ctx.fillRect(e.x + e.width + 1, e.y + 3, 10, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x + e.width + 3, e.y + 3, 6, 1);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(e.x + e.width - 1, e.y + 1, 2, 7);

      } else if (e.type === 'archer') {
        // Hooded ranger with bow
        // Legs
        ctx.fillStyle = '#3a4a3a';
        ctx.fillRect(e.x + 5, e.y + 14, 4, 6);
        ctx.fillRect(e.x + 11, e.y + 14, 4, 6);
        // Body - dark green cloak
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(e.x + 3, e.y + 6, 14, 10);
        ctx.fillStyle = '#4a6a4a';
        ctx.fillRect(e.x + 4, e.y + 7, 12, 7);
        // Cloak clasp
        ctx.fillStyle = '#c4962a';
        ctx.fillRect(e.x + 9, e.y + 6, 2, 2);
        // Hood
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(e.x + 3, e.y, 14, 9);
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(e.x + 4, e.y, 12, 4);
        // Hood shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(e.x + 5, e.y + 4, 10, 2);
        // Eyes - glowing yellow
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(e.x + 6, e.y + 5, 3, 2);
        ctx.fillRect(e.x + 11, e.y + 5, 3, 2);
        ctx.fillStyle = '#ffee44';
        ctx.fillRect(e.x + 7, e.y + 5, 1, 1);
        ctx.fillRect(e.x + 12, e.y + 5, 1, 1);
        // Bow (left side)
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x - 3, e.y + 10, 7, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
        // Bowstring
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(e.x - 3, e.y + 4);
        ctx.lineTo(e.x - 3, e.y + 16);
        ctx.stroke();
        // Quiver on back
        ctx.fillStyle = '#664422';
        ctx.fillRect(e.x + 16, e.y + 4, 3, 10);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(e.x + 17, e.y + 2, 1, 3); // arrow tip
      } else if (e.type === 'necromancer') {
        // Dark sorcerer with purple robes and skull staff
        // Legs
        ctx.fillStyle = '#1a0a2a';
        ctx.fillRect(e.x + 6, e.y + 14, 3, 6);
        ctx.fillRect(e.x + 11, e.y + 14, 3, 6);
        // Robe - dark purple
        ctx.fillStyle = '#2a1a4a';
        ctx.fillRect(e.x + 2, e.y + 6, 16, 10);
        ctx.fillStyle = '#3a2a5a';
        ctx.fillRect(e.x + 3, e.y + 7, 14, 8);
        // Robe trim - glowing purple
        ctx.fillStyle = '#8844ff';
        ctx.fillRect(e.x + 2, e.y + 6, 16, 1);
        ctx.fillRect(e.x + 2, e.y + 15, 16, 1);
        // Hood
        ctx.fillStyle = '#1a0a2a';
        ctx.fillRect(e.x + 2, e.y, 16, 9);
        ctx.fillStyle = '#0a0010';
        ctx.fillRect(e.x + 3, e.y + 1, 14, 7);
        // Glowing eyes - purple
        ctx.fillStyle = '#aa44ff';
        ctx.fillRect(e.x + 6, e.y + 4, 2, 3);
        ctx.fillRect(e.x + 12, e.y + 4, 2, 3);
        ctx.fillStyle = '#dd88ff';
        ctx.fillRect(e.x + 6, e.y + 5, 2, 1);
        ctx.fillRect(e.x + 12, e.y + 5, 2, 1);
        // Skull staff
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(e.x - 2, e.y + 8, 2, 10);
        // Skull on staff
        ctx.fillStyle = '#ccccaa';
        ctx.fillRect(e.x - 3, e.y + 6, 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 3, e.y + 7, 1, 1);
        ctx.fillRect(e.x - 1, e.y + 7, 1, 1);
        // Floating dark orbs around necromancer
        const orbAngle = this.elapsed * 3 + e.x;
        for (let i = 0; i < 3; i++) {
          const angle = orbAngle + (i * Math.PI * 2 / 3);
          const ox = e.x + 10 + Math.cos(angle) * 12;
          const oy = e.y + 10 + Math.sin(angle) * 8;
          ctx.fillStyle = '#6622aa';
          ctx.beginPath();
          ctx.arc(ox, oy, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#aa44ff';
          ctx.beginPath();
          ctx.arc(ox, oy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.type === 'assassin') {
        // Fast, deadly rogue with daggers
        const aLeg = e.animFrame % 2 === 0 ? 0 : 2;
        
        // Teleport effect
        if (e.teleporting) {
          ctx.globalAlpha = 0.3 + Math.sin(e.teleportPhase * 0.3) * 0.3;
        }
        
        // Legs - black
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(e.x + 6, e.y + 14 + aLeg, 3, 6 - aLeg);
        ctx.fillRect(e.x + 11, e.y + 14 - aLeg, 3, 6 + aLeg);
        // Body - dark red/black leather
        ctx.fillStyle = '#2a0a0a';
        ctx.fillRect(e.x + 4, e.y + 6, 12, 10);
        ctx.fillStyle = '#4a1a1a';
        ctx.fillRect(e.x + 5, e.y + 7, 10, 8);
        // Belt
        ctx.fillStyle = '#666';
        ctx.fillRect(e.x + 4, e.y + 11, 12, 1);
        // Hood/mask
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(e.x + 3, e.y, 14, 9);
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(e.x + 4, e.y + 1, 12, 7);
        // Eyes - glowing red
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(e.x + 6, e.y + 4, 2, 2);
        ctx.fillRect(e.x + 12, e.y + 4, 2, 2);
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(e.x + 7, e.y + 4, 1, 1);
        ctx.fillRect(e.x + 13, e.y + 4, 1, 1);
        // Daggers - both hands
        ctx.fillStyle = '#aaa';
        ctx.fillRect(e.x - 2, e.y + 9, 4, 1);
        ctx.fillRect(e.x + 18, e.y + 9, 4, 1);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(e.x - 3, e.y + 9, 1, 1); // blood on blade
        ctx.fillRect(e.x + 21, e.y + 9, 1, 1);
        // Speed trail effect
        if (e.speed > 2) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(e.x - 5, e.y + 8, 3, 4);
          ctx.fillRect(e.x + 22, e.y + 8, 3, 4);
        }
        
        ctx.globalAlpha = 1;
      } else if (e.type === 'dark_knight') {
        // Heavy armored dark knight with red visor and massive sword
        const dkLeg = e.animFrame % 2 === 0 ? 0 : 1;
        
        // Cleave effect
        if (e.cleaving) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#ff2200';
          const cleaveAngle = (e.cleavePhase / 25) * Math.PI;
          for (let i = 0; i < 5; i++) {
            const a = cleaveAngle + i * 0.4 - 1;
            ctx.fillRect(e.x + 10 + Math.cos(a) * 20, e.y + 10 + Math.sin(a) * 20, 3, 3);
          }
          ctx.globalAlpha = 1;
        }
        
        // Legs — heavy plated boots
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(e.x + 5, e.y + 14 + dkLeg, 4, 6 - dkLeg);
        ctx.fillRect(e.x + 11, e.y + 14 - dkLeg, 4, 6 + dkLeg);
        ctx.fillStyle = '#111120';
        ctx.fillRect(e.x + 4, e.y + 18 + dkLeg, 6, 3);
        ctx.fillRect(e.x + 10, e.y + 18 - dkLeg, 6, 3);
        // Body — heavy black plate armor
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(e.x + 2, e.y + 5, 16, 11);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(e.x + 3, e.y + 6, 14, 9);
        // Chest plate detail
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(e.x + 6, e.y + 7, 8, 7);
        // Red emblem on chest
        ctx.fillStyle = '#aa0000';
        ctx.fillRect(e.x + 8, e.y + 8, 4, 4);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(e.x + 9, e.y + 9, 2, 2);
        // Pauldrons
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(e.x, e.y + 4, 5, 6);
        ctx.fillRect(e.x + 15, e.y + 4, 5, 6);
        ctx.fillStyle = '#2a2a44';
        ctx.fillRect(e.x + 1, e.y + 5, 3, 4);
        ctx.fillRect(e.x + 16, e.y + 5, 3, 4);
        // Helmet — dark with red visor slit
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(e.x + 3, e.y - 2, 14, 9);
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(e.x + 4, e.y - 1, 12, 7);
        // Red visor glow
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(e.x + 5, e.y + 2, 10, 2);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(e.x + 6, e.y + 2, 8, 1);
        // Large sword
        ctx.fillStyle = '#555';
        ctx.fillRect(e.x - 4, e.y + 4, 2, 14);
        ctx.fillStyle = '#888';
        ctx.fillRect(e.x - 3, e.y + 4, 1, 12);
        ctx.fillStyle = '#aa0000';
        ctx.fillRect(e.x - 4, e.y + 2, 2, 3);
        
      } else if (e.type === 'fire_mage') {
        // Fire mage in red/orange robes with flame effects
        const fmLeg = e.animFrame % 2 === 0 ? 0 : 1;
        
        // Casting effect — fire particles
        if (e.casting) {
          ctx.globalAlpha = 0.8;
          for (let i = 0; i < 4; i++) {
            const fx = e.x + 10 + (Math.random() - 0.5) * 16;
            const fy = e.y - 5 + (Math.random() - 0.5) * 10;
            ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ffaa00';
            ctx.fillRect(fx, fy, 3, 3);
          }
          ctx.globalAlpha = 1;
        }
        
        // Robe bottom — trailing
        ctx.fillStyle = '#882200';
        ctx.fillRect(e.x + 3, e.y + 12 + fmLeg, 14, 8 - fmLeg);
        ctx.fillStyle = '#aa3300';
        ctx.fillRect(e.x + 5, e.y + 13, 10, 5);
        // Body — red/orange robes
        ctx.fillStyle = '#cc4400';
        ctx.fillRect(e.x + 3, e.y + 4, 14, 10);
        ctx.fillStyle = '#dd5500';
        ctx.fillRect(e.x + 4, e.y + 5, 12, 8);
        // Flame pattern on robe
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(e.x + 6, e.y + 10, 2, 3);
        ctx.fillRect(e.x + 10, e.y + 9, 2, 4);
        ctx.fillRect(e.x + 14, e.y + 11, 2, 2);
        // Hood
        ctx.fillStyle = '#aa2200';
        ctx.fillRect(e.x + 4, e.y - 2, 12, 8);
        ctx.fillStyle = '#cc3300';
        ctx.fillRect(e.x + 5, e.y - 1, 10, 6);
        // Eyes — glowing orange
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(e.x + 6, e.y + 2, 2, 2);
        ctx.fillRect(e.x + 12, e.y + 2, 2, 2);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(e.x + 7, e.y + 2, 1, 1);
        ctx.fillRect(e.x + 13, e.y + 2, 1, 1);
        // Fire staff
        ctx.fillStyle = '#553311';
        ctx.fillRect(e.x + 18, e.y + 2, 2, 16);
        // Staff flame tip
        const flameFlicker = Math.sin(this.elapsed * 8 + e.x) * 2;
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(e.x + 17, e.y - 2 + flameFlicker, 4, 4);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(e.x + 18, e.y - 1 + flameFlicker, 2, 2);
        // Ambient fire aura
        ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 4) * 0.05;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(e.x + 10, e.y + 8, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
      } else if (e.type === 'war_golem') {
        // Massive stone golem with glowing runes
        const wgLeg = e.animFrame % 2 === 0 ? 0 : 1;
        
        // Ground pound effect
        if (e.pounding) {
          if (e.poundPhase < 15) {
            // Rising up
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#886644';
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          } else if (e.poundPhase >= 18 && e.poundPhase <= 25) {
            // Impact shockwave rings
            const shockR = (e.poundPhase - 18) * 8;
            ctx.globalAlpha = 0.5 - (e.poundPhase - 18) * 0.06;
            ctx.strokeStyle = '#aa8855';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x + 10, e.y + 20, shockR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        
        // Legs — massive stone pillars
        ctx.fillStyle = '#555544';
        ctx.fillRect(e.x + 2, e.y + 14 + wgLeg, 6, 8 - wgLeg);
        ctx.fillRect(e.x + 12, e.y + 14 - wgLeg, 6, 8 + wgLeg);
        ctx.fillStyle = '#666655';
        ctx.fillRect(e.x + 3, e.y + 15, 4, 5);
        ctx.fillRect(e.x + 13, e.y + 15, 4, 5);
        // Body — boulder-like torso
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(e.x, e.y + 3, 20, 13);
        ctx.fillStyle = '#5a5a4a';
        ctx.fillRect(e.x + 1, e.y + 4, 18, 11);
        // Glowing rune on chest
        const runeGlow = 0.5 + Math.sin(this.elapsed * 3 + e.x) * 0.3;
        ctx.globalAlpha = runeGlow;
        ctx.fillStyle = '#44ffaa';
        ctx.fillRect(e.x + 7, e.y + 6, 6, 6);
        ctx.fillStyle = '#88ffcc';
        ctx.fillRect(e.x + 8, e.y + 7, 4, 4);
        ctx.fillRect(e.x + 9, e.y + 5, 2, 1);
        ctx.fillRect(e.x + 9, e.y + 12, 2, 1);
        ctx.globalAlpha = 1;
        // Arms — thick stone
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(e.x - 4, e.y + 4, 5, 12);
        ctx.fillRect(e.x + 19, e.y + 4, 5, 12);
        ctx.fillStyle = '#5a5a4a';
        ctx.fillRect(e.x - 3, e.y + 5, 3, 10);
        ctx.fillRect(e.x + 20, e.y + 5, 3, 10);
        // Fists — large
        ctx.fillStyle = '#555544';
        ctx.fillRect(e.x - 5, e.y + 14, 6, 5);
        ctx.fillRect(e.x + 19, e.y + 14, 6, 5);
        // Head — rough stone
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(e.x + 3, e.y - 3, 14, 8);
        ctx.fillStyle = '#5a5a4a';
        ctx.fillRect(e.x + 4, e.y - 2, 12, 6);
        // Eyes — glowing green
        ctx.fillStyle = '#22ff66';
        ctx.fillRect(e.x + 5, e.y + 1, 3, 2);
        ctx.fillRect(e.x + 12, e.y + 1, 3, 2);
        ctx.fillStyle = '#88ffaa';
        ctx.fillRect(e.x + 6, e.y + 1, 1, 1);
        ctx.fillRect(e.x + 13, e.y + 1, 1, 1);
        // Moss patches
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(e.x + 1, e.y + 12, 4, 2);
        ctx.fillRect(e.x + 15, e.y + 8, 3, 2);
      } else if (e.type === 'general') {
        // THE GENERAL — massive armored warrior, boss's protector
        const gLeg = e.animFrame % 2 === 0 ? 0 : 2;
        // Dark aura
        ctx.globalAlpha = 0.2 + Math.sin(this.elapsed * 2 + e.x) * 0.1;
        ctx.fillStyle = '#660066';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Heavy boots
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(e.x + 4, e.y + 24 + gLeg, 8, 8 - gLeg);
        ctx.fillRect(e.x + 18, e.y + 24 + (2 - gLeg), 8, 8 - (2 - gLeg));
        ctx.fillStyle = '#111118';
        ctx.fillRect(e.x + 3, e.y + 28 + gLeg, 10, 4);
        ctx.fillRect(e.x + 17, e.y + 28 + (2 - gLeg), 10, 4);
        // Massive body — gold+black plate armor
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(e.x + 2, e.y + 8, 26, 18);
        ctx.fillStyle = '#2a2a44';
        ctx.fillRect(e.x + 4, e.y + 10, 22, 14);
        // Gold chest plate emblem
        ctx.fillStyle = '#cc9900';
        ctx.fillRect(e.x + 9, e.y + 11, 12, 10);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(e.x + 11, e.y + 13, 8, 6);
        // Crown emblem
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(e.x + 13, e.y + 14, 4, 4);
        // Massive pauldrons
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(e.x - 2, e.y + 6, 8, 10);
        ctx.fillRect(e.x + 24, e.y + 6, 8, 10);
        // Gold trim on pauldrons
        ctx.fillStyle = '#cc9900';
        ctx.fillRect(e.x - 2, e.y + 6, 8, 2);
        ctx.fillRect(e.x + 24, e.y + 6, 8, 2);
        // Arms
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(e.x - 3, e.y + 12, 6, 14);
        ctx.fillRect(e.x + 27, e.y + 12, 6, 14);
        // Massive sword (right hand)
        ctx.fillStyle = '#aaa';
        ctx.fillRect(e.x + 30, e.y + 2, 3, 22);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(e.x + 31, e.y + 3, 1, 18);
        // Sword hilt
        ctx.fillStyle = '#cc9900';
        ctx.fillRect(e.x + 28, e.y + 22, 8, 3);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(e.x + 30, e.y + 23, 3, 2);
        // Shield (left hand)
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - 7, e.y + 12, 8, 12);
        ctx.fillStyle = '#cc9900';
        ctx.fillRect(e.x - 6, e.y + 14, 6, 8);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(e.x - 4, e.y + 16, 2, 4);
        // Helmet — imposing with red plume
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(e.x + 5, e.y - 4, 20, 14);
        ctx.fillStyle = '#2a2a44';
        ctx.fillRect(e.x + 7, e.y - 2, 16, 10);
        // Visor — glowing purple
        ctx.fillStyle = '#8800ff';
        ctx.fillRect(e.x + 8, e.y + 3, 14, 3);
        ctx.fillStyle = '#aa44ff';
        ctx.fillRect(e.x + 10, e.y + 3, 10, 2);
        // Red plume on top
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(e.x + 11, e.y - 8, 8, 6);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(e.x + 12, e.y - 7, 6, 4);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(e.x + 13, e.y - 6, 4, 2);
        // Name plate
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('THE GENERAL', e.x + e.width / 2, e.y - 12);
        ctx.textAlign = 'left';
      }

      // HP bar for damaged enemies
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 2, e.y - 7, e.width + 4, 5);
        const hpPct = e.hp / e.maxHp;
        const barColor = hpPct > 0.5 ? '#44ff44' : (hpPct > 0.25 ? '#ffaa00' : '#ff2222');
        ctx.fillStyle = barColor;
        const hpW = hpPct * (e.width + 4);
        ctx.fillRect(e.x - 2, e.y - 7, hpW, 5);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(e.x - 2, e.y - 7, e.width + 4, 5);
      }
    });
  }

  _drawBoss(ctx) {
    if (!this.boss) return;
    const b = this.boss;

    // Flash on hit
    if (b.flashTimer > 0 && this.frame % 3 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(b.x + b.width / 2, b.y + b.height + 2, b.width / 2 + 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slam indicator
    if (b.slamming) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 70, 0, Math.PI * 2);
      ctx.fill();
      // Pulsing ring
      ctx.strokeStyle = '#ff6622';
      ctx.lineWidth = 2;
      const pulseR = 40 + Math.sin(this.elapsed * 10) * 20;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, pulseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const legAnim = b.animFrame % 2 === 0 ? 0 : 2;

    // Legs (dark pants/boots)
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(b.x + 8, b.y + 34 + legAnim, 10, 8 - legAnim);
    ctx.fillRect(b.x + 22, b.y + 34 + (2 - legAnim), 10, 8 - (2 - legAnim));
    // Boots
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(b.x + 7, b.y + 38 + legAnim, 11, 4);
    ctx.fillRect(b.x + 21, b.y + 38 + (2 - legAnim), 11, 4);

    // Body
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(b.x + 4, b.y + 12, 32, 24);

    // White shirt (progressively torn/stained per phase)
    const shirtBase = b.phase >= 3 ? '#bb7777' : (b.phase === 2 ? '#ccbbbb' : '#eeeeee');
    ctx.fillStyle = shirtBase;
    ctx.fillRect(b.x + 6, b.y + 14, 28, 18);
    // Shirt folds
    ctx.fillStyle = b.phase >= 3 ? '#aa6666' : (b.phase === 2 ? '#bbaaaa' : '#dddddd');
    ctx.fillRect(b.x + 14, b.y + 15, 1, 16);
    ctx.fillRect(b.x + 22, b.y + 16, 1, 14);
    // Collar
    ctx.fillStyle = b.phase >= 3 ? '#996666' : '#cccccc';
    ctx.fillRect(b.x + 12, b.y + 13, 16, 3);
    // Stains
    ctx.fillStyle = '#8a6655';
    ctx.fillRect(b.x + 9, b.y + 18, 5, 4);
    ctx.fillRect(b.x + 24, b.y + 22, 6, 3);
    if (b.phase >= 2) {
      // Rips showing skin
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(b.x + 16, b.y + 25, 3, 7);
      ctx.fillRect(b.x + 22, b.y + 20, 2, 6);
      ctx.fillRect(b.x + 9, b.y + 26, 4, 4);
    }
    if (b.phase >= 3) {
      // More damage, dark stains
      ctx.fillStyle = '#661111';
      ctx.fillRect(b.x + 12, b.y + 20, 4, 3);
      ctx.fillRect(b.x + 26, b.y + 16, 3, 5);
    }
    if (b.phase === 4) {
      // Berserk — shirt barely intact, glowing cracks
      ctx.fillStyle = '#440808';
      ctx.fillRect(b.x + 8, b.y + 15, 6, 8);
      ctx.fillRect(b.x + 20, b.y + 18, 5, 6);
      // Glowing veins
      const veinGlow = 0.4 + Math.sin(this.elapsed * 6) * 0.2;
      ctx.globalAlpha = veinGlow;
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(b.x + 10, b.y + 16, 1, 10);
      ctx.fillRect(b.x + 18, b.y + 14, 1, 12);
      ctx.fillRect(b.x + 25, b.y + 20, 1, 8);
      ctx.globalAlpha = 1;
    }

    // Arms
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(b.x, b.y + 14, 6, 16);
    ctx.fillRect(b.x + b.width - 6, b.y + 14, 6, 16);
    // Arm muscle shading
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(b.x + 1, b.y + 16, 4, 6);
    ctx.fillRect(b.x + b.width - 5, b.y + 16, 4, 6);

    // Fists (clenched)
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(b.x - 2, b.y + 28, 8, 7);
    ctx.fillRect(b.x + b.width - 6, b.y + 28, 8, 7);
    // Knuckle detail
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(b.x - 1, b.y + 29, 6, 2);
    ctx.fillRect(b.x + b.width - 5, b.y + 29, 6, 2);

    // Head
    ctx.fillStyle = '#5a3828';
    ctx.fillRect(b.x + 6, b.y, 28, 16);
    ctx.fillStyle = '#6a4838';
    ctx.fillRect(b.x + 8, b.y + 2, 24, 12);

    // Brow ridge
    ctx.fillStyle = '#4a2818';
    ctx.fillRect(b.x + 8, b.y + 3, 24, 3);

    // Glowing eyes (phase-dependent)
    const eyeColor = b.phase === 4 ? '#ff00ff' : b.phase === 3 ? '#ff0000' : (b.phase === 2 ? '#ff4400' : '#ff6600');
    const eyeGlow = b.phase === 4 ? '#ff00ff' : b.phase === 3 ? '#ff0000' : '#ff6600';
    ctx.fillStyle = '#111';
    ctx.fillRect(b.x + 11, b.y + 5, 7, 5);
    ctx.fillRect(b.x + 22, b.y + 5, 7, 5);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(b.x + 12, b.y + 6, 5, 3);
    ctx.fillRect(b.x + 23, b.y + 6, 5, 3);
    // Eye inner glow
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(b.x + 13, b.y + 7, 2, 1);
    ctx.fillRect(b.x + 24, b.y + 7, 2, 1);
    // Eye glow halo
    ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 4) * 0.1;
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(b.x + 15, b.y + 7, 5, 0, Math.PI * 2);
    ctx.arc(b.x + 25, b.y + 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Mouth / jaw
    ctx.fillStyle = '#111';
    ctx.fillRect(b.x + 13, b.y + 11, 14, 3);
    if (b.phase >= 2) {
      // Fangs
      ctx.fillStyle = '#eee';
      ctx.fillRect(b.x + 14, b.y + 12, 2, 3);
      ctx.fillRect(b.x + 18, b.y + 13, 2, 2);
      ctx.fillRect(b.x + 24, b.y + 12, 2, 3);
    }
    if (b.phase >= 3) {
      // Drool / rage
      ctx.fillStyle = '#884444';
      ctx.fillRect(b.x + 16, b.y + 14, 1, 2);
      ctx.fillRect(b.x + 22, b.y + 14, 1, 2);
    }
    if (b.phase === 4) {
      // Berserk mouth — wider, more teeth
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(b.x + 12, b.y + 11, 16, 4);
      ctx.fillStyle = '#eee';
      ctx.fillRect(b.x + 13, b.y + 13, 2, 3);
      ctx.fillRect(b.x + 17, b.y + 13, 2, 3);
      ctx.fillRect(b.x + 21, b.y + 13, 2, 3);
      ctx.fillRect(b.x + 25, b.y + 13, 2, 3);
    }

    // Phase 3: dark aura
    if (b.phase === 3) {
      ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 3) * 0.05;
      ctx.fillStyle = '#440000';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Phase 4: intense berserk aura + dash trail
    if (b.phase === 4) {
      // Larger pulsing dark/red aura
      const auraSize = 50 + Math.sin(this.elapsed * 5) * 8;
      ctx.globalAlpha = 0.25 + Math.sin(this.elapsed * 4) * 0.1;
      const auraGrad = ctx.createRadialGradient(
        b.x + b.width / 2, b.y + b.height / 2, 5,
        b.x + b.width / 2, b.y + b.height / 2, auraSize
      );
      auraGrad.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
      auraGrad.addColorStop(0.5, 'rgba(100, 0, 0, 0.3)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, auraSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Energy crackling particles around boss
      for (let i = 0; i < 4; i++) {
        const sparkAngle = this.elapsed * 6 + i * Math.PI / 2;
        const sparkDist = 25 + Math.sin(this.elapsed * 8 + i) * 10;
        const sx = b.x + b.width / 2 + Math.cos(sparkAngle) * sparkDist;
        const sy = b.y + b.height / 2 + Math.sin(sparkAngle) * sparkDist;
        ctx.fillStyle = i % 2 === 0 ? '#ff2200' : '#ffaa00';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }
      
      // Dash charge trail
      if (b.dashCharging) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ff4400';
        const dashAngle = Math.atan2(b.dashDir?.dy || 0, b.dashDir?.dx || 0);
        for (let i = 1; i <= 4; i++) {
          const tx = b.x + b.width / 2 - Math.cos(dashAngle) * i * 12;
          const ty = b.y + b.height / 2 - Math.sin(dashAngle) * i * 12;
          ctx.globalAlpha = 0.4 - i * 0.08;
          ctx.fillRect(tx - 8, ty - 8, 16, 16);
        }
        ctx.globalAlpha = 1;
      }
    }

    ctx.globalAlpha = 1;

    // Boss HP bar (above boss, wider and more detailed)
    const barWidth = 70;
    const barX = b.x + b.width / 2 - barWidth / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(barX - 1, b.y - 14, barWidth + 2, 9);
    const hpPct = Math.max(0, b.hp / b.maxHp);
    const barColor = hpPct > 0.5 ? '#44ff44' : (hpPct > 0.25 ? '#ffaa00' : '#ff2222');
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, b.y - 13, barWidth, 7);
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, b.y - 13, barWidth * hpPct, 7);
    // Bar shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, b.y - 13, barWidth * hpPct, 2);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, b.y - 13, barWidth, 7);

    // Dialogue Bubble
    if (b.currentDialogue) {
      const msg = b.currentDialogue;
      ctx.font = 'bold 11px monospace';
      const textMetrics = ctx.measureText(msg);
      const textW = textMetrics.width + 16;
      const bx = b.x + b.width / 2;
      const by = b.y - 40;

      // Bubble background
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.rect(bx - textW / 2, by - 10, textW, 20);
      ctx.fill();
      ctx.stroke();

      // Tail
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + 10);
      ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx + 4, by + 10);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(msg, bx, by + 4);
    }
    
    // Boss death dialogue sequence
    if (b.dying && this.bossDialogueText) {
      const speaker = this.bossDialogueSpeaker;
      const text = this.bossDialogueText;
      const bubbleX = b.x + b.width / 2;
      const bubbleY = speaker === 'hero' ? b.y + b.height + 60 : b.y - 50;
      const bgColor = speaker === 'hero' ? 'rgba(0,80,200,0.9)' : 'rgba(150,0,0,0.9)';
      const borderColor = speaker === 'hero' ? '#4488ff' : '#ff4444';
      const labelText = speaker === 'hero' ? 'HICCUP' : 'THE RED DEATH';
      
      ctx.font = 'bold 10px monospace';
      const tw = ctx.measureText(text).width + 20;
      
      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(bubbleX - tw / 2, bubbleY - 18, tw, 36);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bubbleX - tw / 2, bubbleY - 18, tw, 36);
      
      // Speaker name
      ctx.fillStyle = borderColor;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, bubbleX, bubbleY - 8);
      
      // Dialogue text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(text, bubbleX, bubbleY + 8);
    }
    
    // Boss on throne indicator
    if (this.bossOnThrone) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('👑 ON THRONE', b.x + b.width / 2, b.y - 22);
      // Invincible glow
      ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 2) * 0.1;
      ctx.fillStyle = '#8800ff';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    // Lava Attack Animation
    if (b.dying && b.lavaAttackPhase > 0) {
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const timer = b.lavaAttackTimer || 0;
      
      // Phase 1: Ground cracks
      if (b.lavaAttackPhase === 1) {
        const numCracks = Math.floor(timer / 3);
        for (let i = 0; i < numCracks; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const dist = 20 + i * 5;
          const cx = bx + Math.cos(angle) * dist;
          const cy = by + Math.sin(angle) * dist;
          
          ctx.strokeStyle = '#ff3300';
          ctx.lineWidth = 2 + Math.sin(timer * 0.2 + i) * 1;
          ctx.globalAlpha = 0.6 + Math.sin(timer * 0.3 + i) * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
          ctx.stroke();
          
          // Glow from cracks
          ctx.fillStyle = '#ff6600';
          ctx.globalAlpha = 0.4;
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
      }
      
      // Phase 2: Lava eruption
      else if (b.lavaAttackPhase === 2) {
        // Rising lava pillars
        const height = timer * 3;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 40;
          const px = bx + Math.cos(angle) * dist;
          const py = by + Math.sin(angle) * dist;
          
          // Lava pillar
          ctx.fillStyle = '#ff3300';
          ctx.fillRect(px - 8, py - height, 16, height);
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(px - 6, py - height, 12, height);
          ctx.fillStyle = '#ff9900';
          ctx.fillRect(px - 4, py - height, 8, height);
          
          // Glow
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.arc(px, py - height / 2, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Central lava pool
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(bx, by, 30 + timer, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(bx, by, 20 + timer * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(bx, by, 10 + timer * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Phase 3: Massive explosion
      else if (b.lavaAttackPhase === 3) {
        const radius = timer * 8;
        // Explosion rings
        for (let r = 0; r < 5; r++) {
          const ringRadius = radius - r * 15;
          if (ringRadius > 0) {
            ctx.globalAlpha = 0.6 - r * 0.1;
            ctx.strokeStyle = ['#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff00'][r];
            ctx.lineWidth = 8 - r;
            ctx.beginPath();
            ctx.arc(bx, by, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        
        // Central bright flash
        ctx.globalAlpha = 1 - (timer / 30);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      
      // Phase 4: Aftermath glow
      else if (b.lavaAttackPhase === 4) {
        ctx.globalAlpha = 0.5 - (timer / 60);
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(bx, by, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    
    // Draw barrier shield
    if (b.barrier > 0) {
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const barrierPct = b.barrier / b.barrierMax;
      const shieldRadius = 45;
      
      // Shield outer glow
      ctx.globalAlpha = 0.15 + Math.sin(this.elapsed * 4) * 0.08;
      ctx.fillStyle = '#00ccff';
      ctx.beginPath();
      ctx.arc(bx, by, shieldRadius + 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Shield hexagonal shape
      ctx.globalAlpha = 0.35 * barrierPct;
      ctx.strokeStyle = '#00ddff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + this.elapsed * 0.5;
        const hx = bx + Math.cos(angle) * shieldRadius;
        const hy = by + Math.sin(angle) * shieldRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Shield energy lines
      ctx.globalAlpha = 0.25 * barrierPct;
      ctx.strokeStyle = '#44eeff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + this.elapsed * 0.5;
        const angle2 = (Math.PI / 3) * ((i + 2) % 6) + this.elapsed * 0.5;
        const hx1 = bx + Math.cos(angle) * shieldRadius;
        const hy1 = by + Math.sin(angle) * shieldRadius;
        const hx2 = bx + Math.cos(angle2) * shieldRadius;
        const hy2 = by + Math.sin(angle2) * shieldRadius;
        ctx.beginPath();
        ctx.moveTo(hx1, hy1);
        ctx.lineTo(hx2, hy2);
        ctx.stroke();
      }
      
      // Shield health bar above boss
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#222';
      ctx.fillRect(b.x - 5, b.y - 16, b.width + 10, 6);
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(b.x - 4, b.y - 15, (b.width + 8) * barrierPct, 4);
      ctx.strokeStyle = '#0088cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - 4, b.y - 15, b.width + 8, 4);
      
      ctx.globalAlpha = 1;
    }
    
    // Draw power attack warning zone
    if (b.powerAttackCharging) {
      const pulseAlpha = 0.2 + Math.sin(b.powerAttackTimer * 0.3) * 0.15;
      const warningRadius = 70;
      
      // Danger zone circle
      ctx.globalAlpha = pulseAlpha;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(b.powerAttackWarningX, b.powerAttackWarningY, warningRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Warning circle border
      ctx.globalAlpha = 0.6 + Math.sin(b.powerAttackTimer * 0.5) * 0.3;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(b.powerAttackWarningX, b.powerAttackWarningY, warningRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Warning text
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DANGER!', b.powerAttackWarningX, b.powerAttackWarningY - 20);
      ctx.font = '8px monospace';
      ctx.fillText(`${Math.ceil(b.powerAttackTimer / 60)}s`, b.powerAttackWarningX, b.powerAttackWarningY + 25);
      
      ctx.globalAlpha = 1;
    }
  }

  _drawCastleKeeper(ctx) {
    if (!this.castleKeeper) return;
    const k = this.castleKeeper;
    const bob = Math.sin(this.elapsed * 2) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(k.x + k.width / 2, k.y + k.height, k.width / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body - long wizard robe
    ctx.fillStyle = '#5533aa';
    ctx.fillRect(k.x + 2, k.y + 8 + bob, 20, 16);
    // Robe detail folds
    ctx.fillStyle = '#6644bb';
    ctx.fillRect(k.x + 4, k.y + 10 + bob, 3, 12);
    ctx.fillRect(k.x + 15, k.y + 11 + bob, 3, 11);
    // Robe hem
    ctx.fillStyle = '#4422aa';
    ctx.fillRect(k.x + 2, k.y + 22 + bob, 20, 2);
    // Belt/sash
    ctx.fillStyle = '#c4962a';
    ctx.fillRect(k.x + 3, k.y + 15 + bob, 18, 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(k.x + 10, k.y + 15 + bob, 4, 2);

    // Head
    ctx.fillStyle = '#ddb888';
    ctx.fillRect(k.x + 5, k.y + 2 + bob, 14, 9);

    // Hood/hat
    ctx.fillStyle = '#4422aa';
    ctx.fillRect(k.x + 3, k.y - 4 + bob, 18, 8);
    ctx.fillStyle = '#5533bb';
    ctx.fillRect(k.x + 5, k.y - 3 + bob, 14, 5);
    // Hat point
    ctx.fillStyle = '#4422aa';
    ctx.fillRect(k.x + 9, k.y - 8 + bob, 6, 5);
    ctx.fillRect(k.x + 10, k.y - 10 + bob, 4, 3);
    // Star on hat
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(k.x + 11, k.y - 7 + bob, 2, 2);

    // Eyes - wise blue
    ctx.fillStyle = '#fff';
    ctx.fillRect(k.x + 7, k.y + 4 + bob, 4, 3);
    ctx.fillRect(k.x + 13, k.y + 4 + bob, 4, 3);
    ctx.fillStyle = '#3366ff';
    ctx.fillRect(k.x + 8, k.y + 5 + bob, 2, 2);
    ctx.fillRect(k.x + 14, k.y + 5 + bob, 2, 2);
    // Eyebrows
    ctx.fillStyle = '#888';
    ctx.fillRect(k.x + 7, k.y + 3 + bob, 4, 1);
    ctx.fillRect(k.x + 13, k.y + 3 + bob, 4, 1);

    // Beard
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(k.x + 7, k.y + 8 + bob, 10, 5);
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(k.x + 9, k.y + 9 + bob, 6, 3);
    ctx.fillRect(k.x + 10, k.y + 12 + bob, 4, 2);

    // Staff
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(k.x - 5, k.y - 8 + bob, 3, 34);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(k.x - 5, k.y - 8 + bob, 3, 2);
    // Staff orb
    ctx.fillStyle = '#44ddff';
    ctx.beginPath();
    ctx.arc(k.x - 3, k.y - 11 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    // Orb glow
    ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 3) * 0.15;
    ctx.fillStyle = '#88eeff';
    ctx.beginPath();
    ctx.arc(k.x - 3, k.y - 11 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Orb shine
    ctx.fillStyle = '#aaffff';
    ctx.fillRect(k.x - 5, k.y - 13 + bob, 2, 2);

    // "Press F" indicator if nearby
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const kx = k.x + k.width / 2;
    const ky = k.y + k.height / 2;
    if (Math.hypot(px - kx, py - ky) < 50) {
      // Speech bubble background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(k.x - 8, k.y - 22, 40, 14);
      ctx.fillStyle = '#ffdd44';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[F] Talk', k.x + k.width / 2, k.y - 12);
    }
  }

  _drawNPCs(ctx) {
    this.npcs.forEach(npc => {
      const bob = Math.sin(this.elapsed * 2 + npc.x) * 1;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(npc.x + npc.width / 2, npc.y + npc.height, npc.width / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ancient Guardian - stone statue appearance
      // Body - stone pillar
      ctx.fillStyle = '#888899';
      ctx.fillRect(npc.x + 2, npc.y + 8 + bob, 20, 16);
      ctx.fillStyle = '#999aaa';
      ctx.fillRect(npc.x + 4, npc.y + 10 + bob, 16, 12);
      
      // Stone cracks
      ctx.fillStyle = '#666677';
      ctx.fillRect(npc.x + 6, npc.y + 12 + bob, 1, 6);
      ctx.fillRect(npc.x + 16, npc.y + 14 + bob, 1, 4);
      
      // Head - stone
      ctx.fillStyle = '#999aaa';
      ctx.fillRect(npc.x + 5, npc.y + 2 + bob, 14, 9);
      ctx.fillStyle = '#aabbcc';
      ctx.fillRect(npc.x + 6, npc.y + 3 + bob, 12, 7);

      // Eyes - glowing blue (ancient magic)
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(npc.x + 7, npc.y + 4 + bob, 4, 3);
      ctx.fillRect(npc.x + 13, npc.y + 4 + bob, 4, 3);
      // Eye glow
      ctx.globalAlpha = 0.4 + Math.sin(this.elapsed * 3) * 0.2;
      ctx.fillStyle = '#88ccff';
      ctx.fillRect(npc.x + 6, npc.y + 3 + bob, 6, 5);
      ctx.fillRect(npc.x + 12, npc.y + 3 + bob, 6, 5);
      ctx.globalAlpha = 1;

      // Helmet/crown
      ctx.fillStyle = '#666677';
      ctx.fillRect(npc.x + 3, npc.y - 2 + bob, 18, 5);
      ctx.fillStyle = '#777788';
      ctx.fillRect(npc.x + 5, npc.y - 1 + bob, 14, 3);
      
      // Crown spikes
      ctx.fillStyle = '#888899';
      ctx.fillRect(npc.x + 6, npc.y - 4 + bob, 3, 3);
      ctx.fillRect(npc.x + 11, npc.y - 5 + bob, 2, 4);
      ctx.fillRect(npc.x + 15, npc.y - 4 + bob, 3, 3);

      // "Press F" indicator if nearby or visible on puzzle level
      const nx = npc.x + npc.width / 2;
      const ny = npc.y + npc.height / 2;
      let showIndicator = false;
      if (this.level === 2.5 && !this.puzzleSolved) {
        // On puzzle level, show indicator if NPC is visible in viewport
        const vpW = this.width / this.scale;
        const vpH = this.height / this.scale;
        showIndicator = (nx >= this.camera.x && nx <= this.camera.x + vpW &&
                         ny >= this.camera.y && ny <= this.camera.y + vpH);
      } else {
        const ipx = this.player.x + this.player.width / 2;
        const ipy = this.player.y + this.player.height / 2;
        showIndicator = Math.hypot(ipx - nx, ipy - ny) < 80;
      }
      if (showIndicator) {
        // Speech bubble background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(npc.x - 8, npc.y - 22, 40, 14);
        ctx.fillStyle = '#44ddff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[F] Talk', npc.x + npc.width / 2, npc.y - 12);
      }
    });
  }

  _drawArrows(ctx) {
    this.player.arrows.forEach(a => {
      // Arrow shaft
      ctx.fillStyle = '#886644';
      ctx.fillRect(a.x - 3, a.y - 1, 6, 2);
      // Arrowhead
      ctx.fillStyle = '#ddeeff';
      const ax = a.vx > 0 ? a.x + 3 : (a.vx < 0 ? a.x - 5 : a.x - 1);
      const ay = a.vy > 0 ? a.y + 3 : (a.vy < 0 ? a.y - 5 : a.y - 1);
      ctx.fillRect(ax, ay, 3, 3);
      // Fletching
      ctx.fillStyle = '#ff4444';
      const fx = a.vx > 0 ? a.x - 4 : (a.vx < 0 ? a.x + 3 : a.x);
      const fy = a.vy > 0 ? a.y - 4 : (a.vy < 0 ? a.y + 3 : a.y);
      ctx.fillRect(fx, fy, 2, 2);
      // Trail
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(a.x - a.vx * 2 - 1, a.y - a.vy * 2 - 1, 2, 2);
      ctx.globalAlpha = 0.15;
      ctx.fillRect(a.x - a.vx * 4 - 1, a.y - a.vy * 4 - 1, 2, 2);
      ctx.globalAlpha = 1;
    });
  }

  _drawProjectiles(ctx) {
    this.projectiles.forEach(proj => {
      if (proj.isCrossbowBolt) {
        // Crossbow bolt - darker, thicker, faster-looking
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(angle);
        // Bolt shaft (dark wood)
        ctx.fillStyle = '#4a3322';
        ctx.fillRect(-6, -1, 12, 2);
        // Metal tip
        ctx.fillStyle = '#aabbcc';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(4, -2);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();
        // Fletching (small fins)
        ctx.fillStyle = '#555';
        ctx.fillRect(-6, -2, 2, 1);
        ctx.fillRect(-6, 1, 2, 1);
        ctx.restore();
        // Trail
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#888';
        ctx.fillRect(proj.x - proj.vx * 2 - 1, proj.y - proj.vy * 2 - 1, 2, 2);
        ctx.globalAlpha = 1;
      } else if (proj.isNecromancerBolt) {
        // Dark magic bolt - purple/black energy
        ctx.fillStyle = '#6622aa';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
        // Inner core - bright purple
        ctx.fillStyle = '#aa44ff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Dark center
        ctx.fillStyle = '#220044';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 1, 0, Math.PI * 2);
        ctx.fill();
        // Purple glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#8844ff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Dark trail
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#6622aa';
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 1.5, proj.y - proj.vy * 1.5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (proj.isFireball) {
        // Fire mage fireball — orange/red with flame trail
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffee44';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Flame glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Fire trail
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 1.5, proj.y - proj.vy * 1.5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 3, proj.y - proj.vy * 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = proj.boss ? '#ff8844' : '#ffcc88';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = proj.boss ? '#ff2200' : '#ff6622';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Trail
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = proj.boss ? '#ff4400' : '#ff8844';
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx, proj.y - proj.vy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  _drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  _drawDamageNumbers(ctx) {
    this.damageNumbers.forEach(d => {
      ctx.globalAlpha = d.life / 40;
      ctx.fillStyle = d.color;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.text, d.x, d.y);
    });
    ctx.globalAlpha = 1;
  }

  _drawEnding(ctx) {
    const cx = this.worldWidth / 2;
    const cy = this.worldHeight / 2;

    if (this.endingPhase >= 0) {
      // Light spreading from center - warm golden
      const lightProgress = Math.min(this.endingTimer / 120, 1);
      ctx.globalAlpha = lightProgress * 0.25;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy, lightProgress * 200, 0, Math.PI * 2);
      ctx.fill();
      // Sparkle particles
      ctx.globalAlpha = lightProgress * 0.4;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + this.elapsed;
        const dist = lightProgress * 100 + Math.sin(this.elapsed * 2 + i) * 20;
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    if (this.endingPhase >= 1) {
      // Toothless - Night Fury dragon sprite
      const dy = cy - 30;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, dy + 26, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body (dark, sleek)
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 12, dy + 6, 24, 16);
      ctx.fillStyle = '#222244';
      ctx.fillRect(cx - 10, dy + 8, 20, 12);
      // Belly (lighter)
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(cx - 6, dy + 12, 12, 8);
      // Wings (folded)
      ctx.fillStyle = '#111128';
      ctx.fillRect(cx - 18, dy + 4, 8, 14);
      ctx.fillRect(cx + 10, dy + 4, 8, 14);
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(cx - 16, dy + 6, 6, 10);
      ctx.fillRect(cx + 10, dy + 6, 6, 10);
      // Head
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 8, dy - 4, 16, 12);
      ctx.fillStyle = '#222244';
      ctx.fillRect(cx - 6, dy - 2, 12, 8);
      // Ears/nubs
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 7, dy - 7, 4, 4);
      ctx.fillRect(cx + 3, dy - 7, 4, 4);
      // Eyes - big, green, friendly
      ctx.fillStyle = '#44ff66';
      ctx.fillRect(cx - 5, dy, 4, 4);
      ctx.fillRect(cx + 1, dy, 4, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(cx - 4, dy + 1, 2, 2);
      ctx.fillRect(cx + 2, dy + 1, 2, 2);
      // Eye shine
      ctx.fillStyle = '#aaffcc';
      ctx.fillRect(cx - 5, dy, 1, 1);
      ctx.fillRect(cx + 1, dy, 1, 1);
      // Nostrils
      ctx.fillStyle = '#111';
      ctx.fillRect(cx - 3, dy + 5, 2, 1);
      ctx.fillRect(cx + 1, dy + 5, 2, 1);
      // Tail
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx + 12, dy + 16, 10, 4);
      ctx.fillRect(cx + 20, dy + 14, 6, 4);
      // Tail fin
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(cx + 24, dy + 12, 4, 3);
      ctx.fillRect(cx + 24, dy + 17, 4, 3);
      // Happy expression glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(cx - 14, dy - 8, 28, 36);
      ctx.globalAlpha = 1;
    }

    // Dialogue system — shows current phase's dialogues
    if (this.endingPhase >= 2 && this.endingPhase <= 4) {
      // Heart floating between them
      ctx.fillStyle = '#ff4466';
      const hy = cy + 45 + Math.sin(this.elapsed * 2) * 3;
      ctx.fillRect(cx - 3, hy, 2, 2);
      ctx.fillRect(cx + 1, hy, 2, 2);
      ctx.fillRect(cx - 4, hy + 1, 2, 2);
      ctx.fillRect(cx + 2, hy + 1, 2, 2);
      ctx.fillRect(cx - 3, hy + 2, 6, 2);
      ctx.fillRect(cx - 2, hy + 4, 4, 1);
      ctx.fillRect(cx - 1, hy + 5, 2, 1);
      
      // Get dialogues for current phase
      const phaseDialogues = this.endingDialogues.filter(d => d.phase === this.endingPhase);
      
      // Ornate dialogue box
      const boxY = cy + 55;
      const boxH = 14 + phaseDialogues.length * 22;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(cx - 130, boxY, 260, boxH);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 130, boxY, 260, boxH);
      // Corner ornaments
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cx - 130, boxY, 6, 6);
      ctx.fillRect(cx + 124, boxY, 6, 6);
      ctx.fillRect(cx - 130, boxY + boxH - 6, 6, 6);
      ctx.fillRect(cx + 124, boxY + boxH - 6, 6, 6);
      
      // Draw each dialogue line
      phaseDialogues.forEach((d, i) => {
        const ly = boxY + 16 + i * 22;
        // Speaker label
        ctx.fillStyle = d.color;
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(d.speaker === 'toothless' ? 'TOOTHLESS' : 'HICCUP', cx, ly - 2);
        // Text
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(d.text, cx, ly + 10);
      });
    }

    // Light returns overlay (phase 3+)
    if (this.endingPhase >= 3) {
      const progress = Math.min((this.endingTimer - 700) / 200, 1);
      ctx.globalAlpha = progress * 0.3;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
      ctx.globalAlpha = 1;
    }

    if (this.endingPhase >= 5) {
      // Victory screen with ornate design
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
      // Victory banner
      ctx.fillStyle = 'rgba(139,0,0,0.6)';
      ctx.fillRect(cx - 120, cy - 50, 240, 110);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 120, cy - 50, 240, 110);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\ud83c\udf89 VICTORY \ud83c\udf89', cx, cy - 28);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#ffeecc';
      ctx.fillText('Toothless is free! Berk is saved!', cx, cy - 8);
      ctx.fillText('The Red Death is no more.', cx, cy + 6);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#88ddff';
      ctx.fillText('*joyful roar* — Toothless', cx, cy + 26);
      ctx.fillStyle = '#4488ff';
      ctx.fillText('"Together, bud." — Hiccup', cx, cy + 40);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('\u2661 How to Game Your Dragon \u2661', cx, cy + 56);
    }
  }

  // ─── HUD (screen space) ──────────────────────────────────────────────
  _drawHUD(ctx) {
    const p = this.player;
    const pad = 15;

    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, 50);

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(pad, 12, 200, 18);
    const hpPct = Math.max(0, p.hp / p.maxHp);
    const hpColor = hpPct > 0.5 ? '#44ff44' : (hpPct > 0.25 ? '#ffaa00' : '#ff2222');
    ctx.fillStyle = hpColor;
    ctx.fillRect(pad + 1, 13, 198 * hpPct, 16);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, 12, 200, 18);

    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`❤ ${p.hp}/${p.maxHp}`, pad + 4, 27);

    // Weapon indicator
    ctx.fillStyle = '#aaaaff';
    ctx.font = '12px monospace';
    ctx.fillText(`⚔ ${p.weapon === 'bladesOfChaos' ? 'BLADES OF CHAOS' : p.weapon.toUpperCase()}`, pad + 220, 27);

    // Level indicator
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${this.level}`, this.width / 2, 27);

    // Buffs
    let buffX = this.width - pad - 100;
    if (p.shieldActive) {
      ctx.fillStyle = '#4488ff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🛡️ ${Math.ceil(p.shieldTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }
    if (p.dmgBoost) {
      ctx.fillStyle = '#ff8844';
      ctx.fillText(`🔥 ${Math.ceil(p.dmgBoostTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }
    if (p.speedBoost) {
      ctx.fillStyle = '#44ddff';
      ctx.fillText(`⚡ ${Math.ceil(p.speedBoostTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }
    if (p.lifestealActive) {
      ctx.fillStyle = '#cc2244';
      ctx.fillText(`🩸 ${Math.ceil(p.lifestealTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }
    if (p.thornsActive) {
      ctx.fillStyle = '#22aa66';
      ctx.fillText(`🌿 ${Math.ceil(p.thornsTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }
    if (p.rageActive) {
      ctx.fillStyle = '#ff4400';
      ctx.fillText(`💢 ${Math.ceil(p.rageTimer / 60)}s`, buffX, 27);
      buffX -= 60;
    }

    // Special ability cooldown
    ctx.fillStyle = p.specialReady ? '#ffdd44' : '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      p.specialReady ? '[Q] Special Ready' : `[Q] ${Math.ceil(p.specialCooldown / 60)}s`,
      this.width - pad, 27
    );

    // Enemies remaining counter
    const aliveEnemies = this.enemies.filter(e => !e.dead).length;
    if (aliveEnemies > 0 && !this.boss) {
      ctx.fillStyle = '#ff8888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Enemies: ${aliveEnemies}`, this.width / 2, 47);
    }

    // Wave HUD (Level 3.5)
    if (this.level === 3.5 && this.waveLevel) {
      // Wave counter
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.width / 2 - 100, 52, 200, 22);
      ctx.strokeStyle = '#ff6644';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.width / 2 - 100, 52, 200, 22);
      ctx.fillStyle = '#ff8866';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      if (this.waveState === 'active') {
        ctx.fillText(`WAVE ${this.currentWave}/${this.totalWaves} — Enemies: ${this.waveEnemiesRemaining}`, this.width / 2, 67);
      } else if (this.waveState === 'pause' && this.currentWave > 0) {
        ctx.fillStyle = '#44ff88';
        ctx.fillText(`Wave ${this.currentWave} cleared! Prepare...`, this.width / 2, 67);
      } else if (this.waveState === 'complete') {
        ctx.fillStyle = '#44ff88';
        ctx.fillText('ALL WAVES CLEARED! Gate opened!', this.width / 2, 67);
      } else {
        ctx.fillStyle = '#ffdd44';
        ctx.fillText('Approach the north gate and press F to begin...', this.width / 2, 67);
      }

      // Wave kills
      if (this.waveKills > 0) {
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`Kills: ${this.waveKills}`, this.width / 2, 86);
      }
    }

    // Wave announcement overlay
    if (this.waveAnnounceTimer > 0 && this.waveAnnounceText) {
      const alpha = Math.min(1, this.waveAnnounceTimer / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, this.height / 2 - 40, this.width, 80);
      ctx.fillStyle = '#ff4422';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.waveAnnounceText, this.width / 2, this.height / 2 + 5);
      ctx.globalAlpha = 1;
    }

    // Boss bar at top
    if (this.boss && !this.boss.dying) {
      const bossBarW = Math.min(400, this.width - 100);
      const bossBarX = (this.width - bossBarW) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bossBarX - 5, 55, bossBarW + 10, 25);
      ctx.fillStyle = '#444';
      ctx.fillRect(bossBarX, 60, bossBarW, 14);
      const bhp = Math.max(0, this.boss.hp / this.boss.maxHp);
      const bColor = bhp > 0.5 ? '#ff4444' : (bhp > 0.25 ? '#ff6600' : '#ff0000');
      ctx.fillStyle = bColor;
      ctx.fillRect(bossBarX + 1, 61, (bossBarW - 2) * bhp, 12);
      ctx.strokeStyle = '#888';
      ctx.strokeRect(bossBarX, 60, bossBarW, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`THE RED DEATH — Phase ${this.boss.phase}`, this.width / 2, 72);
    }

    // Controls help (bottom)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, this.height - 28, this.width, 28);
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    if (this.level === 2.5 && !this.puzzleSolved) {
      ctx.fillText('Arrow Keys/WASD: Pan Camera | Click: Rotate Node | Connect Source ⚡ to Gate 🏰', this.width / 2, this.height - 10);
    } else {
      ctx.fillText('WASD/Arrows: Move | Space/Click: Attack | E: Switch Weapon | Q: Special | F: Interact | H: Help', this.width / 2, this.height - 10);
    }
    
    // Puzzle level overlay panel
    if (this.level === 2.5 && !this.puzzleSolved) {
      // Side panel with puzzle status
      const panelW = 160;
      const panelH = 100;
      const panelX = this.width - panelW - 10;
      const panelY = 60;
      
      // Panel background
      ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = '#44aaff';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, panelY, panelW, panelH);
      
      // Title
      ctx.fillStyle = '#44aaff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ CIRCUIT PUZZLE', panelX + panelW / 2, panelY + 16);
      
      // Status
      const poweredCount = this.circuitNodes.filter(n => n.powered).length;
      const totalCount = this.circuitNodes.length;
      ctx.fillStyle = '#aaccee';
      ctx.font = '9px monospace';
      ctx.fillText(`Nodes Powered: ${poweredCount}/${totalCount}`, panelX + panelW / 2, panelY + 35);
      
      // Gate status
      ctx.fillStyle = this.gateNode.powered ? '#44ff44' : '#ff6644';
      ctx.fillText(`Gate: ${this.gateNode.powered ? 'POWERED ✓' : 'OFFLINE ✗'}`, panelX + panelW / 2, panelY + 52);
      
      // Instructions
      ctx.fillStyle = '#778899';
      ctx.font = '8px monospace';
      ctx.fillText('Click nodes to rotate', panelX + panelW / 2, panelY + 70);
      ctx.fillText('Connect ⚡ to 🏰', panelX + panelW / 2, panelY + 82);
      ctx.fillText('Arrow keys to pan view', panelX + panelW / 2, panelY + 94);
    }
  }

  _drawHintBubble(ctx) {
    if (!this.hintBubble) return;
    const h = this.hintBubble;

    const screenX = (h.x - this.camera.x) * this.scale;
    const screenY = (h.y - this.camera.y) * this.scale - 40;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    const textW = ctx.measureText(h.text).width + 20;
    ctx.fillRect(screenX - textW / 2, screenY - 15, textW, 30);
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX - textW / 2, screenY - 15, textW, 30);

    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(h.text, screenX, screenY + 5);
  }

  _drawHudMessage(ctx) {
    const alpha = Math.min(1, this.hudMessageTimer / 30);
    ctx.globalAlpha = alpha;
    
    // Split long messages into multiple lines
    const maxWidth = this.width - 100;
    const words = this.hudMessage.split(' ');
    const lines = [];
    let currentLine = '';
    
    ctx.font = 'bold 14px monospace';
    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // Draw background box
    const lineHeight = 20;
    const boxHeight = lines.length * lineHeight + 20;
    const mw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(this.width / 2 - mw / 2, 85, mw, boxHeight);
    
    // Draw border
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.width / 2 - mw / 2, 85, mw, boxHeight);
    
    // Draw text lines
    ctx.fillStyle = '#ffdd44';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillText(line, this.width / 2, 105 + i * lineHeight);
    });
    
    ctx.globalAlpha = 1;
  }

  _drawVignette(ctx) {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.3,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(255,0,0,0)');
    gradient.addColorStop(1, `rgba(255,0,0,${this.vignetteAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _drawTransition(ctx) {
    ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.transitionAlpha > 0.3) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.transitionText, this.width / 2, this.height / 2 - 10);

      // Subtitle
      const subtitles = {
        1: 'A Viking\'s first steps',
        2: 'Into the wild unknown',
        2.5: 'Restore the Dragon Eye',
        3: 'Where dragons nest',
        3.5: 'Survive the dragon onslaught',
        4: 'Face the Red Death!',
      };
      ctx.fillStyle = '#ccbbaa';
      ctx.font = '14px monospace';
      ctx.fillText(subtitles[this.level] || '', this.width / 2, this.height / 2 + 20);
    }
  }
  
  _drawWeaponPickupIndicator(ctx) {
    const alpha = Math.min(1, this.weaponPickupTimer / 60);
    const y = 80 + (1 - alpha) * 20; // Slide up animation
    
    ctx.globalAlpha = alpha;
    
    const w = this.weaponPickupIndicator;
    const cx = this.width / 2;
    
    // Weapon data with descriptions
    const weaponData = {
      sword: {
        name: 'SWORD',
        desc: 'A reliable blade for close combat.',
        ability: 'SPECIAL: Fast slashes, basic damage',
        color: '#cccccc',
      },
      bow: {
        name: 'BOW',
        desc: 'Ranged weapon for safe distance attacks.',
        ability: 'SPECIAL: Fires arrows from afar',
        color: '#88aa44',
      },
      spear: {
        name: 'SPEAR',
        desc: 'Long reach thrust that pierces defenses.',
        ability: 'SPECIAL: Extended range, armor pierce',
        color: '#aaaadd',
      },
      halberd: {
        name: 'RUNIC HALBERD',
        desc: 'Ancient runic polearm with devastating power.',
        ability: 'SPECIAL: Wide arc swing, massive damage, breaks shields',
        color: '#44ff88',
      },
      bladesOfChaos: {
        name: '\u26d3\ufe0f\ud83d\udd25 BLADES OF CHAOS \ud83d\udd25\u26d3\ufe0f',
        desc: 'Twin chain-blades forged in hellfire.',
        ability: 'CLICK: 3-hit combo | HOLD+RELEASE: Spinning Fury (360\u00b0 AoE)',
        color: '#ff4400',
      },
    };
    const data = weaponData[w] || { name: '???', desc: '', ability: '', color: '#fff' };
    
    // Background - taller to fit description
    const boxH = 140;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(cx - 150, y, 300, boxH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 150, y, 300, boxH);
    // Corner ornaments
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 150, y, 8, 8);
    ctx.fillRect(cx + 142, y, 8, 8);
    ctx.fillRect(cx - 150, y + boxH - 8, 8, 8);
    ctx.fillRect(cx + 142, y + boxH - 8, 8, 8);
    // Inner border accent
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 146, y + 4, 292, boxH - 8);
    
    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2728 NEW WEAPON ACQUIRED! \u2728', cx, y + 20);
    
    // Separator line
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 120, y + 28);
    ctx.lineTo(cx + 120, y + 28);
    ctx.stroke();
    
    // Weapon icon (large)
    const iconY = y + 55;
    if (w === 'sword') {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(cx - 3, iconY - 15, 6, 30);
      ctx.fillStyle = '#886611';
      ctx.fillRect(cx - 9, iconY + 10, 18, 6);
      ctx.fillStyle = '#c4962a';
      ctx.fillRect(cx - 6, iconY + 11, 12, 3);
    } else if (w === 'bow') {
      ctx.strokeStyle = '#886611';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, iconY, 15, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#ddd';
      ctx.fillRect(cx - 1, iconY - 15, 2, 30);
    } else if (w === 'spear') {
      ctx.fillStyle = '#886611';
      ctx.fillRect(cx - 2, iconY - 20, 4, 40);
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(cx, iconY - 25);
      ctx.lineTo(cx - 8, iconY - 15);
      ctx.lineTo(cx + 8, iconY - 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 1, iconY - 23, 2, 5);
    } else if (w === 'halberd') {
      ctx.fillStyle = '#553311';
      ctx.fillRect(cx - 2, iconY - 20, 4, 40);
      ctx.fillStyle = '#44cc66';
      ctx.fillRect(cx - 10, iconY - 18, 12, 8);
      ctx.fillStyle = '#66ee88';
      ctx.fillRect(cx - 8, iconY - 16, 8, 4);
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(cx, iconY - 25);
      ctx.lineTo(cx - 5, iconY - 18);
      ctx.lineTo(cx + 5, iconY - 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(cx - 1, iconY - 8, 2, 10);
      ctx.globalAlpha = alpha;
    } else if (w === 'bladesOfChaos') {
      // Left blade
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - 5, iconY);
      ctx.lineTo(cx - 25, iconY - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(cx - 32, iconY - 17, 12, 8);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(cx - 30, iconY - 15, 8, 4);
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(cx - 34, iconY - 13);
      ctx.lineTo(cx - 32, iconY - 18);
      ctx.lineTo(cx - 32, iconY - 8);
      ctx.closePath();
      ctx.fill();
      // Right blade
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx + 5, iconY);
      ctx.lineTo(cx + 25, iconY - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(cx + 20, iconY - 17, 12, 8);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(cx + 22, iconY - 15, 8, 4);
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(cx + 34, iconY - 13);
      ctx.lineTo(cx + 32, iconY - 18);
      ctx.lineTo(cx + 32, iconY - 8);
      ctx.closePath();
      ctx.fill();
      // Fire glow center
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(cx, iconY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(cx, iconY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
    
    // Weapon name
    ctx.fillStyle = data.color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(data.name, cx, y + 85);
    
    // Description
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px monospace';
    ctx.fillText(data.desc, cx, y + 102);
    
    // Special ability (highlighted)
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(data.ability, cx, y + 118);
    
    // Press E hint
    ctx.fillStyle = '#888888';
    ctx.font = '8px monospace';
    ctx.fillText('Press E to switch weapons', cx, y + 133);
    
    ctx.globalAlpha = 1;
  }
  
  _drawHelpScreen(ctx) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Help panel
    const panelW = Math.min(700, this.width - 80);
    const panelH = Math.min(550, this.height - 80);
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Corner decorations
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? panelX : panelX + panelW - 8;
      const y = i % 2 === 0 ? panelY : panelY + panelH - 8;
      ctx.fillRect(x, y, 8, 8);
    }
    
    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ HELP & CONTROLS ⚔️', this.width / 2, panelY + 45);
    
    // Divider line
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 40, panelY + 60);
    ctx.lineTo(panelX + panelW - 40, panelY + 60);
    ctx.stroke();
    
    // Two column layout
    const leftCol = panelX + 40;
    const rightCol = panelX + panelW / 2 + 20;
    const colWidth = panelW / 2 - 60;
    
    // LEFT COLUMN - CONTROLS
    let yPos = panelY + 90;
    
    // Movement section
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MOVEMENT', leftCol, yPos);
    yPos += 25;
    
    ctx.font = '13px monospace';
    const movementControls = [
      ['WASD', 'Move Up/Left/Down/Right'],
      ['Arrow Keys', 'Alternative movement'],
    ];
    
    movementControls.forEach(([key, desc]) => {
      ctx.fillStyle = '#44aaff';
      ctx.fillText(key, leftCol + 5, yPos);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px monospace';
      ctx.fillText(desc, leftCol + 5, yPos + 14);
      ctx.font = '13px monospace';
      yPos += 32;
    });
    
    yPos += 10;
    
    // Combat section
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('COMBAT', leftCol, yPos);
    yPos += 25;
    
    ctx.font = '13px monospace';
    const combatControls = [
      ['SPACE', 'Attack with weapon'],
      ['Click', 'Alternative attack'],
      ['E / K', 'Switch weapons'],
      ['Q', 'Special AoE attack'],
    ];
    
    combatControls.forEach(([key, desc]) => {
      ctx.fillStyle = '#ff8844';
      ctx.fillText(key, leftCol + 5, yPos);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px monospace';
      ctx.fillText(desc, leftCol + 5, yPos + 14);
      ctx.font = '13px monospace';
      yPos += 32;
    });
    
    yPos += 10;
    
    // Interaction section
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('INTERACTION', leftCol, yPos);
    yPos += 25;
    
    ctx.font = '13px monospace';
    const interactionControls = [
      ['F', 'Talk to NPCs / Gates'],
      ['H', 'Toggle help screen'],
    ];
    
    interactionControls.forEach(([key, desc]) => {
      ctx.fillStyle = '#44ff88';
      ctx.fillText(key, leftCol + 5, yPos);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px monospace';
      ctx.fillText(desc, leftCol + 5, yPos + 14);
      ctx.font = '13px monospace';
      yPos += 32;
    });
    
    // RIGHT COLUMN - WEAPONS & TIPS
    yPos = panelY + 90;
    
    // Weapons section
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WEAPONS', rightCol, yPos);
    yPos += 25;
    
    ctx.font = '12px monospace';
    const weapons = [
      ['⚔️ SWORD', 'Fast melee attack', 'Medium damage'],
      ['🏹 BOW', 'Ranged projectile', 'Shoots arrows'],
      ['🔱 SPEAR', 'Long reach thrust', 'High damage'],
      ['💚 HALBERD', 'Wide arc swing', 'Knockback + crowd control'],
      ['🔥 BLADES OF CHAOS', 'Click: 3-hit fire combo', 'Hold+Release: SPINNING FURY'],
    ];
    
    weapons.forEach(([name, line1, line2]) => {
      ctx.fillStyle = '#44ff44';
      ctx.fillText(name, rightCol + 5, yPos);
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(line1, rightCol + 5, yPos + 14);
      ctx.fillText(line2, rightCol + 5, yPos + 26);
      ctx.font = '12px monospace';
      yPos += 45;
    });
    
    yPos += 15;
    
    // Tips section
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('GAMEPLAY TIPS', rightCol, yPos);
    yPos += 25;
    
    ctx.fillStyle = '#ffaa44';
    ctx.font = '11px monospace';
    const tips = [
      '• Collect hearts to restore HP',
      '• Use buffs in tough battles',
      '• Switch weapons tactically',
      '• Dodge enemy projectiles',
      '• Special has 4s cooldown',
      '• Talk to NPCs for hints',
      '• Explore for power-ups',
    ];
    
    tips.forEach(tip => {
      ctx.fillText(tip, rightCol + 5, yPos);
      yPos += 20;
    });
    
    // Bottom instruction
    ctx.fillStyle = '#888';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press H to close', this.width / 2, panelY + panelH - 25);
    
    // Decorative elements
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(panelX + 20, panelY + 75, panelW - 40, 1);
  }

  // ─── END GAME ─────────────────────────────────────────────────────────
  _endGame(won) {
    this.running = false;
    this.won = won;

    // Clean up
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    document.removeEventListener('mousemove', this._mouseMove);
    document.removeEventListener('mousedown', this._mouseDown);
    document.removeEventListener('mouseup', this._mouseUp);
    window.removeEventListener('resize', this._resizeHandler);

    setTimeout(() => {
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.remove();
      }
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => { });
      }
      if (this.onComplete) {
        this.onComplete(won);
      }
    }, 500);
  }

  dispose() {
    this.running = false;
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    document.removeEventListener('mousemove', this._mouseMove);
    document.removeEventListener('mousedown', this._mouseDown);
    document.removeEventListener('mouseup', this._mouseUp);
    window.removeEventListener('resize', this._resizeHandler);

    this._closePasswordUI();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.remove();
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => { });
    }
  }
}
