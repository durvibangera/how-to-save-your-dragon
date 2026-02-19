import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TrackBuilder } from "./TrackBuilder";
import { AreaManager } from "../areas/AreaManager";
import { ParticleSystem } from "../effects/ParticleSystem";
import { UIOverlay } from "../ui/UIOverlay";
import { AudioManager } from "../audio/AudioManager";
import { CameraController } from "./CameraController";
import { EpilogueSequence } from "../epilogue/EpilogueSequence";
import { GateSystem } from "../quiz/QuizGateSystem";
import { SiegeGame } from "../quiz/games/SiegeGame";
import { BewilderbeastBossFight } from "../bossfight/BewilderbeastBossFight";

export class RollerCoasterEngine {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.running = false;
    this.currentArea = 0;
    this.progress = 0; // 0 to 1 along entire track (including epilogue extension)
    this.speed = 0;
    this.targetSpeed = 0.015;
    this.paused = false;
    this.started = false;
    this.inEpilogue = false;
    this.epilogueTriggered = false;

    // Dragon model
    this.dragonModel = null;
    this.dragonMixer = null;
    this.dragonReady = false;

    // Dragon fall state
    this.dragonFalling = false;
    this.dragonFallTimer = 0;
    this.dragonFallStartY = 0;
    this.siegeGame = null;
    this.skipButton = null;

    // Free flight control
    this.keys = {};
    this.dragonPos = new THREE.Vector3(0, 8, 0);     // world position
    this.dragonForward = new THREE.Vector3(0, 0, -1); // facing direction
    this.dragonSpeed = 0;                              // current speed (units/sec)
    this.baseSpeed = 18;                               // cruising speed
    this.yawRate = 0;
    this.pitchRate = 0;
    this.maxYawSpeed = 1.6;                            // rad/s
    this.maxPitchSpeed = 1.0;
    this.yawAccel = 3.5;
    this.pitchAccel = 3.0;
    this.playerBank = 0;
    this.playerPitch = 0;
    this.boostActive = false;

    // Track lookup for corner assist & area detection
    this.trackLookup = [];
    this._nearestTrack = null;

    // Hoop score
    this.hoopScore = 0;
    this.hoopsCollected = new Set();
    this.hoopCounterEl = null;

    // 6 areas × 120 units = 720, epilogue = 300 units, total = 1020
    // Area portion ends at 720/1020 ≈ 0.7059
    this.areaTrackEnd = 720 / 1020;

    this._initRenderer();
    this._initScene();
    this._initLights();

    this.trackBuilder = new TrackBuilder(this.scene);
    this.track = this.trackBuilder.build();

    this.cameraController = new CameraController(this.camera, this.track);
    this.areaManager = new AreaManager(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.audioManager = new AudioManager();
    this.ui = new UIOverlay(this.container);
    this.gateSystem = new GateSystem(this.scene, this.ui, this.particleSystem, this.trackBuilder.build ? this.track : this.track, this.areaTrackEnd);

    this.epilogue = new EpilogueSequence(this.container, this.scene, this.camera, this.renderer, this.ui, {
      onPause: () => { this.paused = true; },
      onResume: () => { this.paused = false; }
    });

    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    // ESC key handler for pause menu
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);

    // Show loading screen and wait for dragon to load
    this.ui.showLoadingScreen("Are you ready to fly?");
    this._loadDragonModel().then(() => {
      this.ui.hideLoadingScreen();
      this._begin();
    });
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.5,
      2000
    );
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000011, 0.003);
    this.scene.background = new THREE.Color(0x000011);
  }

  _initLights() {
    // Warm ambient
    const ambient = new THREE.AmbientLight(0x556688, 0.65);
    this.scene.add(ambient);

    // Primary sunlight
    const dir = new THREE.DirectionalLight(0xfff0dd, 1.4);
    dir.position.set(60, 100, 40);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 300;
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -60;
    dir.shadow.bias = -0.0005;
    dir.shadow.normalBias = 0.02;
    this.scene.add(dir);
    this.dirLight = dir;

    // Hemisphere: sky blue above, warm earth below
    const hemiLight = new THREE.HemisphereLight(0x8cb8e0, 0x554433, 0.5);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;
  }

  _onKeyDown(e) {
    if (e.code === 'Escape') {
      e.preventDefault();
      // If chapter select is open, close it back to pause menu
      if (this.ui.isChapterVisible) {
        this.ui.hideChapterSelect();
        this._showPauseMenu();
        return;
      }
      // Toggle pause menu
      if (this.ui.isPauseVisible) {
        this._resumeFromPause();
      } else if (this.started && !this.inEpilogue) {
        this._pauseGame();
      }
      return;
    }
    // Prevent browser defaults for game keys (scroll, find, etc.)
    if (['Space', 'ControlLeft', 'ControlRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _pauseGame() {
    this.paused = true;
    this._showPauseMenu();
  }

  _showPauseMenu() {
    this.ui.showPauseMenu({
      onResume: () => this._resumeFromPause(),
      onRestart: () => this._restartGame(),
      onChapterSelect: () => this._showChapterSelect(),
      onHome: () => this._goHome(),
    });
  }

  _resumeFromPause() {
    this.ui.hidePauseMenu();
    this.paused = false;
  }

  _showChapterSelect() {
    this.ui.showChapterSelect({
      onSelect: (chapterId) => this._navigateToChapter(chapterId),
      onBack: () => this._showPauseMenu(),
    });
  }

  _navigateToChapter(chapterId) {
    if (chapterId.startsWith('area-')) {
      const areaIndex = parseInt(chapterId.split('-')[1]);
      // Teleport dragon to the start of this area
      const t = (areaIndex / 6) * this.areaTrackEnd;
      this.currentArea = areaIndex;
      this.progress = t;
      this.dragonPos.copy(this.track.getPointAt(t));
      this.dragonForward.copy(this.track.getTangentAt(t)).normalize();
      this.dragonSpeed = this.baseSpeed;
      this.speed = 0;
      this.paused = false;
      this.inEpilogue = false;
      this.epilogueTriggered = false;
      this.dragonFalling = false;
      this.hoopScore = 0;
      this.hoopsCollected.clear();
      if (this.hoopCounterEl) this._updateHoopCounter();
      this.ui.showAreaTitle(areaIndex);
      this._createProgressBar();
    } else if (chapterId.startsWith('siege-')) {
      const levelId = parseFloat(chapterId.split('siege-')[1]);
      // Determine weapons available at this level
      const weaponsByLevel = {
        1:   { sword: true, bow: false, spear: false, halberd: false, bladesOfChaos: false },
        2:   { sword: true, bow: true,  spear: true,  halberd: false, bladesOfChaos: false },
        2.5: { sword: true, bow: true,  spear: true,  halberd: false, bladesOfChaos: false },
        3:   { sword: true, bow: true,  spear: true,  halberd: false, bladesOfChaos: false },
        3.5: { sword: true, bow: true,  spear: true,  halberd: true,  bladesOfChaos: false },
        4:   { sword: true, bow: true,  spear: true,  halberd: true,  bladesOfChaos: true  },
      };
      // Clean up current state and go to siege
      this._removeSkipButton();
      this.running = false;
      this.paused = false;
      this.inEpilogue = true;
      this.ui.hideProgressBar();
      if (this.renderer.domElement) {
        this.renderer.domElement.style.display = 'none';
      }
      this.ui.dispose();

      const siegeContainer = document.createElement('div');
      siegeContainer.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        overflow:hidden;background:#000;z-index:5000;
      `;
      this.container.appendChild(siegeContainer);

      this.siegeGame = new SiegeGame(siegeContainer, (success) => {
        siegeContainer.remove();
        if (success) {
          this._showVictoryScreen();
        } else {
          this._launchSiegeGame();
        }
      });

      // Override weapons based on chapter selection
      const weapons = weaponsByLevel[levelId] || weaponsByLevel[1];
      this.siegeGame.player.hasWeapons = { ...weapons };
      // Load the specific level
      this.siegeGame._loadLevel(levelId);
    } else if (chapterId === 'bewilderbeast') {
      // Launch Bewilderbeast boss fight
      this._removeSkipButton();
      this._removeHoopCounter();
      this._removeControlsHint();
      this.running = false;
      this.paused = false;
      this.inEpilogue = true;
      this.ui.hideProgressBar();
      if (this.renderer.domElement) {
        this.renderer.domElement.style.display = 'none';
      }
      this.ui.dispose();

      const bossContainer = document.createElement('div');
      bossContainer.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        overflow:hidden;background:#000;z-index:5000;
      `;
      this.container.appendChild(bossContainer);

      this.bossFight = new BewilderbeastBossFight(bossContainer, (success) => {
        bossContainer.remove();
        if (success) {
          this._showVictoryScreen();
        } else {
          // Retry — relaunch boss fight
          this._navigateToChapter('bewilderbeast');
        }
      });
    }
  }

  _createProgressBar() {
    // Re-create progress bar if needed
    if (!this.ui.progressBar) {
      this.ui._createProgressBar();
    }
    this.ui._updateProgressBar(this.currentArea);
  }

  _restartGame() {
    // Full restart by reloading the page
    window.location.reload();
  }

  _goHome() {
    // Navigate back to home page
    window.location.href = '/';
  }

  _begin() {
    this.started = true;
    this.speed = 0;
    this.targetSpeed = 0.012;
    this._buildTrackLookup();
    // Place dragon at track start
    this.dragonPos.copy(this.trackLookup[0].pos);
    this.dragonForward.copy(this.trackLookup[0].tangent).normalize();
    this.dragonSpeed = this.baseSpeed;
    this.ui.showAreaTitle(0);
    this.areaManager.activateArea(0, this.progress);
    this._showSkipButton();
    this._showControlsHint();
    this._createHoopCounter();
  }

  _showControlsHint() {
    const hint = document.createElement('div');
    hint.id = 'controls-hint';
    hint.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      z-index:2400;pointer-events:none;
      font-family:'Cinzel',Georgia,serif;color:rgba(255,234,167,0.55);
      text-align:center;font-size:clamp(0.65rem,1.2vw,0.8rem);
      text-shadow:1px 1px 3px rgba(0,0,0,0.9);
      letter-spacing:0.08em;text-transform:uppercase;
      background:rgba(0,0,0,0.25);padding:8px 18px;border-radius:12px;
      backdrop-filter:blur(4px);
    `;
    hint.innerHTML = `
      <div style="margin-bottom:3px;"><b>A</b>/<b>D</b> Turn &nbsp;·&nbsp; <b>Space</b> Climb &nbsp;·&nbsp; <b>Ctrl</b> Dive</div>
      <div><b>W</b> Speed Up &nbsp;·&nbsp; <b>S</b> Slow Down &nbsp;·&nbsp; <b>Shift</b> Boost</div>
      <div style="margin-top:3px;opacity:0.6;">Fly through the hoops!</div>
    `;
    this.container.appendChild(hint);
    this.controlsHintEl = hint;
  }

  _showSkipButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Skip to Final Game \u25B6';
    btn.style.cssText = `
      position:fixed;bottom:32px;right:32px;z-index:2500;
      font-family:'Georgia',serif;font-size:clamp(0.8rem,1.6vw,1rem);
      padding:10px 24px;border:1px solid rgba(255,255,255,0.3);
      background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.85);
      border-radius:30px;cursor:pointer;backdrop-filter:blur(6px);
      transition:all 0.3s ease;letter-spacing:0.05em;
    `;
    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,68,0,0.45)';
      btn.style.borderColor = 'rgba(255,68,0,0.7)';
      btn.style.color = '#fff';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(0,0,0,0.55)';
      btn.style.borderColor = 'rgba(255,255,255,0.3)';
      btn.style.color = 'rgba(255,255,255,0.85)';
    };
    btn.addEventListener('click', () => {
      this._skipToFinalGame();
    });
    this.container.appendChild(btn);
    this.skipButton = btn;
  }

  _removeSkipButton() {
    if (this.skipButton) {
      this.skipButton.remove();
      this.skipButton = null;
    }
  }

  _skipToFinalGame() {
    this._removeSkipButton();
    this._removeHoopCounter();
    this._removeControlsHint();
    this.inEpilogue = true;
    this.targetSpeed = 0;
    this.speed = 0;
    this.ui.hideProgressBar();
    this._launchSiegeGame();
  }

  _showFinale() {
    if (this.inEpilogue) return;
    this.inEpilogue = true;
    this.targetSpeed = 0;
    this.speed = 0;
    this.dragonSpeed = 0;

    // Remove skip button and hoop counter since we're finishing naturally
    this._removeSkipButton();
    this._removeHoopCounter();
    this._removeControlsHint();

    // Hide progress bar
    this.ui.hideProgressBar();

    // Start dragon fall animation
    this._startDragonFall();
  }

  _startDragonFall() {
    this.dragonFalling = true;
    this.dragonFallTimer = 0;
    if (this.dragonModel) {
      this.dragonFallStartY = this.dragonModel.position.y;
    }

    // Show "hit" flash overlay
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(255,0,0,0.6);z-index:3000;pointer-events:none;
      transition:opacity 0.8s ease;
    `;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 100);
    setTimeout(() => flash.remove(), 900);

    // After 3s fall, show hurt message then launch siege
    setTimeout(() => {
      this._showHurtOverlayAndLaunchSiege();
    }, 3000);
  }

  _showHurtOverlayAndLaunchSiege() {
    // Hurt message overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.85);z-index:4000;
      font-family:'Georgia',serif;color:#ff4400;
      animation:fadeIn 1s ease;
    `;
    overlay.innerHTML = `
      <h1 style="font-size:clamp(2rem,5vw,3.5rem);text-shadow:0 0 30px rgba(255,68,0,0.5);margin-bottom:0.5em;">
        Toothless is hit!
      </h1>
      <p style="font-size:clamp(1rem,2.5vw,1.3rem);color:#ffaa66;font-style:italic;">
        The Red Death struck him down... Fight to save your dragon!
      </p>
    `;
    document.body.appendChild(overlay);

    // After 2.5s, fade out and launch siege game
    setTimeout(() => {
      overlay.style.transition = 'opacity 1s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        this._launchSiegeGame();
      }, 1000);
    }, 2500);
  }

  _launchSiegeGame() {
    // Stop the 3D rendering
    this.running = false;

    // Hide the Three.js canvas
    if (this.renderer.domElement) {
      this.renderer.domElement.style.display = 'none';
    }

    // Hide any UI overlay
    this.ui.dispose();

    // Create siege game container
    const siegeContainer = document.createElement('div');
    siegeContainer.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      overflow:hidden;background:#000;z-index:5000;
    `;
    this.container.appendChild(siegeContainer);

    // Launch the siege game
    this.siegeGame = new SiegeGame(siegeContainer, (success) => {
      // Game finished callback
      siegeContainer.remove();
      if (success) {
        this._showVictoryScreen();
      } else {
        // Retry — relaunch siege
        this._launchSiegeGame();
      }
    });
  }

  _showVictoryScreen() {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(ellipse at center, rgba(10,30,10,0.95), rgba(0,0,0,0.98));
      z-index:6000;font-family:'Georgia',serif;
      animation:fadeIn 2s ease;
    `;
    screen.innerHTML = `
      <h1 style="font-size:clamp(2.5rem,6vw,4rem);color:#44ff88;text-shadow:0 0 40px rgba(68,255,136,0.5);margin-bottom:0.3em;">
        You saved Toothless!
      </h1>
      <p style="font-size:clamp(1rem,3vw,1.5rem);color:rgba(200,255,220,0.8);font-style:italic;letter-spacing:0.1em;margin-bottom:2em;">
        The Night Fury rises again. The bond between dragon and rider is unbreakable.
      </p>
      <button style="
        font-family:'Georgia',serif;font-size:clamp(1rem,2.5vw,1.3rem);
        padding:16px 48px;border:1px solid rgba(68,255,136,0.4);
        background:rgba(68,255,136,0.15);color:#44ff88;
        border-radius:50px;cursor:pointer;
        transition:all 0.3s ease;letter-spacing:0.1em;
      " onmouseover="this.style.background='rgba(68,255,136,0.3)';this.style.boxShadow='0 0 30px rgba(68,255,136,0.3)'"
         onmouseout="this.style.background='rgba(68,255,136,0.15)';this.style.boxShadow='none'"
      >Ride Again</button>
    `;
    document.body.appendChild(screen);
    screen.querySelector('button').addEventListener('click', () => {
      window.location.reload();
    });
  }

  start() {
    this.running = true;
    this._animate();
  }

  _animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.started && !this.paused) {
      // ─── Free flight input & movement ───
      this._updateFlightInput(delta);

      // Virtual progress from nearest track point (for area/atmosphere systems)
      if (this._nearestTrack) {
        this.progress = this._nearestTrack.t;
      }
      if (this.progress >= 0.999) {
        this.progress = 0.999;
      }

      if (!this.inEpilogue) {
        // Convert track progress to area progress (only the area portion)
        const areaProgress = (this.progress / this.areaTrackEnd) * 6;
        const nextAreaBoundary = this.currentArea + 1;

        if (
          areaProgress >= nextAreaBoundary &&
          this.currentArea < 5
        ) {
          this.currentArea++;
          this.ui.showAreaTitle(this.currentArea);
          // Open the gate hoop visually
          this.gateSystem.openGate(this.currentArea - 1);
          this.particleSystem.burstAt(
            this.gateSystem.getGatePosition(this.currentArea - 1),
            "celebration"
          );
        }

        // Trigger epilogue when player reaches end of area 6
        if (
          this.currentArea >= 5 &&
          this.progress >= this.areaTrackEnd * 0.98 &&
          !this.epilogueTriggered
        ) {
          this.epilogueTriggered = true;
          this._showFinale();
        }
      }

      // Check hoop pass-throughs
      this._checkHoopCollisions();
    }

    // Update camera — follow dragon with its forward direction
    const dragonWorldPos = (this.dragonModel && this.dragonReady) ? this.dragonModel.position : null;
    this.cameraController.update(this.progress, delta, dragonWorldPos, this.dragonForward);

    // Update dragon position on track (or fall animation)
    if (this.dragonFalling) {
      this._updateDragonFall(delta, elapsed);
    } else {
      this._updateDragon(this.progress, delta, elapsed);
    }

    if (!this.inEpilogue) {
      // Convert progress to area-space for AreaManager
      const areaProgress = Math.min(this.progress / this.areaTrackEnd, 1);
      this.areaManager.update(elapsed, delta, areaProgress);
      this.particleSystem.update(delta, elapsed);
      // Feed dragon position to trail
      if (this.dragonModel) {
        this.particleSystem.updateTrail(this.dragonModel.position);
      }
      this.gateSystem.update(elapsed, delta);
      this.trackBuilder.updateHoops(elapsed);
      this._updateAtmosphere();
    } else {
      // Epilogue mode — update epilogue sequence
      this.epilogue.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  _updateAreaSpeed() {
    const speeds = [0.012, 0.013, 0.014, 0.011, 0.013, 0.010];
    const areaProgress = Math.min(this.progress / this.areaTrackEnd, 0.999);
    const areaIndex = Math.min(Math.floor(areaProgress * 6), 5);
    this.targetSpeed = speeds[areaIndex];
  }

  _updateFlightInput(delta) {
    const k = this.keys;

    // ─── Yaw: A/D or Arrow Left/Right ───
    let yawInput = 0;
    if (k['KeyA'] || k['ArrowLeft'])  yawInput += 1;  // turn left
    if (k['KeyD'] || k['ArrowRight']) yawInput -= 1;  // turn right

    // ─── Pitch: Space = climb, Ctrl = dive ───
    let pitchInput = 0;
    if (k['Space'])                                pitchInput += 1;
    if (k['ControlLeft'] || k['ControlRight'])     pitchInput -= 1;

    // ─── Speed: W = faster, S = slower ───
    let speedInput = 0;
    if (k['KeyW'] || k['ArrowUp'])    speedInput += 1;
    if (k['KeyS'] || k['ArrowDown'])  speedInput -= 1;

    // ─── Boost ───
    const wasBoost = this.boostActive;
    this.boostActive = !!(k['ShiftLeft'] || k['ShiftRight']);
    const boostMult = this.boostActive ? 1.8 : 1.0;

    // ─── Smooth yaw rate ───
    const targetYaw = yawInput * this.maxYawSpeed;
    this.yawRate += (targetYaw - this.yawRate) * this.yawAccel * delta;

    // ─── Smooth pitch rate ───
    const targetPitchRate = pitchInput * this.maxPitchSpeed;
    this.pitchRate += (targetPitchRate - this.pitchRate) * this.pitchAccel * delta;

    // ─── Apply yaw (rotate around Y axis) ───
    if (Math.abs(this.yawRate) > 0.001) {
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), this.yawRate * delta
      );
      this.dragonForward.applyQuaternion(yawQuat).normalize();
    }

    // ─── Apply pitch (rotate around local right axis) ───
    if (Math.abs(this.pitchRate) > 0.001) {
      const right = new THREE.Vector3()
        .crossVectors(this.dragonForward, new THREE.Vector3(0, 1, 0))
        .normalize();
      if (right.lengthSq() > 0.001) {
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, this.pitchRate * delta);
        this.dragonForward.applyQuaternion(pitchQuat).normalize();
      }
    }

    // ─── Clamp pitch angle (prevent flying straight up/down) ───
    const maxPitchAngle = 0.6; // ~34 degrees
    if (this.dragonForward.y > maxPitchAngle) {
      this.dragonForward.y = maxPitchAngle;
      this.dragonForward.normalize();
    }
    if (this.dragonForward.y < -maxPitchAngle) {
      this.dragonForward.y = -maxPitchAngle;
      this.dragonForward.normalize();
    }

    // ─── Speed ───
    const targetSpeed = this.baseSpeed * (1.0 + speedInput * 0.5) * boostMult;
    this.dragonSpeed += (targetSpeed - this.dragonSpeed) * 3.0 * delta;

    // ─── Corner / turn assist at sharp bends only ───
    this._applyCornerAssist(delta);

    // ─── Move dragon ───
    this.dragonPos.addScaledVector(this.dragonForward, this.dragonSpeed * delta);

    // ─── Soft boundary: pull toward track if straying too far ───
    const nearest = this._findNearestTrackPoint(this.dragonPos);
    this._nearestTrack = nearest;
    const distToTrack = this.dragonPos.distanceTo(nearest.pos);
    const maxWander = 60;
    if (distToTrack > maxWander) {
      const pullDir = new THREE.Vector3().subVectors(nearest.pos, this.dragonPos).normalize();
      const pullStrength = (distToTrack - maxWander) * 0.5 * delta;
      this.dragonPos.addScaledVector(pullDir, pullStrength);
      this.dragonForward.lerp(pullDir, 0.02).normalize();
    }

    // Minimum altitude
    if (this.dragonPos.y < 2) this.dragonPos.y = 2;

    // ─── Visual bank & pitch ───
    const targetBank = yawInput;
    const targetVisualPitch = -pitchInput * 0.5;
    this.playerBank += (targetBank - this.playerBank) * 3 * delta;
    this.playerPitch += (targetVisualPitch - this.playerPitch) * 3 * delta;

    // ─── Boost camera effects ───
    if (this.boostActive) {
      this.cameraController.setShake(2);
    } else if (wasBoost && !this.boostActive) {
      this.cameraController.setShake(0);
    }
  }

  _updateAtmosphere() {
    const areaProgress = Math.min(this.progress / this.areaTrackEnd, 0.999);
    const areaIndex = Math.min(Math.floor(areaProgress * 6), 5);
    const atmospheres = [
      { bg: 0x88bbdd, fog: 0x99ccee, fogDensity: 0.003, exposure: 1.3, hemiSky: 0x8cb8e0, hemiGnd: 0x665544 },
      { bg: 0x1e3a2c, fog: 0x15302a, fogDensity: 0.005, exposure: 1.0, hemiSky: 0x446655, hemiGnd: 0x222211 },
      { bg: 0x8b7355, fog: 0x9a8365, fogDensity: 0.003, exposure: 1.25, hemiSky: 0xaa9970, hemiGnd: 0x554422 },
      { bg: 0xaaddff, fog: 0xbbddff, fogDensity: 0.0015, exposure: 1.5, hemiSky: 0xccddff, hemiGnd: 0x667788 },
      { bg: 0x1a0a00, fog: 0x2a1500, fogDensity: 0.006, exposure: 0.9, hemiSky: 0x331800, hemiGnd: 0x110800 },
      { bg: 0x110000, fog: 0x1a0505, fogDensity: 0.005, exposure: 0.75, hemiSky: 0x220505, hemiGnd: 0x0a0000 },
    ];

    const atm = atmospheres[areaIndex];

    // Smooth transition for colours and density
    const target = new THREE.Color(atm.bg);
    this.scene.background.lerp(target, 0.02);
    this.scene.fog.color.lerp(new THREE.Color(atm.fog), 0.02);
    this.scene.fog.density += (atm.fogDensity - this.scene.fog.density) * 0.02;

    // Smooth tone-mapping exposure
    this.renderer.toneMappingExposure += (atm.exposure - this.renderer.toneMappingExposure) * 0.02;

    // Update hemisphere light colours per area
    if (this.hemiLight) {
      this.hemiLight.color.lerp(new THREE.Color(atm.hemiSky), 0.02);
      this.hemiLight.groundColor.lerp(new THREE.Color(atm.hemiGnd), 0.02);
    }
  }

  // ─── Track lookup for nearest-point queries ───

  _buildTrackLookup() {
    const samples = 300;
    this.trackLookup = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pos = this.track.getPointAt(t);
      const tangent = this.track.getTangentAt(t);
      this.trackLookup.push({ t, pos, tangent });
    }
    // Pre-compute curvature at each sample
    for (let i = 1; i < this.trackLookup.length - 1; i++) {
      const prev = this.trackLookup[i - 1].tangent;
      const next = this.trackLookup[i + 1].tangent;
      const cross = new THREE.Vector3().crossVectors(prev, next);
      this.trackLookup[i].curvature = cross.length();
    }
    this.trackLookup[0].curvature = 0;
    this.trackLookup[this.trackLookup.length - 1].curvature = 0;
  }

  _findNearestTrackPoint(pos) {
    let minDist = Infinity;
    let nearest = this.trackLookup[0];
    for (const sample of this.trackLookup) {
      const d = pos.distanceToSquared(sample.pos);
      if (d < minDist) {
        minDist = d;
        nearest = sample;
      }
    }
    return nearest;
  }

  _applyCornerAssist(delta) {
    const nearest = this._findNearestTrackPoint(this.dragonPos);
    if (!nearest || nearest.curvature === undefined) return;

    // Only assist at high-curvature points (sharp turns)
    const curvatureThreshold = 0.04;
    if (nearest.curvature > curvatureThreshold) {
      const dist = this.dragonPos.distanceTo(nearest.pos);
      if (dist < 50) {
        // Blend forward direction toward track tangent at sharp bends
        const strength = nearest.curvature * 3.0 * Math.max(0, 1 - dist / 50);
        this.dragonForward.lerp(nearest.tangent, Math.min(strength * delta, 0.15));
        this.dragonForward.normalize();
      }
    }
  }

  // ─── Hoop pass-through detection ───

  _checkHoopCollisions() {
    if (!this.dragonPos) return;
    const hoops = this.trackBuilder.hoops;
    for (let i = 0; i < hoops.length; i++) {
      if (this.hoopsCollected.has(i)) continue;
      const hoop = hoops[i];
      
      // Get hoop's forward normal (the direction it's facing)
      const hoopNormal = new THREE.Vector3(0, 0, 1);
      hoopNormal.applyQuaternion(hoop.quaternion).normalize();
      
      // Vector from hoop center to dragon
      const toDragon = new THREE.Vector3().subVectors(this.dragonPos, hoop.position);
      
      // Distance along the hoop's forward axis (perpendicular distance to plane)
      const perpDist = toDragon.dot(hoopNormal);
      
      // Only check if dragon is close to the plane (within 3 units on either side)
      if (Math.abs(perpDist) > 3) continue;
      
      // Project dragon position onto the hoop's plane
      const projected = this.dragonPos.clone().addScaledVector(hoopNormal, -perpDist);
      
      // Distance from hoop center on the plane (radial distance)
      const radialDist = projected.distanceTo(hoop.position);
      
      // Check if within the ring (radius ~7, allow some tolerance)
      const ringRadius = 7;
      const tolerance = 2; // Allow some margin
      if (radialDist < ringRadius + tolerance) {
        // Dragon is aligned with and inside the hoop ring
        this.hoopsCollected.add(i);
        this.hoopScore++;
        this._onHoopCollected(hoop);
      }
    }
  }

  _onHoopCollected(hoop) {
    // Visual feedback — particle burst
    this.particleSystem.burstAt(hoop.position.clone(), 'celebration');
    // Flash the hoop ring bright
    const data = hoop.userData;
    if (data.ring) {
      data.ring.material.emissiveIntensity = 2.5;
      setTimeout(() => {
        if (data.ring && data.ring.material) data.ring.material.emissiveIntensity = 0.7;
      }, 400);
    }
    // Update the HUD counter
    this._updateHoopCounter();
  }

  // ─── Hoop counter HUD ───

  _createHoopCounter() {
    const el = document.createElement('div');
    el.id = 'hoop-counter';
    el.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      z-index:2400;pointer-events:none;
      font-family:'Cinzel',Georgia,serif;color:#ffeaa7;
      font-size:clamp(1.2rem,3vw,1.8rem);
      text-shadow:0 0 10px rgba(255,140,0,0.7),1px 1px 3px rgba(0,0,0,0.9);
      letter-spacing:0.1em;text-transform:uppercase;
      transition:transform 0.3s ease, color 0.3s ease;
    `;
    const total = this.trackBuilder.hoops.length;
    el.textContent = 'HOOPS: 0 / ' + total;
    this.container.appendChild(el);
    this.hoopCounterEl = el;
  }

  _updateHoopCounter() {
    if (!this.hoopCounterEl) return;
    const total = this.trackBuilder.hoops.length;
    this.hoopCounterEl.textContent = 'HOOPS: ' + this.hoopScore + ' / ' + total;
    // Flash animation
    this.hoopCounterEl.style.transform = 'translateX(-50%) scale(1.3)';
    this.hoopCounterEl.style.color = '#ff6600';
    setTimeout(() => {
      if (this.hoopCounterEl) {
        this.hoopCounterEl.style.transform = 'translateX(-50%) scale(1)';
        this.hoopCounterEl.style.color = '#ffeaa7';
      }
    }, 350);
  }

  _removeHoopCounter() {
    if (this.hoopCounterEl) {
      this.hoopCounterEl.remove();
      this.hoopCounterEl = null;
    }
  }

  _removeControlsHint() {
    if (this.controlsHintEl) {
      this.controlsHintEl.remove();
      this.controlsHintEl = null;
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.running = false;
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    this._removeSkipButton();
    this._removeHoopCounter();
    this._removeControlsHint();
    if (this.epilogue) this.epilogue.dispose();
    if (this.dragonModel) {
      this.scene.remove(this.dragonModel);
    }
    if (this.siegeGame && this.siegeGame.dispose) {
      this.siegeGame.dispose();
    }
    if (this.bossFight && this.bossFight.dispose) {
      this.bossFight.dispose();
    }
    this.renderer.dispose();
    this.ui.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  async _loadDragonModel() {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/toothless_httyd.glb');
      this.dragonModel = gltf.scene;

      // Auto-scale based on bounding box
      const box = new THREE.Box3().setFromObject(this.dragonModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 6;
      const scaleFactor = targetSize / maxDim;
      this.dragonModel.scale.setScalar(scaleFactor);

      // Enable shadows on all meshes
      this.dragonModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(this.dragonModel);
      this.dragonReady = true;

      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        this.dragonMixer = new THREE.AnimationMixer(this.dragonModel);
        gltf.animations.forEach((clip) => {
          this.dragonMixer.clipAction(clip).play();
        });
      }
    } catch (err) {
      console.warn('Could not load dragon GLB, using fallback:', err);
      this._createFallbackDragon();
    }
  }

  _createFallbackDragon() {
    const group = new THREE.Group();

    // Body — dark obsidian-like
    const bodyGeo = new THREE.CapsuleGeometry(1, 3, 12, 20);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0c, roughness: 0.6, metalness: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(-3, 2, -6, 1);
    wingShape.quadraticCurveTo(-4, -1, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x151515, side: THREE.DoubleSide, roughness: 0.75, metalness: 0.05,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, 0.5, -1);
    leftWing.rotation.y = -Math.PI / 2;
    leftWing.castShadow = true;
    group.add(leftWing);
    const rightWing = leftWing.clone();
    rightWing.position.set(0, 0.5, 1);
    rightWing.rotation.y = Math.PI / 2;
    rightWing.scale.x = -1;
    group.add(rightWing);

    // Head
    const headGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(2.5, 0, 0);
    head.castShadow = true;
    group.add(head);

    // Eyes (green like Toothless)
    const eyeGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(2.9, 0.2, -0.35);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(2.9, 0.2, 0.35);
    group.add(rightEye);

    this.dragonModel = group;
    this.scene.add(this.dragonModel);
    this.dragonReady = true;
  }

  _updateDragon(progress, delta, elapsed) {
    if (!this.dragonReady || !this.dragonModel) return;

    // Position from free-flight dragonPos + bobbing
    const bob = Math.sin(elapsed * 2.5) * 0.4;
    this.dragonModel.position.set(
      this.dragonPos.x,
      this.dragonPos.y + bob,
      this.dragonPos.z
    );

    // Orient dragon along its forward direction
    const worldUp = new THREE.Vector3(0, 1, 0);
    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(), this.dragonForward, worldUp);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);
    this.dragonModel.quaternion.slerp(targetQuat, 0.12);

    // Banking from turning
    this.dragonModel.rotation.z += -this.playerBank * 0.6;
    // Pitch from climbing/diving
    this.dragonModel.rotation.x += this.playerPitch * 0.15;

    // Update animation mixer if available
    if (this.dragonMixer) {
      this.dragonMixer.update(delta);
    }
  }

  _updateDragonFall(delta, elapsed) {
    if (!this.dragonReady || !this.dragonModel) return;

    this.dragonFallTimer += delta;

    // Tilt the dragon nose-down and spin slightly
    this.dragonModel.rotation.x += delta * 1.5;
    this.dragonModel.rotation.z += delta * 0.8;

    // Fall with acceleration (gravity-like)
    const gravity = 15;
    const fallDist = 0.5 * gravity * this.dragonFallTimer * this.dragonFallTimer;
    this.dragonModel.position.y = this.dragonFallStartY - fallDist;

    // Add some forward drift
    this.dragonModel.position.z -= delta * 5;

    // Smoke trail particles
    if (Math.random() < 0.3) {
      this.particleSystem.burstAt(this.dragonModel.position.clone(), 'celebration');
    }

    // Camera follows the falling dragon
    this.camera.position.lerp(
      new THREE.Vector3(
        this.dragonModel.position.x + 8,
        this.dragonModel.position.y + 5,
        this.dragonModel.position.z + 15
      ),
      0.03
    );
    this.camera.lookAt(this.dragonModel.position);

    if (this.dragonMixer) {
      this.dragonMixer.update(delta);
    }
  }
}
