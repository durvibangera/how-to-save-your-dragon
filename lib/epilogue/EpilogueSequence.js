import * as THREE from "three";

/**
 * Epilogue Sequence — cinematic finale after Area 6.
 * 
 * Runs automatically. No UI. No choices.
 * Just movement, light, ambient audio, and text.
 * 
 * The void: deep gradient (dark green -> navy -> black), no terrain,
 * stars appearing slowly, infinite calm.
 * 
 * Text beats fade in/out gently, centered, thin elegant sans-serif.
 * 
 * For the ending, the 3D scene fades out and a pastel
 * background with floating sparkles appears. After the final beat,
 * a "Ride Again" button loops back to the start.
 */
export class EpilogueSequence {
  constructor(container, scene, camera, renderer, ui, callbacks = {}) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.ui = ui;
    this.onPauseRequest = callbacks.onPause || (() => { });
    this.onResumeRequest = callbacks.onResume || (() => { });

    this.active = false;
    this.elapsed = 0;
    this.textBeats = this._defineTextBeats();
    this.currentBeat = -1;
    this.beatTimer = 0;

    // Overlay for epilogue text
    this.overlayEl = null;
    this.textEl = null;

    // Cute ending overlay
    this.cuteOverlay = null;
    this.cuteShown = false;

    // Epilogue environment objects
    this.stars = null;
    this.epilogueGroup = new THREE.Group();
    this.goldenLight = null;

    // Audio context
    this.audioCtx = null;
    this.audioNodes = [];

    // Callback when entire epilogue ends
    this.onComplete = null;

    // Configurable redirect URL for "Ride Again" button
    this._redirectUrl = callbacks.redirectUrl || "/";

    // Standalone animation tracking
    this._standaloneAnimId = null;
    this._standaloneRenderer = null;
    this._standaloneResizeHandler = null;
  }

  _defineTextBeats() {
    return [
      { text: "", duration: 3 },                                       // silence at start
      { text: "It all started with a single step…", duration: 4.5 },
      { text: "One level at a time.", duration: 4 },
      { text: "Not knowing what lay ahead.", duration: 5 },
      { text: "Every victory.", duration: 3.5, lightUp: true },
      { text: "Every late night.", duration: 3.5 },
      { text: "Every challenge.", duration: 3.5 },
      { text: "Every moment that mattered.", duration: 4.5 },
      { text: "This ride had ups.", duration: 4, starsBrighter: true },
      { text: "And downs.", duration: 3.5 },
      { text: "But the journey continued.", duration: 5 },
      { text: "What a ride.", duration: 7, cute: true },               // index 11 — cute bg
      { text: "Until the next one.", duration: 8, cute: true, golden: true }, // index 12
      { text: "", duration: 3, cute: true },                           // brief silence
      { text: "From the very first level…", duration: 6.5, cute: true },
      { text: "Through every boss, every puzzle, every twist — it was all worth it.", duration: 9, cute: true },
      { text: "Thanks for playing.", duration: 7.5, cute: true },
      { text: "Game Complete", duration: 8, cute: true, final: true },
    ];
  }

  /** Called when the epilogue should begin */
  start() {
    this.active = true;
    this.elapsed = 0;
    this.currentBeat = -1;
    this.beatTimer = 0;

    this._createOverlay();
    this._createVoidEnvironment();
    this._startAmbientAudio();

    // Ensure scene background is set
    if (this.scene && !this.scene.background) {
      this.scene.background = new THREE.Color(0x020604);
    }
    if (this.scene && !this.scene.fog) {
      this.scene.fog = new THREE.FogExp2(0x020604, 0.003);
    }

    // Fade in from black
    this.overlayEl.style.opacity = "0";
    requestAnimationFrame(() => {
      this.overlayEl.style.opacity = "1";
    });
  }

  _createOverlay() {
    this.overlayEl = document.createElement("div");
    this.overlayEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 500;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 2s ease;
    `;

    this.textEl = document.createElement("div");
    this.textEl.style.cssText = `
      font-family: 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-weight: 300;
      font-size: clamp(1.2rem, 3.5vw, 2.2rem);
      color: rgba(255, 252, 245, 0.9);
      text-align: center;
      letter-spacing: 0.08em;
      line-height: 1.6;
      opacity: 0;
      transition: opacity 1.5s ease;
      max-width: 80vw;
      text-shadow: 0 0 30px rgba(255,255,255,0.1);
    `;
    this.overlayEl.appendChild(this.textEl);
    document.body.appendChild(this.overlayEl);

    // Inject fade-to-black layer (used before cute background appears)
    this.fadeLayer = document.createElement("div");
    this.fadeLayer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: black; pointer-events: none; z-index: 600;
      opacity: 0; transition: opacity 3s ease;
    `;
    document.body.appendChild(this.fadeLayer);
  }

  /** Create pastel background for the ending */
  _showCuteBackground() {
    if (this.cuteShown) return;
    this.cuteShown = true;

    // Fade the Three.js canvas to black first
    this.fadeLayer.style.opacity = "1";

    setTimeout(() => {
      // Create cute overlay ON TOP of the fade layer
      this.cuteOverlay = document.createElement("div");
      this.cuteOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 700;
        background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 25%, #e8eaf6 50%, #fce4ec 75%, #fff3e0 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        opacity: 0;
        transition: opacity 2s ease;
        overflow: hidden;
      `;

      // Floating CSS sparkles
      const sparklesHTML = this._generateFloatingSparklesCSS();
      this.cuteOverlay.innerHTML = sparklesHTML;

      // Text container -- centered on top of sparkles
      this.cuteTextEl = document.createElement("div");
      this.cuteTextEl.style.cssText = `
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Playfair Display', 'Georgia', serif;
        font-size: clamp(1.8rem, 5vw, 3.5rem);
        color: #5d4037;
        text-align: center;
        letter-spacing: 0.06em;
        line-height: 1.5;
        opacity: 0;
        transition: opacity 2s ease;
        max-width: 85vw;
        text-shadow: 0 2px 15px rgba(255,182,193,0.3);
        z-index: 10;
      `;
      this.cuteOverlay.appendChild(this.cuteTextEl);

      document.body.appendChild(this.cuteOverlay);

      // Move the text element to use cuteTextEl instead
      this.textEl.style.opacity = "0";

      requestAnimationFrame(() => {
        this.cuteOverlay.style.opacity = "1";
      });
    }, 2500);
  }

  _generateFloatingSparklesCSS() {
    let html = '<style>';
    html += `
      @keyframes floatUp {
        0% { transform: translateY(100vh) rotate(0deg) scale(0.5); opacity: 0; }
        10% { opacity: 0.6; }
        90% { opacity: 0.4; }
        100% { transform: translateY(-20vh) rotate(360deg) scale(1.2); opacity: 0; }
      }
      @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      @keyframes twinkle { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
    `;

    const sparkleColors = ['#ffd700', '#a6c1ee', '#fbc2eb', '#c4b5fd', '#fad0c4', '#ffecd2', '#87ceeb', '#dda0dd'];
    const sparkleSymbols = ['\u2728', '\u2B50', '\u2726', '\u2734', '\u2733', '\u2727', '\u2605', '\u2736'];

    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 8 + Math.random() * 6;
      const size = 1 + Math.random() * 2;
      html += `
        .cute-float-${i} {
          position: absolute;
          left: ${left}%;
          bottom: -5%;
          font-size: ${size}rem;
          color: ${sparkleColors[i % sparkleColors.length]};
          animation: floatUp ${duration}s ${delay}s ease-in-out infinite;
          pointer-events: none;
          opacity: 0;
        }
      `;
    }

    for (let i = 0; i < 15; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 3;
      html += `
        .cute-sparkle-${i} {
          position: absolute;
          left: ${left}%;
          top: ${top}%;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(255,215,0,0.5);
          animation: twinkle ${1.5 + Math.random() * 2}s ${delay}s ease-in-out infinite;
          pointer-events: none;
        }
      `;
    }

    html += '</style>';

    for (let i = 0; i < 20; i++) {
      html += `<span class="cute-float-${i}">${sparkleSymbols[i % sparkleSymbols.length]}</span>`;
    }

    for (let i = 0; i < 15; i++) {
      html += `<div class="cute-sparkle-${i}"></div>`;
    }

    return html;
  }

  _showRideAgainButton() {
    if (!this.cuteOverlay) return;

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText = `
      position: absolute;
      bottom: 15%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      opacity: 0;
      transition: opacity 2s ease;
    `;

    const btn = document.createElement("button");
    btn.textContent = "Ride Again";
    btn.style.cssText = `
      font-family: 'Playfair Display', 'Georgia', serif;
      font-size: clamp(1rem, 2.5vw, 1.4rem);
      padding: 16px 52px;
      border: 2px solid rgba(189,147,249,0.5);
      background: rgba(255,255,255,0.3);
      color: #5d4037;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 0.12em;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(255,182,193,0.3);
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255,182,193,0.4)";
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow = "0 6px 30px rgba(255,182,193,0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255,255,255,0.3)";
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 20px rgba(255,182,193,0.3)";
    });
    btn.addEventListener("click", () => {
      // Loop back to start
      window.location.href = this._redirectUrl || "/";
    });

    btnContainer.appendChild(btn);

    this.cuteOverlay.appendChild(btnContainer);

    setTimeout(() => { btnContainer.style.opacity = "1"; }, 500);
  }

  _createVoidEnvironment() {
    // Stars that appear very slowly
    const starCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 100 + Math.random() * 400;
      positions.push(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.sin(phi) * Math.sin(theta) * r + 50,
        -1500 - Math.random() * 400
      );
      const brightness = 0.3 + Math.random() * 0.7;
      colors.push(brightness, brightness, brightness * 0.95);
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.epilogueGroup.add(this.stars);

    // Golden light that appears near the end
    this.goldenLight = new THREE.PointLight(0xffd700, 0, 200);
    this.goldenLight.position.set(0, 20, -1800);
    this.epilogueGroup.add(this.goldenLight);

    // Golden glow sphere
    this.goldenGlow = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      })
    );
    this.goldenGlow.position.set(0, 15, -1850);
    this.epilogueGroup.add(this.goldenGlow);

    this.scene.add(this.epilogueGroup);
  }

  _startAmbientAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.06, now + 4);
    masterGain.connect(ctx.destination);
    this._masterGain = masterGain;

    const padFreqs = [130.81, 164.81, 196, 246.94, 329.63];
    padFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.3;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.5 + Math.random() * 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      lfo.start(now);
      this.audioNodes.push(osc, lfo);
    });

    // Subtle wind noise
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 60, ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windData.length; i++) {
      windData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 400;
    windFilter.Q.value = 1;

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.02, now + 5);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start(now);
    this._windGain = windGain;
    this.audioNodes.push(windSource);
  }

  _playChime() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const freq = 800 + Math.random() * 400;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.5);
  }

  update(delta) {
    if (!this.active) return;


    this.elapsed += delta;
    this.beatTimer += delta;

    // Determine current beat
    let accumulated = 0;
    let newBeat = -1;
    for (let i = 0; i < this.textBeats.length; i++) {
      accumulated += this.textBeats[i].duration;
      if (this.elapsed < accumulated) {
        newBeat = i;
        break;
      }
    }

    // If we've passed all beats, end sequence
    if (newBeat === -1) {
      this._endSequence();
      return;
    }

    // Beat changed
    if (newBeat !== this.currentBeat) {
      this.currentBeat = newBeat;
      const beat = this.textBeats[newBeat];


      // If this beat has 'cute' flag, show the cute background
      if (beat.cute && !this.cuteShown) {
        this._showCuteBackground();
      }

      // Determine which text element to use
      const usesCuteText = beat.cute && this.cuteTextEl;

      if (usesCuteText) {
        // Fade out the 3D overlay text
        this.textEl.style.opacity = "0";

        // Show text on cute background
        this.cuteTextEl.style.opacity = "0";
        setTimeout(() => {
          if (beat.text) {
            this.cuteTextEl.textContent = beat.text;
            this.cuteTextEl.style.opacity = "1";
            this._playChime();
          } else {
            this.cuteTextEl.textContent = "";
          }
        }, 800);
      } else {
        // Normal 3D overlay text
        this.textEl.style.opacity = "0";

        setTimeout(() => {
          if (beat.text) {
            this.textEl.textContent = beat.text;
            this.textEl.style.color = beat.faint
              ? "rgba(255, 252, 245, 0.35)"
              : "rgba(255, 252, 245, 0.9)";
            this.textEl.style.fontSize = beat.faint
              ? "clamp(0.9rem, 2.5vw, 1.5rem)"
              : "clamp(1.2rem, 3.5vw, 2.2rem)";
            this.textEl.style.opacity = "1";
            this._playChime();
          }
        }, 800);
      }

      // Musical swell for "One year down."
      if (beat.swell && this._masterGain && this.audioCtx) {
        this._masterGain.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 3);
      }
    }

    // Animate environment (only when cute bg isn't shown yet)
    if (!this.cuteShown) {
      this._updateVoidEnvironment();
    }
  }

  _updateVoidEnvironment() {
    const t = this.elapsed;
    const totalDuration = this.textBeats.reduce((s, b) => s + b.duration, 0);
    const progress = Math.min(t / totalDuration, 1);

    // Background gradient: dark green -> navy -> black
    const bgColor = new THREE.Color();
    if (progress < 0.3) {
      bgColor.setRGB(0.02, 0.06 * (1 - progress / 0.3), 0.04);
    } else if (progress < 0.7) {
      const p = (progress - 0.3) / 0.4;
      bgColor.setRGB(0.01, 0.02 * (1 - p), 0.06 * (1 - p));
    } else {
      bgColor.setRGB(0, 0, 0);
    }
    
    // Ensure scene background exists and is a Color
    if (this.scene && this.scene.background && this.scene.background.lerp) {
      this.scene.background.lerp(bgColor, 0.03);
    } else if (this.scene) {
      this.scene.background = bgColor.clone();
    }
    
    // Ensure fog exists
    if (this.scene && this.scene.fog && this.scene.fog.color && this.scene.fog.color.lerp) {
      this.scene.fog.color.lerp(bgColor, 0.03);
      this.scene.fog.density += (0.002 - this.scene.fog.density) * 0.02;
    }

    // Stars fade in
    if (this.stars) {
      const targetStarOpacity = Math.min(progress * 1.5, 0.8);
      this.stars.material.opacity += (targetStarOpacity - this.stars.material.opacity) * 0.01;

      const beat = this.textBeats[this.currentBeat];
      if (beat && beat.starsBrighter) {
        this.stars.material.opacity += (1.0 - this.stars.material.opacity) * 0.02;
      }
    }

    // Golden light for golden beats
    const beat = this.textBeats[this.currentBeat];
    if (beat && beat.golden) {
      if (this.goldenLight) this.goldenLight.intensity += (3 - this.goldenLight.intensity) * 0.01;
      if (this.goldenGlow) this.goldenGlow.material.opacity += (0.4 - this.goldenGlow.material.opacity) * 0.01;
    } else if (beat && beat.lightUp) {
      if (this.goldenLight) this.goldenLight.intensity += (0.5 - this.goldenLight.intensity) * 0.005;
    }
  }

  _endSequence() {
    if (this._ended) return;
    this._ended = true;

    // Fade texts
    if (this.textEl) this.textEl.style.opacity = "0";
    if (this.cuteTextEl) this.cuteTextEl.style.opacity = "0";

    // Fade music out
    if (this._masterGain && this.audioCtx) {
      this._masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 4);
    }
    if (this._windGain && this.audioCtx) {
      this._windGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 4);
    }

    // Show "Ride Again" button after a moment
    setTimeout(() => {
      this._showRideAgainButton();
    }, 2000);

    // Stop audio after some time
    setTimeout(() => {
      this.audioNodes.forEach((node) => {
        try { node.stop(); } catch (e) { /* already stopped */ }
      });
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => { });
      }
      this.active = false;
    }, 8000);
  }

  /** Clean up */
  dispose() {
    this.active = false;
    if (this._standaloneAnimId) {
      cancelAnimationFrame(this._standaloneAnimId);
      this._standaloneAnimId = null;
    }
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    if (this.fadeLayer && this.fadeLayer.parentNode) {
      this.fadeLayer.parentNode.removeChild(this.fadeLayer);
    }
    if (this.cuteOverlay && this.cuteOverlay.parentNode) {
      this.cuteOverlay.parentNode.removeChild(this.cuteOverlay);
    }
    if (this.epilogueGroup && this.scene) {
      this.scene.remove(this.epilogueGroup);
    }
    this.audioNodes.forEach((node) => {
      try { node.stop(); } catch (e) { /* ok */ }
    });
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => { });
    }
    // Clean up standalone renderer
    if (this._standaloneResizeHandler) {
      window.removeEventListener("resize", this._standaloneResizeHandler);
      this._standaloneResizeHandler = null;
    }
    if (this._standaloneRenderer) {
      this._standaloneRenderer.dispose();
      if (this._standaloneRenderer.domElement.parentNode) {
        this._standaloneRenderer.domElement.parentNode.removeChild(this._standaloneRenderer.domElement);
      }
      this._standaloneRenderer = null;
    }
  }

  /**
   * Create and run the epilogue as a standalone experience.
   * Creates its own Three.js scene, camera, and renderer — no external dependencies needed.
   * @param {HTMLElement} container - DOM element to render into
   * @param {object} [options]
   * @param {string} [options.redirectUrl="/"] - Where "Ride Again" navigates to
   * @returns {EpilogueSequence} The running epilogue instance
   */
  static createStandalone(container, options = {}) {
    const redirectUrl = options.redirectUrl || "/";

    // Create minimal Three.js context
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020604);
    scene.fog = new THREE.FogExp2(0x020604, 0.003);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 10, -100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Style the canvas to fill the container
    renderer.domElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
    `;
    
    container.appendChild(renderer.domElement);

    // Create epilogue instance
    const epilogue = new EpilogueSequence(container, scene, camera, renderer, null, {});
    epilogue._standaloneRenderer = renderer;
    epilogue._redirectUrl = redirectUrl;

    // Handle resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);
    epilogue._standaloneResizeHandler = onResize;

    // Start the epilogue
    epilogue.start();

    // Run animation loop
    const clock = new THREE.Clock();
    clock.start(); // Start the clock before the animation loop
    const animate = () => {
      if (!epilogue.active && epilogue._ended) {
        // Keep rendering for the cute overlay to remain visible
        renderer.render(scene, camera);
        epilogue._standaloneAnimId = requestAnimationFrame(animate);
        return;
      }
      const delta = Math.min(clock.getDelta(), 0.05);
      epilogue.update(delta);
      renderer.render(scene, camera);
      epilogue._standaloneAnimId = requestAnimationFrame(animate);
    };
    epilogue._standaloneAnimId = requestAnimationFrame(animate);

    return epilogue;
  }
}
