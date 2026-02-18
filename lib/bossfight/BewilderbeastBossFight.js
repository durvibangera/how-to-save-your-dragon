/**
 * BewilderbeastBossFight — 3D POV Boss Fight
 *
 * Toothless vs The Bewilderbeast — an epic multi-phase aerial boss fight.
 * Stormfly & Astrid can be summoned as allies when the Focus bar fills.
 *
 * Controls (Pointer-Lock):
 *   Mouse        — Aim / look
 *   Left Click   — Purple plasma blast (auto-fire while held)
 *   Right Click / E — Charged plasma blast (big damage, cooldown)
 *   W/A/S/D      — Fly forward / strafe left / fly backward / strafe right
 *   Space        — Ascend
 *   Ctrl         — Descend
 *   Shift        — Barrel-roll dodge (i-frames)
 *   Q            — Summon allies (when Focus bar is full)
 *
 * Boss has 4 escalating phases with 12+ unique attack patterns.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ────────────────────────────────────────────────
//  CONSTANTS
// ────────────────────────────────────────────────

const ARENA_RADIUS = 200;
const PLAYER_SPEED = 55;
const PLAYER_MAX_HP = 100;
const BOSS_MAX_HP = 3000;

const PLASMA_SPEED = 180;
const PLASMA_DAMAGE = 12;
const CHARGED_PLASMA_DAMAGE = 42;
const FIRE_COOLDOWN = 0.22;
const CHARGED_COOLDOWN = 1.6;

const DODGE_COOLDOWN = 2.0;
const DODGE_DURATION = 0.45;
const DODGE_SPEED = 140;

const FOCUS_MAX = 100;
const FOCUS_PER_HIT = 3;
const FOCUS_PER_DODGE = 10;
const FOCUS_PER_SECOND = 1.2;
const ALLY_DURATION = 15;

const MOUSE_SENS = 0.002;

const PHASE_NAMES = [
  "The Tyrant Awakens",
  "Alpha's Fury",
  "Desperate Rage",
  "Final Stand",
];

// ────────────────────────────────────────────────
//  MAIN CLASS
// ────────────────────────────────────────────────

export class BewilderbeastBossFight {
  /* ─── Constructor ─── */
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.disposed = false;
    this.animFrameId = null;

    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Models & mixers
    this.toothlessModel = null;
    this.bewilderbeastModel = null;
    this.stormflyModel = null;
    this.mixers = [];

    // ── Player state ──
    this.player = {
      position: new THREE.Vector3(0, 45, 80),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      targetRoll: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      focus: 0,
      fireCooldown: 0,
      chargeCooldown: 0,
      isDodging: false,
      dodgeCooldown: 0,
      dodgeTimer: 0,
      dodgeDir: new THREE.Vector3(),
      invincible: false,
      invTimer: 0,
      combo: 0,
      comboTimer: 0,
      dmgMul: 1,
      model: null,
      light: null,
    };

    // ── Boss state ──
    this.boss = {
      hp: BOSS_MAX_HP,
      maxHp: BOSS_MAX_HP,
      phase: 1,
      transitioning: false,
      transTimer: 0,
      position: new THREE.Vector3(0, 50, -130),
      headPos: new THREE.Vector3(0, 120, -85),
      rot: 0,
      atkState: "idle",
      atkTimer: 3.5,
      curAtk: null,
      atkProg: 0,
      atkData: {},
      lastAtk: null,
      stunned: false,
      stunTimer: 0,
      enraged: false,
      model: null,
      light: null,
    };

    // ── Allies ──
    this.allies = {
      active: false,
      timer: 0,
      atkCD: 0,
      model: null,
    };

    // ── Combat ──
    this.pProj = []; // player projectiles
    this.bProj = []; // boss projectiles
    this.minions = [];

    // ── Environment refs ──
    this.ocean = null;
    this.envGroup = new THREE.Group();
    this.snowPts = null;

    // ── Particles (GPU buffer) ──
    this.particles = [];
    this.pGeo = null;
    this.pMat = null;
    this.pMesh = null;

    // ── Effects ──
    this.shakeAmt = 0;

    // ── UI refs ──
    this.ui = {};

    // ── Input ──
    this.keys = {};
    this.mx = 0;
    this.my = 0;
    this.mb = { l: false, r: false };
    this.ptrLocked = false;

    // ── State ──
    this.state = "loading";
    this.gTime = 0;
    this.introT = 0;
    this._defeatShown = false;
    this._handlers = {};

    this._boot();
  }

  // ════════════════════════════════════════════════
  //  INITIALISATION
  // ════════════════════════════════════════════════

  async _boot() {
    try {
      this._initRenderer();
      this._initScene();
      this._initLights();
      this._initEnvironment();
      this._initParticleSystem();
      this._buildUI();
      this._bindInput();
      await this._loadModels();
      if (this.disposed) return;
      this.state = "intro";
      this._startLoop();
    } catch (e) {
      console.error("BossFight init error:", e);
    }
  }

  /* ─── Renderer ─── */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 2000);
    this.camera.position.set(0, 40, 100);
  }

  /* ─── Scene ─── */
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1228);
    this.scene.fog = new THREE.FogExp2(0x0e1830, 0.0006);
  }

  /* ─── Lights ─── */
  _initLights() {
    // Strong ambient so nothing is pitch black
    this.scene.add(new THREE.AmbientLight(0x6688aa, 1.6));

    // Main directional (sun / moon)
    const dir = new THREE.DirectionalLight(0xbbccee, 2.2);
    dir.position.set(60, 140, 40);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const s = 300;
    dir.shadow.camera.left = -s;
    dir.shadow.camera.right = s;
    dir.shadow.camera.top = s;
    dir.shadow.camera.bottom = -s;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 800;
    this.scene.add(dir);

    // Second directional (fill from the opposite side)
    const fill = new THREE.DirectionalLight(0x6688bb, 1.2);
    fill.position.set(-80, 80, -60);
    this.scene.add(fill);

    // Strong hemisphere for sky/ground bounce
    this.scene.add(new THREE.HemisphereLight(0x6688cc, 0x223344, 1.4));

    // Boss glow — very bright & wide
    this.boss.light = new THREE.PointLight(0x88ccff, 12, 280);
    this.boss.light.position.copy(this.boss.headPos);
    this.scene.add(this.boss.light);

    // Extra boss rim light from behind (silhouette pop)
    this.bossRimLight = new THREE.SpotLight(0x66aaff, 8, 300, Math.PI / 3, 0.5);
    this.bossRimLight.position.set(0, 100, -200);
    this.bossRimLight.target.position.copy(this.boss.position);
    this.scene.add(this.bossRimLight);
    this.scene.add(this.bossRimLight.target);

    // Player glow (purple)
    this.player.light = new THREE.PointLight(0x9944ff, 5, 90);
    this.player.light.position.copy(this.player.position);
    this.scene.add(this.player.light);
  }

  /* ─── Environment ─── */
  _initEnvironment() {
    // Ocean — opaque, lowered to prevent intersection with boss
    const oGeo = new THREE.PlaneGeometry(2400, 2400, 64, 64);
    const oMat = new THREE.MeshPhongMaterial({
      color: 0x0e3860,
      specular: 0x334466,
      shininess: 120,
      emissive: 0x081830,
      transparent: false,
      side: THREE.FrontSide,
    });
    this.ocean = new THREE.Mesh(oGeo, oMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -18;
    this.ocean.receiveShadow = true;
    this.ocean.renderOrder = -1;
    this.scene.add(this.ocean);

    // Underwater dark plane below ocean to hide anything beneath
    const uwGeo = new THREE.PlaneGeometry(2600, 2600);
    const uwMat = new THREE.MeshBasicMaterial({ color: 0x040e1a, side: THREE.FrontSide });
    const uwPlane = new THREE.Mesh(uwGeo, uwMat);
    uwPlane.rotation.x = -Math.PI / 2;
    uwPlane.position.y = -19;
    uwPlane.renderOrder = -2;
    this.scene.add(uwPlane);

    // Icebergs
    const iceMat = new THREE.MeshPhongMaterial({
      color: 0xaaddee,
      emissive: 0x334466,
      specular: 0xffffff,
      shininess: 80,
      transparent: false,
    });

    const bergs = [
      [-90, -50, 16, 32],
      [85, -70, 13, 27],
      [-130, -100, 22, 44],
      [140, -110, 19, 38],
      [-65, 35, 11, 22],
      [95, 25, 14, 30],
      [-160, -25, 24, 48],
      [165, -55, 17, 34],
      [0, -180, 32, 55],
      [-45, -155, 15, 28],
      [55, -165, 17, 32],
      [-110, 60, 12, 24],
      [120, 70, 14, 28],
    ];

    bergs.forEach(([x, z, r, h]) => {
      const g = new THREE.ConeGeometry(r, h, 5 + (Math.random() * 3) | 0);
      g.translate(0, h / 2 - 6, 0);
      const m = new THREE.Mesh(g, iceMat.clone());
      m.position.set(x, -18, z);
      m.rotation.y = Math.random() * Math.PI * 2;
      m.castShadow = true;
      m.receiveShadow = true;
      this.envGroup.add(m);

      if (Math.random() > 0.45) {
        const sg = new THREE.ConeGeometry(r * 0.35, h * 0.45, 4);
        sg.translate(0, h * 0.22, 0);
        const sm = new THREE.Mesh(sg, iceMat.clone());
        sm.position.set(x + r * 0.55, -18, z + r * 0.3);
        sm.castShadow = true;
        this.envGroup.add(sm);
      }
    });

    this.scene.add(this.envGroup);

    // Boss Ice Platform — large jagged ice formation the Bewilderbeast stands on
    const platMat = new THREE.MeshPhongMaterial({
      color: 0x99ccee,
      emissive: 0x445566,
      specular: 0xffffff,
      shininess: 60,
      transparent: false,
    });
    // Main slab — tall enough to bridge ocean to boss feet, lowered
    const platGeo = new THREE.CylinderGeometry(50, 60, 70, 10);
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(0, 0, -130);
    plat.castShadow = true;
    plat.receiveShadow = true;
    this.scene.add(plat);
    // Spiky pillars around it (lowered to match)
    const spikeMat = platMat.clone();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 42 + Math.random() * 20;
      const h = 22 + Math.random() * 32;
      const sg = new THREE.ConeGeometry(5 + Math.random() * 6, h, 5);
      const sp = new THREE.Mesh(sg, spikeMat);
      sp.position.set(Math.cos(a) * r, h / 2 - 20, -130 + Math.sin(a) * r);
      sp.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
      sp.castShadow = true;
      this.scene.add(sp);
    }

    // Snowfall
    const sCount = 3500;
    const sPos = new Float32Array(sCount * 3);
    for (let i = 0; i < sCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 500;
      sPos[i * 3 + 1] = Math.random() * 160;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.Float32BufferAttribute(sPos, 3));
    const sMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.snowPts = new THREE.Points(sGeo, sMat);
    this.scene.add(this.snowPts);

    // Aurora (two translucent planes)
    const aGeo = new THREE.PlaneGeometry(500, 70, 24, 5);
    const a1 = new THREE.Mesh(
      aGeo,
      new THREE.MeshBasicMaterial({
        color: 0x22ffaa,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    a1.position.set(0, 135, -250);
    a1.rotation.x = -0.3;
    this.scene.add(a1);

    const a2 = new THREE.Mesh(
      aGeo.clone(),
      new THREE.MeshBasicMaterial({
        color: 0x6644ff,
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    a2.position.set(-60, 145, -220);
    a2.rotation.set(-0.2, 0.3, 0);
    this.scene.add(a2);
  }

  /* ─── Particle GPU buffer ─── */
  _initParticleSystem() {
    const MAX = 2500;
    const pos = new Float32Array(MAX * 3);
    const col = new Float32Array(MAX * 3);
    const sz = new Float32Array(MAX);
    this.pGeo = new THREE.BufferGeometry();
    this.pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.pGeo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.pGeo.setAttribute("size", new THREE.Float32BufferAttribute(sz, 1));
    this.pMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.pMesh = new THREE.Points(this.pGeo, this.pMat);
    this.scene.add(this.pMesh);
  }

  // ════════════════════════════════════════════════
  //  MODEL LOADING
  // ════════════════════════════════════════════════

  async _loadModels() {
    const loader = new GLTFLoader();
    const load = (url) =>
      new Promise((res, rej) => loader.load(url, res, undefined, rej));

    this._loadProg(0);

    const [tG, bG, sG] = await Promise.all([
      load("/toothless_httyd.glb").catch(() => null),
      load("/httyd_bewilderbeast_model.glb").catch(() => null),
      load("/stormfly_and_astrid_how_to_train_your_dragon.glb").catch(() => null),
    ]);

    this._loadProg(75);

    // Toothless
    if (tG) {
      this.toothlessModel = tG.scene;
      this._normalise(this.toothlessModel, 14);
      this.toothlessModel.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true; c.receiveShadow = true;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => {
            if (m && m.emissive) {
              m.emissive.set(0x221144);
              m.emissiveIntensity = 0.35;
            }
          });
        }
      });
      this.player.model = new THREE.Group();
      this.player.model.add(this.toothlessModel);
      this.player.model.position.copy(this.player.position);
      this.scene.add(this.player.model);
      this._initMixer(tG);
    } else {
      this._fallbackToothless();
    }

    // Bewilderbeast
    if (bG) {
      this.bewilderbeastModel = bG.scene;
      this._normalise(this.bewilderbeastModel, 110);
      this.bewilderbeastModel.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true; c.receiveShadow = true;
          c.frustumCulled = false; // prevent head/extremities from being culled
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => {
            if (m) {
              m.side = THREE.DoubleSide; // prevent seeing inside the model
              m.transparent = false;
              m.depthWrite = true;
              m.clipShadows = false;
              if (m.emissive) {
                m.emissive.set(0x335577);
                m.emissiveIntensity = 0.6;
              }
            }
          });
        }
      });
      this.boss.model = new THREE.Group();
      this.boss.model.add(this.bewilderbeastModel);
      this.boss.model.position.copy(this.boss.position);
      this.scene.add(this.boss.model);
      this._initMixer(bG);
    } else {
      this._fallbackBewilderbeast();
    }

    // Stormfly & Astrid
    if (sG) {
      this.stormflyModel = sG.scene;
      this._normalise(this.stormflyModel, 7);
      this.stormflyModel.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => {
            if (m && m.emissive) {
              m.emissive.set(0x224455);
              m.emissiveIntensity = 0.4;
            }
          });
        }
      });
      this.allies.model = new THREE.Group();
      this.allies.model.add(this.stormflyModel);
      this.allies.model.visible = false;
      this.allies.model.position.set(-60, 45, 120);
      this.scene.add(this.allies.model);
      this._initMixer(sG);
    } else {
      this._fallbackStormfly();
    }

    this._loadProg(100);
  }

  _normalise(obj, targetSize) {
    const box = new THREE.Box3().setFromObject(obj);
    const sz = box.getSize(new THREE.Vector3());
    const s = targetSize / Math.max(sz.x, sz.y, sz.z);
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c.multiplyScalar(s));
  }

  _initMixer(gltf) {
    if (gltf.animations && gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      this.mixers.push(mixer);
    }
  }

  /* ── Fallback geometry when GLB unavailable ── */
  _fallbackToothless() {
    const g = new THREE.Group();
    const bm = new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0x060610 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3, 8, 16), bm);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), bm);
    head.position.z = -2.5;
    g.add(head);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const wGeo = new THREE.PlaneGeometry(4, 2);
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.position.set(s * 3, 0.5, 0);
      w.rotation.z = -s * 0.3;
      g.add(w);
    });
    const eMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    [-0.5, 0.5].forEach((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eMat);
      e.position.set(s, 0.4, -3.3);
      g.add(e);
    });
    this.player.model = g;
    this.player.model.position.copy(this.player.position);
    this.scene.add(g);
  }

  _fallbackBewilderbeast() {
    const g = new THREE.Group();
    const bm = new THREE.MeshPhongMaterial({
      color: 0x667788,
      emissive: 0x112233,
      specular: 0x334455,
      shininess: 30,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(35, 14, 14), bm);
    body.scale.set(1.5, 1, 1.5);
    body.position.y = -10;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(18, 14, 14), bm);
    head.scale.set(1, 0.8, 1.2);
    head.position.set(0, 22, 32);
    g.add(head);
    const tMat = new THREE.MeshPhongMaterial({ color: 0xccddee, emissive: 0x334455 });
    const tGeo = new THREE.ConeGeometry(4, 32, 8);
    [[-12, 0.3], [12, -0.3]].forEach(([x, rz]) => {
      const t = new THREE.Mesh(tGeo, tMat);
      t.position.set(x, 12, 42);
      t.rotation.set(-0.5, 0, rz);
      g.add(t);
    });
    const eMat = new THREE.MeshBasicMaterial({ color: 0x66aaff });
    [-8, 8].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), eMat);
      e.position.set(x, 28, 40);
      g.add(e);
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      const s = new THREE.Mesh(new THREE.ConeGeometry(3, 16, 6), tMat);
      s.position.set(Math.cos(a) * 14, 32 + Math.sin(a) * 5, 22);
      s.rotation.x = -0.3;
      g.add(s);
    }
    this.boss.model = g;
    this.boss.model.position.copy(this.boss.position);
    this.scene.add(g);
  }

  _fallbackStormfly() {
    const g = new THREE.Group();
    const bm = new THREE.MeshPhongMaterial({ color: 0x3388cc, emissive: 0x112244 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 2.5, 6, 12), bm);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x44aadd, side: THREE.DoubleSide });
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.5), wMat);
      w.position.set(s * 2.5, 0.3, 0);
      g.add(w);
    });
    const rider = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1, 4, 8),
      new THREE.MeshPhongMaterial({ color: 0xcc8844 })
    );
    rider.position.y = 1.5;
    g.add(rider);
    this.allies.model = g;
    g.visible = false;
    g.position.set(-60, 45, 120);
    this.scene.add(g);
  }

  // ════════════════════════════════════════════════
  //  INPUT
  // ════════════════════════════════════════════════

  _bindInput() {
    const kd = (e) => {
      this.keys[e.code] = true;
      if (["Space", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight",
           "KeyQ", "KeyE", "KeyR"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => { this.keys[e.code] = false; };
    const mm = (e) => {
      if (this.ptrLocked) { this.mx += e.movementX; this.my += e.movementY; }
    };
    const md = (e) => {
      if (e.button === 0) this.mb.l = true;
      if (e.button === 2) this.mb.r = true;
      if (!this.ptrLocked && this.state !== "loading")
        this.renderer.domElement.requestPointerLock();
    };
    const mu = (e) => {
      if (e.button === 0) this.mb.l = false;
      if (e.button === 2) this.mb.r = false;
    };
    const plc = () => {
      this.ptrLocked = document.pointerLockElement === this.renderer.domElement;
    };
    const cm = (e) => e.preventDefault();
    const rs = () => {
      const w = this.container.clientWidth,
        h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    document.addEventListener("keydown", kd);
    document.addEventListener("keyup", ku);
    document.addEventListener("mousemove", mm);
    document.addEventListener("mousedown", md);
    document.addEventListener("mouseup", mu);
    document.addEventListener("pointerlockchange", plc);
    this.renderer.domElement.addEventListener("contextmenu", cm);
    window.addEventListener("resize", rs);

    this._handlers = { kd, ku, mm, md, mu, plc, cm, rs };
  }

  // ════════════════════════════════════════════════
  //  UI OVERLAY (all HTML)
  // ════════════════════════════════════════════════

  _buildUI() {
    // Import Cinzel + Crimson Pro to match app theme
    if (!document.getElementById('bf-fonts')) {
      const link = document.createElement('link');
      link.id = 'bf-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:wght@400;600&display=swap';
      document.head.appendChild(link);
    }

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;" +
      "font-family:'Crimson Pro',Georgia,'Times New Roman',serif;";
    this.container.appendChild(ov);
    this.ui.ov = ov;

    /* loading */
    const ld = document.createElement("div");
    ld.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;" +
      "background:radial-gradient(ellipse at center,rgba(30,15,0,0.92),rgba(0,0,0,0.97));" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;transition:opacity 1s;";
    ld.innerHTML = `
      <h1 style="font-family:'Cinzel',serif;color:#ffeaa7;font-size:clamp(2rem,5vw,3rem);font-weight:900;margin-bottom:18px;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.5);letter-spacing:0.05em;text-transform:uppercase;">BOSS FIGHT</h1>
      <p style="font-family:'Crimson Pro',Georgia,serif;color:#f5f5f5;font-size:clamp(1rem,2.5vw,1.3rem);margin-bottom:28px;text-shadow:2px 2px 4px rgba(0,0,0,0.9);letter-spacing:0.02em;">Toothless vs The Bewilderbeast</p>
      <div style="width:320px;height:5px;background:rgba(255,220,100,0.15);border-radius:3px;overflow:hidden;border:1px solid rgba(255,220,100,0.3);">
        <div id="bf-load-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#c8860a,#ffeaa7);transition:width .3s;"></div>
      </div>
      <p id="bf-load-txt" style="font-family:'Crimson Pro',Georgia,serif;color:rgba(255,234,167,0.6);font-size:13px;margin-top:10px;">Loading models…</p>`;
    ov.appendChild(ld);
    this.ui.ld = ld;

    /* click-to-start */
    const cs = document.createElement("div");
    cs.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:none;align-items:center;" +
      "justify-content:center;z-index:50;cursor:pointer;pointer-events:auto;" +
      "background:radial-gradient(ellipse at center,rgba(30,15,0,0.5),rgba(0,0,0,0.7));";
    cs.innerHTML = `<div style="text-align:center">
      <h2 style="font-family:'Cinzel',serif;color:#ffeaa7;font-size:clamp(1.5rem,4vw,2.2rem);font-weight:700;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.5);letter-spacing:0.05em;text-transform:uppercase;animation:bfPulse 2s infinite">Click to Begin</h2>
      <p style="font-family:'Crimson Pro',Georgia,serif;color:rgba(245,245,245,0.85);font-size:14px;margin-top:18px;text-shadow:2px 2px 4px rgba(0,0,0,0.9);letter-spacing:0.02em;">Mouse: Aim &nbsp;|&nbsp; WASD: Move &nbsp;|&nbsp; Space / Ctrl: Up / Down</p>
      <p style="font-family:'Crimson Pro',Georgia,serif;color:rgba(245,245,245,0.85);font-size:14px;text-shadow:2px 2px 4px rgba(0,0,0,0.9);letter-spacing:0.02em;">Click: Shoot &nbsp;|&nbsp; Right-Click: Charged Shot &nbsp;|&nbsp; Shift: Dodge &nbsp;|&nbsp; Q: Summon Allies</p>
    </div>`;
    ov.appendChild(cs);
    this.ui.cs = cs;

    /* HUD wrapper */
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;display:none;";
    ov.appendChild(hud);
    this.ui.hud = hud;

    hud.innerHTML = `
    <!-- Boss HP -->
    <div style="position:absolute;top:18px;left:50%;transform:translateX(-50%);width:520px;max-width:82%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span id="bf-bname" style="font-family:'Cinzel',serif;color:#ff6600;font-size:14px;font-weight:700;text-shadow:2px 2px 4px rgba(0,0,0,0.9),0 0 12px rgba(255,100,0,0.4);letter-spacing:0.08em;text-transform:uppercase">THE BEWILDERBEAST</span>
        <span id="bf-bphase" style="font-family:'Crimson Pro',Georgia,serif;color:#ffeaa7;font-size:12px;text-shadow:1px 1px 3px rgba(0,0,0,0.9);letter-spacing:0.03em">Phase 1 — The Tyrant Awakens</span>
      </div>
      <div style="width:100%;height:13px;background:rgba(20,10,5,0.7);border-radius:7px;overflow:hidden;border:1px solid rgba(255,220,100,0.25)">
        <div id="bf-bhp" style="width:100%;height:100%;background:linear-gradient(90deg,#ff2200,#ff6600);transition:width .3s;border-radius:7px"></div>
      </div>
      <div id="bf-bhptxt" style="font-family:'Crimson Pro',Georgia,serif;text-align:center;color:rgba(255,234,167,0.5);font-size:11px;margin-top:2px">3000 / 3000</div>
    </div>

    <!-- Player HP -->
    <div style="position:absolute;bottom:28px;left:18px;width:260px">
      <div style="display:flex;align-items:center;margin-bottom:4px">
        <span style="color:#44ff44;font-size:15px;font-weight:700;margin-right:7px">&hearts;</span>
        <span id="bf-php-txt" style="font-family:'Crimson Pro',Georgia,serif;color:#44ff44;font-size:13px;text-shadow:1px 1px 3px rgba(0,0,0,0.9)">100 / 100</span>
      </div>
      <div style="width:100%;height:9px;background:rgba(10,20,10,0.7);border-radius:5px;overflow:hidden;border:1px solid rgba(100,255,100,0.2)">
        <div id="bf-php" style="width:100%;height:100%;background:linear-gradient(90deg,#2a2,#4f4);transition:width .2s;border-radius:5px"></div>
      </div>
    </div>

    <!-- Focus bar -->
    <div style="position:absolute;bottom:28px;left:50%;transform:translateX(-50%);width:210px;text-align:center">
      <span id="bf-flab" style="font-family:'Cinzel',serif;color:#ffeaa7;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;text-shadow:1px 1px 3px rgba(0,0,0,0.9)">FOCUS</span>
      <div style="width:100%;height:9px;background:rgba(20,10,5,0.7);border-radius:5px;overflow:hidden;border:1px solid rgba(255,220,100,0.2);margin-top:3px">
        <div id="bf-fbar" style="width:0%;height:100%;background:linear-gradient(90deg,#8b4513,#ffeaa7);transition:width .2s;border-radius:5px"></div>
      </div>
      <span id="bf-fhint" style="font-family:'Crimson Pro',Georgia,serif;color:#ffeaa7;font-size:11px;display:none;text-shadow:1px 1px 3px rgba(0,0,0,0.9)">[Q] Summon Allies!</span>
    </div>

    <!-- Combo -->
    <div id="bf-combo" style="position:absolute;right:28px;top:50%;transform:translateY(-50%);text-align:right;display:none">
      <div id="bf-cnum" style="font-family:'Cinzel',serif;color:#ffeaa7;font-size:50px;font-weight:900;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 20px rgba(255,180,0,0.4)"></div>
      <div style="font-family:'Cinzel',serif;color:#ffeaa7;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;text-shadow:2px 2px 4px rgba(0,0,0,0.9)">COMBO</div>
      <div id="bf-cmul" style="font-family:'Crimson Pro',Georgia,serif;color:#ff6600;font-size:15px;font-weight:700;text-shadow:1px 1px 3px rgba(0,0,0,0.9)">×1.0</div>
    </div>

    <!-- Crosshair -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
      <div style="width:32px;height:32px;border:2px solid rgba(255,220,100,.45);border-radius:50%;position:relative">
        <div style="position:absolute;top:50%;left:-7px;width:5px;height:2px;background:rgba(255,220,100,.7);transform:translateY(-50%)"></div>
        <div style="position:absolute;top:50%;right:-7px;width:5px;height:2px;background:rgba(255,220,100,.7);transform:translateY(-50%)"></div>
        <div style="position:absolute;left:50%;top:-7px;width:2px;height:5px;background:rgba(255,220,100,.7);transform:translateX(-50%)"></div>
        <div style="position:absolute;left:50%;bottom:-7px;width:2px;height:5px;background:rgba(255,220,100,.7);transform:translateX(-50%)"></div>
        <div style="position:absolute;top:50%;left:50%;width:3px;height:3px;background:rgba(255,234,167,.65);border-radius:50%;transform:translate(-50%,-50%)"></div>
      </div>
    </div>

    <!-- Charge indicator -->
    <div id="bf-charge" style="position:absolute;bottom:70px;left:50%;transform:translateX(-50%);width:100px;display:none;">
      <div style="width:100%;height:4px;background:rgba(20,10,5,0.7);border-radius:2px;overflow:hidden;border:1px solid rgba(255,220,100,0.15)">
        <div id="bf-cbar" style="width:0%;height:100%;background:linear-gradient(90deg,#8b4513,#ffeaa7);transition:width .05s"></div>
      </div>
      <div style="font-family:'Crimson Pro',Georgia,serif;text-align:center;color:rgba(255,234,167,0.5);font-size:9px;margin-top:2px">RIGHT-CLICK</div>
    </div>

    <!-- Phase transition -->
    <div id="bf-phase-t" style="position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);text-align:center;display:none">
      <div id="bf-ptitle" style="font-family:'Cinzel',serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:900;color:#ff6600;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 24px rgba(255,100,0,0.5);letter-spacing:0.05em;text-transform:uppercase"></div>
      <div id="bf-psub" style="font-family:'Crimson Pro',Georgia,serif;font-size:clamp(1rem,2.5vw,1.4rem);color:#ffeaa7;margin-top:12px;text-shadow:2px 2px 4px rgba(0,0,0,0.9),0 0 12px rgba(255,180,0,0.3);letter-spacing:0.02em"></div>
    </div>

    <!-- Centered message -->
    <div id="bf-msg" style="position:absolute;top:58%;left:50%;transform:translate(-50%,-50%);text-align:center;display:none">
      <div id="bf-msg-t" style="font-family:'Cinzel',serif;font-size:clamp(1.2rem,3vw,2rem);font-weight:700;color:#ffeaa7;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 18px rgba(255,180,0,0.3);letter-spacing:0.05em;text-transform:uppercase"></div>
    </div>

    <!-- Damage numbers -->
    <div id="bf-dmg" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden"></div>

    <!-- End screen -->
    <div id="bf-end" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(30,15,0,0.85),rgba(0,0,0,0.92))">
      <div style="text-align:center">
        <div id="bf-end-t" style="font-family:'Cinzel',serif;font-size:clamp(2.5rem,6vw,4rem);font-weight:900;margin-bottom:18px;text-shadow:3px 3px 6px rgba(0,0,0,0.9),0 0 20px rgba(0,0,0,0.5);letter-spacing:0.05em;text-transform:uppercase"></div>
        <div id="bf-end-s" style="font-family:'Crimson Pro',Georgia,serif;font-size:clamp(1rem,2.5vw,1.3rem);color:rgba(245,245,245,0.85);margin-bottom:32px;text-shadow:2px 2px 4px rgba(0,0,0,0.9);letter-spacing:0.02em"></div>
        <div id="bf-retry" style="pointer-events:auto;cursor:pointer;padding:15px 40px;border:2px solid rgba(255,220,100,0.8);background:rgba(139,69,19,0.7);color:#ffeaa7;font-family:'Cinzel',serif;font-size:clamp(0.9rem,2vw,1.2rem);font-weight:700;letter-spacing:0.15em;text-transform:uppercase;border-radius:8px;display:inline-block;transition:all .3s ease;backdrop-filter:blur(5px);box-shadow:0 6px 20px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.2)">Retry</div>
      </div>
    </div>`;

    /* Flash overlay */
    const fl = document.createElement("div");
    fl.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;transition:opacity .15s;";
    ov.appendChild(fl);
    this.ui.fl = fl;

    /* CSS animation */
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bfPulse{0%,100%{opacity:1}50%{opacity:.5}}
      #bf-retry:hover{background:rgba(139,69,19,0.9)!important;transform:scale(1.05);border-color:rgba(255,220,100,1)!important;box-shadow:0 8px 28px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.3),0 0 15px rgba(255,220,100,0.2)!important;}
    `;
    document.head.appendChild(style);
    this.ui.style = style;
  }

  // ════════════════════════════════════════════════
  //  GAME LOOP
  // ════════════════════════════════════════════════

  _startLoop() {
    this.clock.start();
    const loop = () => {
      if (this.disposed) return;
      this.animFrameId = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.gTime += dt;
      this._update(dt);
      this._render();
    };
    loop();
  }

  _update(dt) {
    // Mixers
    this.mixers.forEach((m) => m.update(dt));
    // Environment
    this._tickEnv(dt);
    // Particles
    this._tickParticles(dt);
    // Shake decay
    this.shakeAmt *= Math.pow(0.04, dt);
    if (this.shakeAmt < 0.01) this.shakeAmt = 0;

    switch (this.state) {
      case "intro":
        this._tickIntro(dt);
        break;
      case "playing":
        this._tickPlayer(dt);
        this._tickBoss(dt);
        this._tickMinions(dt);
        this._tickAllies(dt);
        this._tickProjectiles(dt);
        this._collisions();
        this._tickUI();
        break;
      case "phase_transition":
        this._tickPhaseT(dt);
        break;
      case "victory":
        this._tickVictory(dt);
        break;
      case "defeat":
        this._tickDefeat(dt);
        break;
    }

    this._tickCamera(dt);
  }

  _render() {
    if (this.shakeAmt > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmt;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ════════════════════════════════════════════════
  //  ENVIRONMENT TICK
  // ════════════════════════════════════════════════

  _tickEnv(dt) {
    if (this.ocean) this.ocean.position.y = -18 + Math.sin(this.gTime * 0.45) * 0.6;

    if (this.snowPts) {
      const p = this.snowPts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * (7 + Math.abs(p.getX(i)) * 0.025);
        if (y < -5) y = 160;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    }
  }

  // ════════════════════════════════════════════════
  //  CAMERA
  // ════════════════════════════════════════════════

  _tickCamera(dt) {
    if (this.state === "intro") return; // handled in _tickIntro

    const p = this.player;
    // Close third-person "riding" camera behind and slightly above Toothless
    const hFwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const tPos = p.position
      .clone()
      .add(hFwd.clone().multiplyScalar(-7))
      .add(new THREE.Vector3(0, 4.5 - p.pitch * 3, 0));
    this.camera.position.lerp(tPos, 1 - Math.pow(0.00005, dt));

    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(p.pitch, p.yaw, 0, "YXZ")
    );
    const look = p.position.clone().add(fwd.multiplyScalar(45));
    this.camera.lookAt(look);
  }

  // ════════════════════════════════════════════════
  //  INTRO
  // ════════════════════════════════════════════════

  _tickIntro(dt) {
    this.introT += dt;
    const t = this.introT;

    if (t < 5) {
      const e = Math.min(t / 4, 1);
      const s = e * e * (3 - 2 * e); // smoothstep
      // Cinematic pan toward the boss standing on ice
      this.camera.position.set(
        Math.sin(t * 0.28) * 45,
        40 + s * 40,
        140 - s * 155
      );
      this.camera.lookAt(0, 50 + s * 30, -110);

      // Boss rises from behind ice to standing position
      if (this.boss.model) this.boss.model.position.y = this.boss.position.y + (-30 + s * 30);
      if (t > 3 && t - dt <= 3) { this.shakeAmt = 5; this._msg("THE BEWILDERBEAST", 2); }
    } else if (t < 7) {
      if (t - dt < 5) this.ui.cs.style.display = "flex";
      this.camera.position.set(Math.sin(t * 0.18) * 22, 65, 60);
      this.camera.lookAt(0, 60, -110);
    }

    if (this.ptrLocked && t > 5) {
      this.state = "playing";
      this.ui.cs.style.display = "none";
      this.ui.hud.style.display = "block";
      this._msg("DEFEAT THE ALPHA!", 2.5);
    }
  }

  // ════════════════════════════════════════════════
  //  PLAYER
  // ════════════════════════════════════════════════

  _tickPlayer(dt) {
    const p = this.player;

    /* ── Look ── */
    if (this.ptrLocked) {
      p.yaw -= this.mx * MOUSE_SENS;
      p.pitch -= this.my * MOUSE_SENS;
      p.pitch = THREE.MathUtils.clamp(p.pitch, -1.05, 1.05);
    }
    this.mx = 0;
    this.my = 0;

    /* ── Move ── */
    if (!p.isDodging) {
      const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const acc = new THREE.Vector3();

      if (this.keys["KeyW"]) acc.add(fwd);
      if (this.keys["KeyS"]) acc.sub(fwd);
      if (this.keys["KeyA"]) acc.sub(right);
      if (this.keys["KeyD"]) acc.add(right);
      if (this.keys["Space"]) acc.y += 1;
      if (this.keys["ControlLeft"] || this.keys["ControlRight"]) acc.y -= 1;

      if (acc.lengthSq() > 0) acc.normalize().multiplyScalar(PLAYER_SPEED);
      p.velocity.lerp(acc, 1 - Math.pow(0.0008, dt));

      const lat = (this.keys["KeyD"] ? 1 : 0) - (this.keys["KeyA"] ? 1 : 0);
      p.targetRoll = -lat * 0.45;
      p.roll = THREE.MathUtils.lerp(p.roll, p.targetRoll, 1 - Math.pow(0.008, dt));
    }

    p.position.add(p.velocity.clone().multiplyScalar(dt));

    // Arena clamp
    const flat = new THREE.Vector2(p.position.x, p.position.z);
    if (flat.length() > ARENA_RADIUS) {
      flat.normalize().multiplyScalar(ARENA_RADIUS);
      p.position.x = flat.x;
      p.position.z = flat.y;
    }
    p.position.y = THREE.MathUtils.clamp(p.position.y, 10, 140);

    // Model — face forward (away from camera, toward the boss)
    if (p.model) {
      p.model.position.copy(p.position);
      p.model.rotation.set(p.pitch * 0.45, p.yaw, p.roll, "YXZ");
    }
    if (p.light) p.light.position.copy(p.position);

    /* ── Shoot ── */
    this._handleShoot(dt);

    /* ── Dodge ── */
    this._handleDodge(dt);

    /* ── Invincibility ── */
    if (p.invincible) {
      p.invTimer -= dt;
      if (p.invTimer <= 0) {
        p.invincible = false;
        if (p.model) p.model.visible = true;
      } else if (p.model) {
        p.model.visible = Math.sin(this.gTime * 22) > 0;
      }
    } else if (p.model) {
      p.model.visible = true;
    }

    /* ── Combo timer ── */
    if (p.combo > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) { p.combo = 0; p.dmgMul = 1; }
    }

    /* ── Focus passive ── */
    p.focus = Math.min(FOCUS_MAX, p.focus + FOCUS_PER_SECOND * dt);

    /* ── Ally summon ── */
    if (this.keys["KeyQ"] && p.focus >= FOCUS_MAX && !this.allies.active) this._summonAllies();
  }

  /* ── Shooting ── */
  _handleShoot(dt) {
    const p = this.player;
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    p.chargeCooldown = Math.max(0, p.chargeCooldown - dt);

    // Auto-fire plasma
    if (this.mb.l && p.fireCooldown <= 0) {
      this._firePlasma();
      p.fireCooldown = FIRE_COOLDOWN;
    }

    // Charged blast (right-click / E)
    if ((this.mb.r || this.keys["KeyE"]) && p.chargeCooldown <= 0) {
      this._fireCharged();
      p.chargeCooldown = CHARGED_COOLDOWN;
      this.shakeAmt = Math.max(this.shakeAmt, 1.5);
    }
  }

  _firePlasma() {
    const p = this.player;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(p.pitch, p.yaw, 0, "YXZ")
    );
    const start = p.position.clone().add(dir.clone().multiplyScalar(4));

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x9933ff })
    );
    mesh.position.copy(start);
    mesh.add(new THREE.PointLight(0x8833ff, 1.2, 22));
    this.scene.add(mesh);

    this.pProj.push({
      mesh,
      vel: dir.multiplyScalar(PLASMA_SPEED),
      dmg: PLASMA_DAMAGE * p.dmgMul,
      life: 3.5,
      type: "plasma",
    });
    this._emitP(start, "plasma", 4);
  }

  _fireCharged() {
    const p = this.player;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(p.pitch, p.yaw, 0, "YXZ")
    );
    const start = p.position.clone().add(dir.clone().multiplyScalar(5));

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xaa22ff })
    );
    mesh.position.copy(start);
    mesh.add(new THREE.PointLight(0xaa33ff, 3.5, 45));
    mesh.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      )
    );
    this.scene.add(mesh);

    this.pProj.push({
      mesh,
      vel: dir.multiplyScalar(PLASMA_SPEED * 0.75),
      dmg: CHARGED_PLASMA_DAMAGE * p.dmgMul,
      life: 4.5,
      type: "charged",
    });
    this._emitP(start, "plasma", 14);
  }

  /* ── Dodge ── */
  _handleDodge(dt) {
    const p = this.player;

    if (p.isDodging) {
      p.dodgeTimer -= dt;
      if (p.dodgeTimer <= 0) {
        p.isDodging = false;
      } else {
        p.position.add(p.dodgeDir.clone().multiplyScalar(DODGE_SPEED * dt));
        if (p.model) p.model.rotation.z += dt * 16;
      }
      return;
    }

    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);

    if ((this.keys["ShiftLeft"] || this.keys["ShiftRight"]) && p.dodgeCooldown <= 0) {
      p.isDodging = true;
      p.dodgeTimer = DODGE_DURATION;
      p.dodgeCooldown = DODGE_COOLDOWN;
      p.invincible = true;
      p.invTimer = DODGE_DURATION + 0.25;

      const mv = new THREE.Vector3();
      if (this.keys["KeyA"]) mv.x -= 1;
      if (this.keys["KeyD"]) mv.x += 1;
      if (this.keys["KeyW"]) mv.z -= 1;
      if (this.keys["KeyS"]) mv.z += 1;
      if (mv.lengthSq() > 0) {
        mv.normalize().applyEuler(new THREE.Euler(0, p.yaw, 0));
      } else {
        mv.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      }
      p.dodgeDir = mv;
      p.focus = Math.min(FOCUS_MAX, p.focus + FOCUS_PER_DODGE);
      this._emitP(p.position, "dodge", 18);
    }
  }

  // ════════════════════════════════════════════════
  //  BOSS AI
  // ════════════════════════════════════════════════

  _tickBoss(dt) {
    const b = this.boss;

    /* stunned */
    if (b.stunned) {
      b.stunTimer -= dt;
      if (b.stunTimer <= 0) { b.stunned = false; b.atkState = "idle"; }
      if (b.model) b.model.rotation.x = Math.sin(this.gTime * 11) * 0.05;
      return;
    }

    /* head tracking — rotate boss to face the player */
    if (b.model) {
      const toP = this.player.position.clone().sub(b.model.position);
      const ty = Math.atan2(toP.x, toP.z) + Math.PI;
      b.rot = THREE.MathUtils.lerp(b.rot, ty, dt * 0.45);
      b.model.rotation.y = b.rot;
      b.headPos.set(
        b.model.position.x + Math.sin(b.rot) * 38,
        b.model.position.y + 55,
        b.model.position.z + Math.cos(b.rot) * 38
      );
      if (b.light) b.light.position.copy(b.headPos);
    }

    /* state machine */
    switch (b.atkState) {
      case "idle":
        b.atkTimer -= dt;
        if (b.atkTimer <= 0) this._bossPickAtk();
        if (b.model) b.model.position.y = b.position.y + Math.sin(this.gTime * 0.75) * 1.5;
        break;
      case "exec":
        this._bossExecAtk(dt);
        break;
      case "recover":
        b.atkTimer -= dt;
        if (b.atkTimer <= 0) { b.atkState = "idle"; b.atkTimer = this._bossCD(); }
        break;
    }

    this._checkPhase();
  }

  _bossCD() {
    const ph = this.boss.phase;
    if (ph >= 4) return 0.8 + Math.random() * 0.5;
    if (ph >= 3) return 1.3 + Math.random() * 0.8;
    if (ph >= 2) return 1.8 + Math.random() * 1.0;
    return 2.4 + Math.random() * 1.4;
  }

  _bossPickAtk() {
    const b = this.boss;
    const ph = b.phase;
    const pool = ["ice_breath", "ice_spikes", "tusk_slam"];
    if (ph >= 2) pool.push("ice_boulder", "blizzard", "summon");
    if (ph >= 3) pool.push("ice_storm", "charge", "nova");
    if (ph >= 4) pool.push("dual_beam", "desperation", "alpha_roar");

    let pick;
    do { pick = pool[(Math.random() * pool.length) | 0]; } while (pick === b.lastAtk && pool.length > 1);

    b.lastAtk = pick;
    b.curAtk = pick;
    b.atkState = "exec";
    b.atkProg = 0;
    b.atkData = {};
  }

  _bossExecAtk(dt) {
    const b = this.boss;
    b.atkProg += dt;
    switch (b.curAtk) {
      case "ice_breath":    this._atkBreath(dt); break;
      case "ice_spikes":    this._atkSpikes(dt); break;
      case "tusk_slam":     this._atkTuskSlam(dt); break;
      case "ice_boulder":   this._atkBoulder(dt); break;
      case "blizzard":      this._atkBlizzard(dt); break;
      case "summon":        this._atkSummon(dt); break;
      case "ice_storm":     this._atkStorm(dt); break;
      case "charge":        this._atkCharge(dt); break;
      case "nova":          this._atkNova(dt); break;
      case "dual_beam":     this._atkDualBeam(dt); break;
      case "desperation":   this._atkDesperation(dt); break;
      case "alpha_roar":    this._atkRoar(dt); break;
      default: this._endAtk();
    }
  }

  _endAtk() {
    const b = this.boss;
    // cleanup meshes
    if (b.atkData.meshes) {
      b.atkData.meshes.forEach((m) => { this.scene.remove(m); m.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose(); }); });
    }
    if (b.atkData.beam) {
      this.scene.remove(b.atkData.beam);
      b.atkData.beam.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    }
    b.atkData = {};
    b.curAtk = null;
    b.atkProg = 0;
    b.atkState = "recover";
    b.atkTimer = 0.4 + Math.random() * 0.4;
  }

  // ── Boss helper: create projectile ──
  _bossProj(pos, vel, type, dmg, life, radius) {
    let geo, mat;
    switch (type) {
      case "ice_p":
        geo = new THREE.SphereGeometry(0.45, 4, 4);
        mat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.85 });
        radius = radius || 1.5; break;
      case "ice_boulder":
        geo = new THREE.IcosahedronGeometry(3.2, 0);
        mat = new THREE.MeshPhongMaterial({ color: 0x88bbdd, emissive: 0x224466 });
        radius = radius || 5; break;
      case "ice_spike":
        geo = new THREE.ConeGeometry(1.2, 7, 5);
        mat = new THREE.MeshPhongMaterial({ color: 0x99ddff, emissive: 0x335577 });
        radius = radius || 3; break;
      case "ice_shard":
        geo = new THREE.TetrahedronGeometry(1.3);
        mat = new THREE.MeshPhongMaterial({ color: 0xaaeeff, emissive: 0x446688 });
        radius = radius || 2; break;
      case "nova_ring":
        geo = new THREE.TorusGeometry(1, 0.6, 8, 32);
        mat = new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.65 });
        radius = radius || 3; break;
      default:
        geo = new THREE.SphereGeometry(1, 6, 6);
        mat = new THREE.MeshBasicMaterial({ color: 0x66ccff });
        radius = radius || 2;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.bProj.push({ mesh, vel: vel.clone(), dmg, life, type, radius: radius || 2 });
  }

  // ────────────────────────────────────────────────
  //  BOSS ATTACKS (12 types)
  // ────────────────────────────────────────────────

  /* 1 — Ice Breath Sweep (Phase 1+) */
  _atkBreath(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3.6) { this._endAtk(); return; }
    if (t < 0.6) return;
    if (!b.atkData.le) b.atkData.le = 0;
    if (t - b.atkData.le > 0.045) {
      b.atkData.le = t;
      const sw = b.rot + Math.sin(((t - 0.6) / 3) * Math.PI * 2) * 0.85;
      const d = new THREE.Vector3(Math.sin(sw), -0.08, Math.cos(sw));
      for (let i = 0; i < 3; i++) {
        const dd = d.clone();
        dd.x += (Math.random() - 0.5) * 0.22;
        dd.y += (Math.random() - 0.5) * 0.1;
        dd.normalize();
        this._bossProj(b.headPos.clone(), dd.multiplyScalar(95 + Math.random() * 25), "ice_p", 5, 2.2);
      }
    }
    // visual particles
    this._emitP(b.headPos, "ice", 2);
  }

  /* 2 — Ice Spikes from below (Phase 1+) */
  _atkSpikes(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3.5) { this._endAtk(); return; }
    if (t < 0.7) return;
    if (!b.atkData.ns) { b.atkData.ns = 0.7; b.atkData.c = 0; }
    const max = b.phase >= 3 ? 12 : b.phase >= 2 ? 9 : 6;
    if (t >= b.atkData.ns && b.atkData.c < max) {
      b.atkData.c++;
      b.atkData.ns += 0.22;
      const tgt = this.player.position.clone();
      // spike from below
      const sp = new THREE.Vector3(tgt.x + (Math.random() - 0.5) * 8, -8, tgt.z + (Math.random() - 0.5) * 8);
      this._bossProj(sp, new THREE.Vector3(0, 62, 0), "ice_spike", 10, 2.5, 3.5);
    }
  }

  /* 3 — Tusk Slam Shockwave (Phase 1+) */
  _atkTuskSlam(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 2.5) { this._endAtk(); return; }
    // headbutt at t=0.6
    if (b.model && t < 0.6) b.model.rotation.x = -t * 0.6;
    if (t >= 0.6 && !b.atkData.did) {
      b.atkData.did = true;
      if (b.model) b.model.rotation.x = 0.2;
      this.shakeAmt = Math.max(this.shakeAmt, 4);
      // ring of projectiles
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a));
        this._bossProj(b.headPos.clone().add(new THREE.Vector3(0, -10, 0)), d.multiplyScalar(55), "ice_shard", 12, 3, 3);
      }
      this._emitP(b.headPos, "ice", 30);
    }
    if (b.model && t > 0.6) b.model.rotation.x *= 0.92;
  }

  /* 4 — Ice Boulder Throw (Phase 2+) */
  _atkBoulder(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3) { this._endAtk(); return; }
    if (!b.atkData.ns) { b.atkData.ns = 0.5; b.atkData.c = 0; }
    const max = b.phase >= 4 ? 6 : b.phase >= 3 ? 4 : 3;
    if (t >= b.atkData.ns && b.atkData.c < max) {
      b.atkData.c++;
      b.atkData.ns += 0.6;
      const toP = this.player.position.clone().sub(b.headPos).normalize();
      // slight aim-ahead
      toP.add(this.player.velocity.clone().multiplyScalar(0.005));
      toP.normalize();
      this._bossProj(b.headPos.clone(), toP.multiplyScalar(72), "ice_boulder", 18, 4, 5.5);
      this.shakeAmt = Math.max(this.shakeAmt, 1.5);
    }
  }

  /* 5 — Blizzard Breath – wide cone (Phase 2+) */
  _atkBlizzard(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 4) { this._endAtk(); return; }
    if (t < 0.5) return;
    if (!b.atkData.le) b.atkData.le = 0;
    if (t - b.atkData.le > 0.03) {
      b.atkData.le = t;
      const base = new THREE.Vector3(Math.sin(b.rot), 0, Math.cos(b.rot));
      for (let i = 0; i < 5; i++) {
        const d = base.clone();
        d.x += (Math.random() - 0.5) * 0.7;
        d.y += (Math.random() - 0.5) * 0.4;
        d.normalize();
        this._bossProj(b.headPos.clone(), d.multiplyScalar(80 + Math.random() * 35), "ice_p", 4, 2, 1.5);
      }
    }
  }

  /* 6 — Summon Minions (Phase 2+) */
  _atkSummon(dt) {
    const b = this.boss;
    if (b.atkProg > 2) { this._endAtk(); return; }
    if (!b.atkData.did) {
      b.atkData.did = true;
      const n = b.phase >= 4 ? 7 : b.phase >= 3 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const pos = b.headPos.clone().add(new THREE.Vector3(Math.cos(a) * 32, 8 + Math.random() * 12, Math.sin(a) * 32));
        this._spawnMinion(pos);
      }
      this.shakeAmt = Math.max(this.shakeAmt, 2.5);
      this._msg("Ice Drakes summoned!", 1.5);
    }
  }

  /* 7 — Ice Storm (Phase 3+) — random shards from sky */
  _atkStorm(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 5) { this._endAtk(); return; }
    if (!b.atkData.le) b.atkData.le = 0;
    if (t - b.atkData.le > 0.12) {
      b.atkData.le = t;
      const x = this.player.position.x + (Math.random() - 0.5) * 70;
      const z = this.player.position.z + (Math.random() - 0.5) * 70;
      this._bossProj(
        new THREE.Vector3(x, 110, z),
        new THREE.Vector3((Math.random() - 0.5) * 10, -70 - Math.random() * 30, (Math.random() - 0.5) * 10),
        "ice_shard", 8, 3, 2.5
      );
    }
    if (!b.atkData.w && t < 0.5) { b.atkData.w = true; this._msg("Ice Storm incoming!", 1.5); }
  }

  /* 8 — Charge Attack (Phase 3+) — boss lunges */
  _atkCharge(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3) { this._endAtk(); return; }
    if (t < 1) {
      // Warn & wind up
      if (!b.atkData.w) { b.atkData.w = true; this._msg("INCOMING!", 1); this.shakeAmt = 2; }
      if (b.model) b.model.position.z -= dt * 3;
      return;
    }
    if (!b.atkData.target) {
      b.atkData.target = this.player.position.clone();
      b.atkData.start = b.model ? b.model.position.clone() : b.position.clone();
    }
    // Lunge toward target
    const prog = Math.min((t - 1) / 1.2, 1);
    const ease = prog * prog;
    if (b.model) {
      b.model.position.lerpVectors(b.atkData.start, b.atkData.target.clone().add(new THREE.Vector3(0, -10, 0)), ease);
    }
    // Damage on proximity
    if (b.model && this.player.position.distanceTo(b.model.position) < 25 && !this.player.invincible) {
      this._dmgPlayer(20);
      this.shakeAmt = 5;
    }
    // Return
    if (t > 2.2 && b.model) {
      b.model.position.lerp(b.position, dt * 2);
    }
    // Shockwave particles
    if (b.model) this._emitP(b.model.position, "ice", 3);
  }

  /* 9 — Freezing Nova (Phase 3+) — expanding ring */
  _atkNova(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3) { this._endAtk(); return; }
    if (t < 0.8) {
      if (!b.atkData.w) { b.atkData.w = true; this.shakeAmt = 1.5; }
      return;
    }
    if (!b.atkData.rings) b.atkData.rings = [];
    if (!b.atkData.ns) b.atkData.ns = 0.8;
    if (t >= b.atkData.ns && b.atkData.rings.length < (b.phase >= 4 ? 3 : 2)) {
      b.atkData.ns += 0.8;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2, 1.5, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x66bbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.position.copy(b.headPos).add(new THREE.Vector3(0, -20, 0));
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      b.atkData.rings.push({ mesh: ring, radius: 2, speed: 55 });
      if (!b.atkData.meshes) b.atkData.meshes = [];
      b.atkData.meshes.push(ring);
      this.shakeAmt = Math.max(this.shakeAmt, 3);
    }
    // Expand rings
    b.atkData.rings.forEach((r) => {
      r.radius += r.speed * dt;
      r.mesh.scale.setScalar(r.radius);
      r.mesh.material.opacity = Math.max(0, 0.55 - r.radius * 0.003);
      // Collision
      const dist = this.player.position.distanceTo(r.mesh.position);
      if (Math.abs(dist - r.radius) < 5 && !this.player.invincible) {
        this._dmgPlayer(14);
      }
    });
  }

  /* 10 — Dual Ice Beams (Phase 4) — two crossing beams */
  _atkDualBeam(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 4.5) { this._endAtk(); return; }
    if (t < 0.5) return;
    if (!b.atkData.le) b.atkData.le = 0;
    if (t - b.atkData.le > 0.04) {
      b.atkData.le = t;
      const ang1 = b.rot + 0.35 + Math.sin(t * 2) * 0.5;
      const ang2 = b.rot - 0.35 - Math.sin(t * 2) * 0.5;
      [ang1, ang2].forEach((a) => {
        const d = new THREE.Vector3(Math.sin(a), -0.05, Math.cos(a));
        for (let i = 0; i < 2; i++) {
          const dd = d.clone();
          dd.x += (Math.random() - 0.5) * 0.12;
          dd.normalize();
          this._bossProj(b.headPos.clone(), dd.multiplyScalar(100), "ice_p", 6, 2);
        }
      });
    }
  }

  /* 11 — Desperation Blast (Phase 4) — massive AoE  */
  _atkDesperation(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 4) { this._endAtk(); return; }
    if (t < 2) {
      if (!b.atkData.w) { b.atkData.w = true; this._msg("MASSIVE ATTACK — GET BACK!", 2); this.shakeAmt = 3; }
      // Boss charges energy
      this._emitP(b.headPos, "ice", 6);
      return;
    }
    if (!b.atkData.did) {
      b.atkData.did = true;
      this.shakeAmt = 8;
      this._flash("#66ccff", 0.4);
      // Burst of projectiles in all directions
      for (let i = 0; i < 80; i++) {
        const d = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.3) * 1.5,
          (Math.random() - 0.5) * 2
        ).normalize();
        this._bossProj(b.headPos.clone(), d.multiplyScalar(50 + Math.random() * 40), "ice_shard", 15, 4, 2.5);
      }
      this._emitP(b.headPos, "ice", 60);
    }
  }

  /* 12 — Alpha Roar (Phase 4) — stun attempt + damage wave */
  _atkRoar(dt) {
    const b = this.boss, t = b.atkProg;
    if (t > 3) { this._endAtk(); return; }
    if (t < 1) {
      if (!b.atkData.w) { b.atkData.w = true; this._msg("ALPHA ROAR!", 1.5); }
      this.shakeAmt = Math.max(this.shakeAmt, 2 + t * 3);
      return;
    }
    if (!b.atkData.did) {
      b.atkData.did = true;
      this.shakeAmt = 7;
      this._flash("#ffffff", 0.35);
      // Damage all in range (unless dodging)
      const dist = this.player.position.distanceTo(b.headPos);
      if (dist < 100 && !this.player.invincible) {
        this._dmgPlayer(16);
        // Brief slow effect
        this.player.velocity.multiplyScalar(0.2);
      }
      // Radial projectiles
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a), 0.1, Math.sin(a));
        this._bossProj(b.headPos.clone(), d.multiplyScalar(60), "ice_shard", 10, 3.5, 2);
      }
    }
  }

  // ────────────────────────────────────────────────
  //  MINIONS
  // ────────────────────────────────────────────────

  _spawnMinion(pos) {
    const g = new THREE.Group();
    const bm = new THREE.MeshPhongMaterial({ color: 0x556677, emissive: 0x112233 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.6, 4, 8), bm);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const wm = new THREE.MeshPhongMaterial({ color: 0x667788, side: THREE.DoubleSide });
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.1), wm);
      w.position.set(s * 1.5, 0.2, 0);
      g.add(w);
    });
    g.position.copy(pos);
    this.scene.add(g);
    this.minions.push({ mesh: g, pos: pos.clone(), vel: new THREE.Vector3(), hp: 22, atkCD: 2 + Math.random(), spd: 24 + Math.random() * 14, r: 2, alive: true });
  }

  _tickMinions(dt) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      if (!m.alive) continue;
      const toP = this.player.position.clone().sub(m.pos);
      const dist = toP.length();
      toP.normalize();
      if (dist > 12) m.vel.lerp(toP.multiplyScalar(m.spd), dt * 2);
      else m.vel.multiplyScalar(0.94);
      m.pos.add(m.vel.clone().multiplyScalar(dt));
      m.mesh.position.copy(m.pos);
      m.mesh.rotation.y = Math.atan2(toP.x, toP.z);
      // Wing flap
      m.mesh.children.slice(1).forEach((w, idx) => {
        w.rotation.z = Math.sin(this.gTime * 9) * 0.55 * (idx === 0 ? 1 : -1);
      });
      // Attack
      m.atkCD -= dt;
      if (m.atkCD <= 0 && dist < 80) {
        m.atkCD = 1.4 + Math.random();
        this._bossProj(m.pos.clone(), toP.clone().multiplyScalar(65), "ice_shard", 5, 3, 1.5);
      }
      if (m.hp <= 0) {
        m.alive = false;
        this._emitP(m.pos, "ice", 14);
        this.scene.remove(m.mesh);
        this.minions.splice(i, 1);
      }
    }
  }

  // ────────────────────────────────────────────────
  //  ALLIES
  // ────────────────────────────────────────────────

  _summonAllies() {
    const p = this.player;
    p.focus = 0;
    this.allies.active = true;
    this.allies.timer = ALLY_DURATION;
    this.allies.atkCD = 0;
    if (this.allies.model) {
      this.allies.model.visible = true;
      this.allies.model.position.copy(p.position).add(new THREE.Vector3(-14, 6, 12));
    }
    this._msg("Stormfly & Astrid join the fight!", 2);
    this.shakeAmt = 2;
    this._flash("#44aaff", 0.25);
    p.dmgMul = Math.max(p.dmgMul, 2);
  }

  _tickAllies(dt) {
    if (!this.allies.active) return;
    this.allies.timer -= dt;
    if (this.allies.timer <= 0) {
      this.allies.active = false;
      if (this.allies.model) this.allies.model.visible = false;
      this._msg("Allies departing…", 1.4);
      return;
    }
    // Fly between player and boss so they're visible on screen
    if (this.allies.model) {
      const t = this.gTime;
      // Midpoint between player and boss head, offset to the side
      const mid = this.player.position.clone().lerp(this.boss.headPos, 0.45);
      const tgt = new THREE.Vector3(
        mid.x + Math.cos(t * 1.4) * 28,
        mid.y + 6 + Math.sin(t * 2.2) * 5,
        mid.z + Math.sin(t * 1.4) * 28
      );
      this.allies.model.position.lerp(tgt, dt * 3);
      this.allies.model.lookAt(this.boss.headPos);
    }
    // Attack
    this.allies.atkCD -= dt;
    if (this.allies.atkCD <= 0) {
      this.allies.atkCD = 1.3;
      this._allyFire();
    }
  }

  _allyFire() {
    if (!this.allies.model) return;
    const pos = this.allies.model.position.clone();
    const toward = this.boss.headPos.clone().sub(pos).normalize();
    for (let i = 0; i < 6; i++) {
      const d = toward.clone();
      d.x += (Math.random() - 0.5) * 0.28;
      d.y += (Math.random() - 0.5) * 0.18;
      d.normalize();
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 2.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x44ddaa })
      );
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.pProj.push({ mesh, vel: d.multiplyScalar(115), dmg: 9, life: 3, type: "spine" });
    }
    this._emitP(pos, "spine", 7);
  }

  // ────────────────────────────────────────────────
  //  PROJECTILES & COLLISIONS
  // ────────────────────────────────────────────────

  _tickProjectiles(dt) {
    // Player projectiles
    for (let i = this.pProj.length - 1; i >= 0; i--) {
      const p = this.pProj[i];
      p.life -= dt;
      if (p.life <= 0) { this._removeProj(p.mesh); this.pProj.splice(i, 1); continue; }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      if (Math.random() > 0.6) this._emitP(p.mesh.position, p.type === "spine" ? "spine" : "plasma", 1);
      p.mesh.rotation.x += dt * 4;
    }
    // Boss projectiles
    for (let i = this.bProj.length - 1; i >= 0; i--) {
      const p = this.bProj[i];
      p.life -= dt;
      if (p.life <= 0 || p.mesh.position.y < -25) { this._removeProj(p.mesh); this.bProj.splice(i, 1); continue; }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      if (Math.random() > 0.85) this._emitP(p.mesh.position, "ice", 1);
      p.mesh.rotation.x += dt * 2;
      p.mesh.rotation.z += dt * 3;
    }
  }

  _removeProj(mesh) {
    this.scene.remove(mesh);
    mesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  }

  _collisions() {
    const b = this.boss;

    /* Player proj → Boss head */
    for (let i = this.pProj.length - 1; i >= 0; i--) {
      const p = this.pProj[i];
      const dH = p.mesh.position.distanceTo(b.headPos);
      if (dH < 22) {
        this._dmgBoss(p.dmg, p.mesh.position);
        this._emitP(p.mesh.position, "plasma", 10);
        this._removeProj(p.mesh);
        this.pProj.splice(i, 1);
        continue;
      }
      // Boss body
      const bP = b.model ? b.model.position : b.position;
      const dB = p.mesh.position.distanceTo(bP);
      if (dB < 42 && p.mesh.position.y > -5) {
        this._dmgBoss(p.dmg * 0.45, p.mesh.position);
        this._emitP(p.mesh.position, "plasma", 5);
        this._removeProj(p.mesh);
        this.pProj.splice(i, 1);
        continue;
      }
    }

    /* Player proj → Minions */
    for (let i = this.pProj.length - 1; i >= 0; i--) {
      const p = this.pProj[i];
      let hit = false;
      for (const m of this.minions) {
        if (!m.alive) continue;
        if (p.mesh.position.distanceTo(m.pos) < m.r + 1.2) {
          m.hp -= p.dmg;
          this._emitP(m.pos, "ice", 5);
          this._removeProj(p.mesh);
          this.pProj.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    /* Boss proj → Player */
    if (!this.player.invincible) {
      for (let i = this.bProj.length - 1; i >= 0; i--) {
        const p = this.bProj[i];
        if (p.mesh.position.distanceTo(this.player.position) < (p.radius || 2) + 3) {
          this._dmgPlayer(p.dmg);
          this._emitP(this.player.position, "ice", 8);
          this._removeProj(p.mesh);
          this.bProj.splice(i, 1);
        }
      }
    }

    /* Minion contact → Player */
    if (!this.player.invincible) {
      for (const m of this.minions) {
        if (!m.alive) continue;
        if (m.pos.distanceTo(this.player.position) < m.r + 3) {
          this._dmgPlayer(8);
          this.player.invincible = true;
          this.player.invTimer = 1;
          break;
        }
      }
    }
  }

  // ── Damage helpers ──

  _dmgPlayer(amt) {
    const p = this.player;
    if (p.invincible) return;
    p.hp -= amt;
    p.combo = 0;
    p.comboTimer = 0;
    p.dmgMul = 1;
    this.shakeAmt = Math.max(this.shakeAmt, amt * 0.3);
    this._flash("#ff0000", 0.18);
    if (p.hp <= 0) { p.hp = 0; this.state = "defeat"; }
    p.invincible = true;
    p.invTimer = 0.55;
  }

  _dmgBoss(amt, hitPos) {
    const b = this.boss;
    if (b.transitioning) return;
    b.hp = Math.max(0, b.hp - amt);
    const p = this.player;
    p.combo++;
    p.comboTimer = 3;
    if (p.combo >= 20) p.dmgMul = 3;
    else if (p.combo >= 15) p.dmgMul = 2.5;
    else if (p.combo >= 10) p.dmgMul = 2;
    else if (p.combo >= 5) p.dmgMul = 1.5;
    else p.dmgMul = 1;
    p.focus = Math.min(FOCUS_MAX, p.focus + FOCUS_PER_HIT);
    if (hitPos) this._dmgNum(Math.round(amt), hitPos);
    this.shakeAmt = Math.max(this.shakeAmt, 0.35);
    if (b.hp <= 0) this._triggerVictory();
  }

  // ────────────────────────────────────────────────
  //  PHASE TRANSITIONS
  // ────────────────────────────────────────────────

  _checkPhase() {
    const b = this.boss;
    const pct = b.hp / b.maxHp;
    let np = 1;
    if (pct <= 0.15) np = 4;
    else if (pct <= 0.40) np = 3;
    else if (pct <= 0.70) np = 2;
    if (np > b.phase) this._startPhaseT(np);
  }

  _startPhaseT(np) {
    const b = this.boss;
    this._endAtk();
    b.phase = np;
    b.transitioning = true;
    b.transTimer = 4;
    this.state = "phase_transition";
    this.shakeAmt = 6;
    this._flash("#ffeaa7", 0.45);

    const el = document.getElementById("bf-ptitle");
    const el2 = document.getElementById("bf-psub");
    const wrap = document.getElementById("bf-phase-t");
    if (el) el.textContent = `PHASE ${np}`;
    if (el2) el2.textContent = PHASE_NAMES[np - 1];
    if (wrap) wrap.style.display = "block";

    if (b.light) {
      const cols = [0xffeaa7, 0xff8c00, 0xff6633, 0xff0044];
      b.light.color.setHex(cols[np - 1]);
      b.light.intensity = 2 + np;
    }
    if (this.scene.fog) {
      this.scene.fog.density = 0.0006 + np * 0.0002;
    }
  }

  _tickPhaseT(dt) {
    const b = this.boss;
    b.transTimer -= dt;
    if (b.model) {
      b.model.rotation.x = Math.sin(this.gTime * 3.5) * 0.1;
      b.model.position.y = b.position.y + Math.sin(this.gTime * 5) * 3.5;
    }
    if (Math.random() > 0.65) {
      const p = b.headPos.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 45, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 45)
      );
      this._emitP(p, "ice", 4);
    }
    if (b.transTimer <= 0) {
      b.transitioning = false;
      this.state = "playing";
      document.getElementById("bf-phase-t").style.display = "none";
      b.atkState = "idle";
      b.atkTimer = 1.4;
    }
  }

  // ────────────────────────────────────────────────
  //  VICTORY / DEFEAT
  // ────────────────────────────────────────────────

  _triggerVictory() {
    this.state = "victory";
    this.shakeAmt = 7;
    this._flash("#aa44ff", 0.5);
    setTimeout(() => {
      if (this.disposed) return;
      const el = document.getElementById("bf-end");
      const t = document.getElementById("bf-end-t");
      const s = document.getElementById("bf-end-s");
      const btn = document.getElementById("bf-retry");
      if (el) el.style.display = "flex";
      if (t) { t.textContent = "VICTORY!"; t.style.color = "#ffeaa7"; t.style.textShadow = "3px 3px 6px rgba(0,0,0,0.9),0 0 30px rgba(255,180,0,0.4)"; }
      if (s) s.textContent = "The Bewilderbeast has been defeated! Toothless is the Alpha now!";
      if (btn) { btn.textContent = "Play Again"; btn.onclick = () => this._restart(); }
      if (this.onComplete) this.onComplete(true);
    }, 3200);
  }

  _tickVictory(dt) {
    if (this.boss.model) {
      this.boss.model.position.y -= dt * 5.5;
      this.boss.model.rotation.x += dt * 0.18;
    }
    if (Math.random() > 0.65) this._emitP(this.player.position, "plasma", 3);
  }

  _tickDefeat(dt) {
    if (this.player.model) {
      this.player.model.position.y -= dt * 14;
      this.player.model.rotation.z += dt * 3.5;
    }
    if (!this._defeatShown) {
      this._defeatShown = true;
      setTimeout(() => {
        if (this.disposed) return;
        const el = document.getElementById("bf-end");
        const t = document.getElementById("bf-end-t");
        const s = document.getElementById("bf-end-s");
        const btn = document.getElementById("bf-retry");
        if (el) el.style.display = "flex";
        if (t) { t.textContent = "DEFEATED"; t.style.color = "#ff6600"; t.style.textShadow = "3px 3px 6px rgba(0,0,0,0.9),0 0 30px rgba(255,100,0,0.4)"; }
        if (s) s.textContent = "The Bewilderbeast proved too powerful… Try again!";
        if (btn) { btn.textContent = "Retry"; btn.onclick = () => this._restart(); }
      }, 2200);
    }
  }

  _restart() {
    this.dispose();
    // eslint-disable-next-line no-new
    new BewilderbeastBossFight(this.container, this.onComplete);
  }

  // ────────────────────────────────────────────────
  //  PARTICLES
  // ────────────────────────────────────────────────

  _emitP(pos, type, count) {
    for (let i = 0; i < count; i++) {
      let col, sz, spd, life, grav;
      switch (type) {
        case "plasma":
          col = new THREE.Color().setHSL(0.74 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.3);
          sz = 0.35 + Math.random() * 0.5; spd = 6 + Math.random() * 14; life = 0.35 + Math.random() * 0.55; grav = 0; break;
        case "ice":
          col = new THREE.Color().setHSL(0.55 + Math.random() * 0.05, 0.6, 0.6 + Math.random() * 0.3);
          sz = 0.4 + Math.random() * 0.75; spd = 8 + Math.random() * 18; life = 0.5 + Math.random() * 1; grav = -5; break;
        case "dodge":
          col = new THREE.Color().setHSL(0.75, 0.8, 0.7);
          sz = 0.4; spd = 3.5; life = 0.45; grav = 0; break;
        case "spine":
          col = new THREE.Color(0x44ddaa);
          sz = 0.3; spd = 10; life = 0.32; grav = 0; break;
        default:
          col = new THREE.Color(0xffffff); sz = 0.3; spd = 5; life = 0.5; grav = 0;
      }
      this.particles.push({
        p: pos.clone(),
        v: new THREE.Vector3((Math.random() - 0.5) * spd * 2, (Math.random() - 0.5) * spd * 2, (Math.random() - 0.5) * spd * 2),
        col, sz, life, ml: life, grav,
      });
    }
  }

  _tickParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.v.y += p.grav * dt;
      p.p.addScaledVector(p.v, dt);
    }
    while (this.particles.length > 2000) this.particles.shift();

    const posA = this.pGeo.attributes.position.array;
    const colA = this.pGeo.attributes.color.array;
    const szA = this.pGeo.attributes.size.array;
    let idx = 0;
    const len = Math.min(this.particles.length, 2500);
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const a = p.life / p.ml;
      posA[idx * 3] = p.p.x;
      posA[idx * 3 + 1] = p.p.y;
      posA[idx * 3 + 2] = p.p.z;
      colA[idx * 3] = p.col.r * a;
      colA[idx * 3 + 1] = p.col.g * a;
      colA[idx * 3 + 2] = p.col.b * a;
      szA[idx] = p.sz * a;
      idx++;
    }
    for (let i = idx; i < 2500; i++) szA[i] = 0;
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;
    this.pGeo.attributes.size.needsUpdate = true;
    this.pGeo.setDrawRange(0, idx);
  }

  // ────────────────────────────────────────────────
  //  UI HELPERS
  // ────────────────────────────────────────────────

  _tickUI() {
    const b = this.boss, p = this.player;
    const bPct = (b.hp / b.maxHp) * 100;
    const pPct = (p.hp / p.maxHp) * 100;
    const fPct = (p.focus / FOCUS_MAX) * 100;

    this._setEl("bf-bhp", "width", `${bPct}%`);
    this._setEl("bf-bhptxt", "text", `${Math.ceil(b.hp)} / ${b.maxHp}`);
    this._setEl("bf-bphase", "text", `Phase ${b.phase} — ${PHASE_NAMES[b.phase - 1]}`);
    const bCols = ["linear-gradient(90deg,#ff2200,#ff6600)", "linear-gradient(90deg,#ff4400,#ffaa00)", "linear-gradient(90deg,#ff0000,#ff3300)", "linear-gradient(90deg,#aa0000,#ff0000)"];
    this._setEl("bf-bhp", "bg", bCols[b.phase - 1]);

    this._setEl("bf-php", "width", `${pPct}%`);
    this._setEl("bf-php-txt", "text", `${Math.ceil(p.hp)} / ${p.maxHp}`);
    if (pPct < 25) this._setEl("bf-php", "bg", "linear-gradient(90deg,#a00,#f22)");
    else if (pPct < 50) this._setEl("bf-php", "bg", "linear-gradient(90deg,#a60,#fa0)");
    else this._setEl("bf-php", "bg", "linear-gradient(90deg,#2a2,#4f4)");

    this._setEl("bf-fbar", "width", `${fPct}%`);
    const fh = document.getElementById("bf-fhint");
    if (fh) fh.style.display = p.focus >= FOCUS_MAX && !this.allies.active ? "block" : "none";
    const fb = document.getElementById("bf-fbar");
    if (fb) {
      if (p.focus >= FOCUS_MAX) { fb.style.background = "linear-gradient(90deg,#c8860a,#ffeaa7)"; fb.style.boxShadow = "0 0 12px rgba(255,220,100,0.5)"; }
      else { fb.style.background = "linear-gradient(90deg,#8b4513,#ffeaa7)"; fb.style.boxShadow = "none"; }
    }

    const cc = document.getElementById("bf-combo");
    if (p.combo >= 3) {
      if (cc) cc.style.display = "block";
      this._setEl("bf-cnum", "text", `${p.combo}`);
      this._setEl("bf-cmul", "text", `×${p.dmgMul.toFixed(1)}`);
    } else if (cc) cc.style.display = "none";
  }

  _setEl(id, prop, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === "width") el.style.width = val;
    else if (prop === "bg") el.style.background = val;
    else if (prop === "text") el.textContent = val;
  }

  _dmgNum(amt, worldPos) {
    const v = worldPos.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * this.container.clientWidth;
    const y = (-v.y * 0.5 + 0.5) * this.container.clientHeight;
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-family:'Cinzel',serif;color:#ffeaa7;font-size:${16 + amt * 0.22}px;font-weight:700;pointer-events:none;text-shadow:2px 2px 4px rgba(0,0,0,0.9),0 0 8px rgba(255,180,0,0.4);z-index:20;transition:all .9s;opacity:1;transform:translateY(0)`;
    el.textContent = `-${amt}`;
    const c = document.getElementById("bf-dmg");
    if (c) c.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = "translateY(-55px)"; el.style.opacity = "0"; });
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
  }

  _msg(text, dur) {
    const el = document.getElementById("bf-msg-t");
    const w = document.getElementById("bf-msg");
    if (el) el.textContent = text;
    if (w) w.style.display = "block";
    setTimeout(() => { if (w) w.style.display = "none"; }, dur * 1000);
  }

  _flash(color, dur) {
    if (this.ui.fl) {
      this.ui.fl.style.background = color;
      this.ui.fl.style.opacity = "0.3";
      setTimeout(() => { if (this.ui.fl) this.ui.fl.style.opacity = "0"; }, dur * 1000);
    }
  }

  _loadProg(pct) {
    const bar = document.getElementById("bf-load-bar");
    const txt = document.getElementById("bf-load-txt");
    if (bar) bar.style.width = `${pct}%`;
    if (txt) {
      if (pct < 30) txt.textContent = "Loading Toothless…";
      else if (pct < 60) txt.textContent = "Loading Bewilderbeast…";
      else if (pct < 95) txt.textContent = "Loading allies…";
      else txt.textContent = "Ready!";
    }
    if (pct >= 100) {
      setTimeout(() => {
        if (this.ui.ld) {
          this.ui.ld.style.opacity = "0";
          setTimeout(() => { if (this.ui.ld?.parentNode) this.ui.ld.parentNode.removeChild(this.ui.ld); }, 1100);
        }
      }, 400);
    }
  }

  // ────────────────────────────────────────────────
  //  DISPOSE
  // ────────────────────────────────────────────────

  dispose() {
    this.disposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const h = this._handlers;
    if (h.kd) document.removeEventListener("keydown", h.kd);
    if (h.ku) document.removeEventListener("keyup", h.ku);
    if (h.mm) document.removeEventListener("mousemove", h.mm);
    if (h.md) document.removeEventListener("mousedown", h.md);
    if (h.mu) document.removeEventListener("mouseup", h.mu);
    if (h.plc) document.removeEventListener("pointerlockchange", h.plc);
    if (h.rs) window.removeEventListener("resize", h.rs);

    if (document.pointerLockElement) document.exitPointerLock();

    if (this.scene) {
      this.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    if (this.ui.ov?.parentNode) this.ui.ov.parentNode.removeChild(this.ui.ov);
    if (this.ui.style?.parentNode) this.ui.style.parentNode.removeChild(this.ui.style);

    this.pProj = [];
    this.bProj = [];
    this.minions = [];
    this.particles = [];
    this.mixers = [];
  }
}
