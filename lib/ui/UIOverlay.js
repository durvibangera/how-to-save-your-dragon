/**
 * HTML/CSS overlay UI for the roller coaster experience.
 * Renders start screen, area titles, and final message.
 * All UI is DOM-based overlaid on the Three.js canvas.
 */
export class UIOverlay {
  constructor(container) {
    this.container = container;
    this.overlay = document.createElement("div");
    this.overlay.id = "ui-overlay";
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 2000;
      font-family: 'Georgia', 'Times New Roman', serif;
    `;
    document.body.appendChild(this.overlay);

    this._injectStyles();
  }

  _injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:wght@400;600&display=swap');

      #ui-overlay * {
        box-sizing: border-box;
      }

      .ui-start-screen {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url('/bg-image.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: all; z-index: 200;
        animation: fadeIn 1s ease;
      }

      .ui-start-content {
        position: absolute;
        top: 4rem;
        left: 3rem;
        max-width: 600px;
        text-align: left;
      }

      .ui-start-screen h1 {
        font-family: 'Cinzel', serif;
        font-size: clamp(2rem, 5vw, 4rem);
        color: #ffeaa7;
        font-weight: 900;
        margin-bottom: 0.5em;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .ui-start-screen p {
        font-family: 'Crimson Pro', serif;
        font-size: clamp(0.9rem, 2vw, 1.3rem);
        color: #f5f5f5;
        font-weight: 400;
        line-height: 1.7;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
        letter-spacing: 0.02em;
      }

      .ui-start-btn-wrapper {
        position: absolute;
        bottom: 3rem;
        left: 50%;
        transform: translateX(-50%);
      }

      .ui-start-btn {
        font-family: 'Cinzel', serif;
        font-size: clamp(1.1rem, 2.5vw, 1.4rem);
        font-weight: 700;
        padding: 18px 60px;
        border: 2px solid rgba(255,220,100,0.8);
        background: rgba(139,69,19,0.7);
        color: #ffeaa7;
        border-radius: 8px;
        cursor: pointer;
        pointer-events: all;
        transition: all 0.3s ease;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        backdrop-filter: blur(5px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
      }

      .ui-start-btn:hover {
        background: rgba(139,69,19,0.9);
        border-color: rgba(255,220,100,1);
        transform: scale(1.05);
        box-shadow: 0 8px 25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3);
      }

      .ui-loading-screen {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: all; z-index: 3000;
        animation: fadeIn 0.5s ease;
      }

      .ui-loading-text {
        font-family: 'Cinzel', serif;
        font-size: clamp(1.5rem, 4vw, 2.5rem);
        color: #ffeaa7;
        font-weight: 700;
        margin-bottom: 2rem;
        text-shadow: 0 0 20px rgba(255,234,167,0.5);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .ui-loading-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255,234,167,0.2);
        border-top: 4px solid #ffeaa7;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* ── Pause Menu ── */
      .ui-pause-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        pointer-events: all; z-index: 9000;
        animation: fadeIn 0.3s ease;
      }

      .ui-pause-panel {
        background: linear-gradient(145deg, rgba(30,20,10,0.95), rgba(15,10,5,0.98));
        border: 2px solid rgba(255,220,100,0.4);
        border-radius: 12px;
        padding: 2.5rem 3rem;
        min-width: 320px;
        text-align: center;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1);
      }

      .ui-pause-panel h2 {
        font-family: 'Cinzel', serif;
        font-size: 2rem;
        color: #ffeaa7;
        font-weight: 700;
        margin: 0 0 1.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-shadow: 0 0 15px rgba(255,234,167,0.4);
      }

      .ui-pause-btn {
        display: block;
        width: 100%;
        font-family: 'Cinzel', serif;
        font-size: 1.05rem;
        font-weight: 600;
        padding: 14px 20px;
        margin-bottom: 10px;
        border: 1px solid rgba(255,220,100,0.3);
        background: rgba(139,69,19,0.4);
        color: #ffeaa7;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.25s ease;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ui-pause-btn:hover {
        background: rgba(139,69,19,0.7);
        border-color: rgba(255,220,100,0.7);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      }

      .ui-pause-btn:last-child {
        margin-bottom: 0;
      }

      /* ── Chapter Select ── */
      .ui-chapter-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        pointer-events: all; z-index: 9500;
        animation: fadeIn 0.3s ease;
      }

      .ui-chapter-panel {
        background: linear-gradient(145deg, rgba(30,20,10,0.97), rgba(15,10,5,0.99));
        border: 2px solid rgba(255,220,100,0.4);
        border-radius: 12px;
        padding: 2rem 2.5rem;
        min-width: 420px;
        max-width: 600px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1);
        scrollbar-width: thin;
        scrollbar-color: rgba(139,69,19,0.8) rgba(30,20,10,0.4);
      }

      /* Custom scrollbar for webkit browsers (Chrome, Edge, Safari) */
      .ui-chapter-panel::-webkit-scrollbar {
        width: 10px;
      }

      .ui-chapter-panel::-webkit-scrollbar-track {
        background: rgba(30,20,10,0.4);
        border-radius: 6px;
      }

      .ui-chapter-panel::-webkit-scrollbar-thumb {
        background: rgba(139,69,19,0.8);
        border-radius: 6px;
        border: 2px solid rgba(30,20,10,0.4);
      }

      .ui-chapter-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(139,69,19,1);
      }

      .ui-chapter-panel h2 {
        font-family: 'Cinzel', serif;
        font-size: 1.8rem;
        color: #ffeaa7;
        font-weight: 700;
        text-align: center;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-shadow: 0 0 15px rgba(255,234,167,0.4);
      }

      .ui-chapter-section-title {
        font-family: 'Cinzel', serif;
        font-size: 0.85rem;
        color: rgba(255,234,167,0.5);
        text-transform: uppercase;
        letter-spacing: 0.15em;
        margin: 1.2rem 0 0.6rem 0;
        padding-bottom: 0.3rem;
        border-bottom: 1px solid rgba(255,220,100,0.15);
      }

      .ui-chapter-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        font-family: 'Cinzel', serif;
        font-size: 0.95rem;
        font-weight: 600;
        padding: 12px 16px;
        margin-bottom: 6px;
        border: 1px solid rgba(255,220,100,0.2);
        background: rgba(139,69,19,0.25);
        color: #ffeaa7;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.25s ease;
        text-align: left;
      }

      .ui-chapter-item:hover {
        background: rgba(139,69,19,0.55);
        border-color: rgba(255,220,100,0.5);
        transform: translateX(4px);
      }

      .ui-chapter-item .ch-icon {
        font-size: 1.3rem;
        flex-shrink: 0;
        width: 32px;
        text-align: center;
      }

      .ui-chapter-item .ch-info {
        flex: 1;
      }

      .ui-chapter-item .ch-name {
        display: block;
        margin-bottom: 2px;
      }

      .ui-chapter-item .ch-weapons {
        display: block;
        font-family: 'Crimson Pro', serif;
        font-size: 0.75rem;
        font-weight: 400;
        color: rgba(255,234,167,0.5);
        letter-spacing: 0.03em;
        text-transform: none;
      }

      .ui-chapter-back {
        display: block;
        width: 100%;
        font-family: 'Cinzel', serif;
        font-size: 0.95rem;
        font-weight: 600;
        padding: 12px 20px;
        margin-top: 1rem;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.7);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.25s ease;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-align: center;
      }

      .ui-chapter-back:hover {
        background: rgba(255,255,255,0.12);
        color: #fff;
      }

      .ui-area-title {
        position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
        font-family: 'Cinzel', serif;
        font-size: clamp(1.8rem, 5vw, 3rem);
        font-weight: 700;
        color: #ffeaa7;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0;
        animation: areaTitleAnim 4s ease forwards;
        pointer-events: none;
        text-align: center;
        white-space: nowrap;
      }

      .ui-finale {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at center, rgba(30,15,0,0.85) 0%, rgba(0,0,0,0.9) 100%);
        pointer-events: none; z-index: 200;
        animation: fadeIn 3s ease;
      }

      .ui-finale h1 {
        font-family: 'Cinzel', serif;
        font-size: clamp(2.5rem, 7vw, 4.5rem);
        font-weight: 900;
        color: #ffeaa7;
        text-shadow: 3px 3px 8px rgba(0,0,0,0.9), 0 0 40px rgba(255,215,0,0.5);
        margin-bottom: 0.3em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        animation: gentlePulse 2s ease-in-out infinite;
      }

      .ui-finale p {
        font-family: 'Crimson Pro', serif;
        font-size: clamp(1rem, 3vw, 1.6rem);
        color: rgba(255,240,200,0.9);
        font-weight: 400;
        font-style: italic;
        letter-spacing: 0.05em;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      }

      .ui-progress {
        position: fixed; bottom: 20px; left: 50%;
        transform: translateX(-50%);
        display: flex; gap: 8px;
        pointer-events: none;
        z-index: 150;
      }

      .ui-progress-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        transition: all 0.5s ease;
      }

      .ui-progress-dot.active {
        background: rgba(255,180,200,0.8);
        box-shadow: 0 0 10px rgba(255,180,200,0.5);
      }

      .ui-progress-dot.completed {
        background: rgba(180,255,180,0.6);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes areaTitleAnim {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        75% { opacity: 1; }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }

      @keyframes gentlePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03); }
      }
    `;
    document.head.appendChild(style);
    this._style = style;
  }

  showStartScreen(onStart) {
    const screen = document.createElement("div");
    screen.className = "ui-start-screen";
    screen.innerHTML = `
      <div class="ui-start-content">
        <h1>How To Save Your Dragon</h1>
        <p>Soar through the skies of Berk on the back of a Night Fury</p>
      </div>
      <div class="ui-start-btn-wrapper">
        <button class="ui-start-btn">Take Flight</button>
      </div>
    `;

    const btn = screen.querySelector(".ui-start-btn");
    btn.addEventListener("click", () => {
      screen.style.transition = "opacity 1.5s ease";
      screen.style.opacity = "0";
      setTimeout(() => {
        screen.remove();
        this._createProgressBar();
        onStart();
      }, 1500);
    });

    this.overlay.appendChild(screen);
  }

  _createProgressBar() {
    const bar = document.createElement("div");
    bar.className = "ui-progress";
    const dotTitles = ["Berk Village", "The Cove", "Training Arena", "Cloud Kingdom", "Volcanic Nest", "The Lair"];
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement("div");
      dot.className = "ui-progress-dot";
      if (i === 0) dot.classList.add("active");
      dot.title = dotTitles[i];
      bar.appendChild(dot);
    }
    this.overlay.appendChild(bar);
    this.progressBar = bar;
  }

  _updateProgressBar(areaIndex) {
    if (!this.progressBar) return;
    const dots = this.progressBar.querySelectorAll(".ui-progress-dot");
    dots.forEach((dot, i) => {
      dot.classList.remove("active");
      if (i < areaIndex) dot.classList.add("completed");
      if (i === areaIndex) dot.classList.add("active");
    });
  }

  showAreaTitle(areaIndex) {
    this._updateProgressBar(areaIndex);

    const titles = [
      "Berk Village",
      "The Cove",
      "Dragon Training Arena",
      "Cloud Kingdom",
      "Volcanic Nest",
      "The Dragon's Lair",
    ];

    // Remove previous title
    const prev = this.overlay.querySelector(".ui-area-title");
    if (prev) prev.remove();

    const title = document.createElement("div");
    title.className = "ui-area-title";
    title.textContent = titles[areaIndex] || "";
    this.overlay.appendChild(title);

    setTimeout(() => title.remove(), 4500);
  }

  showFinaleMessage() {
    const finale = document.createElement("div");
    finale.className = "ui-finale";
    finale.innerHTML = `
      <h1>What a ride!</h1>
      <p>Thanks for playing. ♾️</p>
    `;
    this.overlay.appendChild(finale);

    // Remove progress bar
    if (this.progressBar) {
      this.progressBar.style.transition = "opacity 1s ease";
      this.progressBar.style.opacity = "0";
      setTimeout(() => this.progressBar.remove(), 1000);
    }
  }

  hideProgressBar() {
    if (this.progressBar) {
      this.progressBar.style.transition = "opacity 1s ease";
      this.progressBar.style.opacity = "0";
      setTimeout(() => {
        if (this.progressBar && this.progressBar.parentNode) {
          this.progressBar.remove();
        }
      }, 1000);
    }
  }

  showLoadingScreen(message = "Loading Dragon...") {
    this.loadingScreen = document.createElement("div");
    this.loadingScreen.className = "ui-loading-screen";
    this.loadingScreen.innerHTML = `
      <div class="ui-loading-text">${message}</div>
      <div class="ui-loading-spinner"></div>
    `;
    document.body.appendChild(this.loadingScreen);
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.style.transition = "opacity 0.5s ease";
      this.loadingScreen.style.opacity = "0";
      setTimeout(() => {
        if (this.loadingScreen && this.loadingScreen.parentNode) {
          this.loadingScreen.remove();
          this.loadingScreen = null;
        }
      }, 500);
    }
  }

  // ─── PAUSE MENU ───────────────────────────────────────────────────
  showPauseMenu({ onResume, onRestart, onChapterSelect, onHome }) {
    this.hidePauseMenu(); // ensure no duplicate

    const overlay = document.createElement('div');
    overlay.className = 'ui-pause-overlay';
    overlay.innerHTML = `
      <div class="ui-pause-panel">
        <h2>Paused</h2>
        <button class="ui-pause-btn" data-action="resume">Resume</button>
        <button class="ui-pause-btn" data-action="chapter">Chapter Select</button>
        <button class="ui-pause-btn" data-action="restart">Restart</button>
        <button class="ui-pause-btn" data-action="home">Back to Home</button>
      </div>
    `;

    overlay.querySelector('[data-action="resume"]').addEventListener('click', () => {
      this.hidePauseMenu();
      if (onResume) onResume();
    });
    overlay.querySelector('[data-action="chapter"]').addEventListener('click', () => {
      this.hidePauseMenu();
      if (onChapterSelect) onChapterSelect();
    });
    overlay.querySelector('[data-action="restart"]').addEventListener('click', () => {
      this.hidePauseMenu();
      if (onRestart) onRestart();
    });
    overlay.querySelector('[data-action="home"]').addEventListener('click', () => {
      this.hidePauseMenu();
      if (onHome) onHome();
    });

    document.body.appendChild(overlay);
    this._pauseOverlay = overlay;
  }

  hidePauseMenu() {
    if (this._pauseOverlay) {
      this._pauseOverlay.remove();
      this._pauseOverlay = null;
    }
  }

  get isPauseVisible() {
    return !!this._pauseOverlay;
  }

  // ─── CHAPTER SELECT ───────────────────────────────────────────────
  showChapterSelect({ onSelect, onBack }) {
    this.hideChapterSelect();

    const flightChapters = [
      { id: 'area-0', icon: '🏘️', name: 'Berk Village', weapons: 'No weapons' },
      { id: 'area-1', icon: '🌿', name: 'The Cove', weapons: 'No weapons' },
      { id: 'area-2', icon: '⚔️', name: 'Dragon Training Arena', weapons: 'No weapons' },
      { id: 'area-3', icon: '☁️', name: 'Cloud Kingdom', weapons: 'No weapons' },
      { id: 'area-4', icon: '🌋', name: 'Volcanic Nest', weapons: 'No weapons' },
      { id: 'area-5', icon: '🐉', name: "The Dragon's Lair", weapons: 'No weapons' },
    ];

    const siegeChapters = [
      { id: 'siege-1',   icon: '🗡️', name: 'Berk Outskirts', weapons: 'Sword' },
      { id: 'siege-2',   icon: '🌲', name: 'Forbidden Forest', weapons: 'Sword, Bow, Spear' },
      { id: 'siege-2.5', icon: '🧩', name: 'Restore the Dragon Eye', weapons: 'Sword, Bow, Spear' },
      { id: 'siege-3',   icon: '🏝️', name: 'Dragon Island', weapons: 'Sword, Bow, Spear' },
      { id: 'siege-3.5', icon: '🔥', name: 'Gauntlet of Fire', weapons: 'Sword, Bow, Spear, Halberd' },
      { id: 'siege-4',   icon: '💀', name: "The Red Death's Nest", weapons: 'All Weapons' },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'ui-chapter-overlay';

    let html = '<div class="ui-chapter-panel">';
    html += '<h2>Chapter Select</h2>';

    html += '<div class="ui-chapter-section-title">Dragon Flight</div>';
    flightChapters.forEach(ch => {
      html += `<button class="ui-chapter-item" data-chapter="${ch.id}">
        <span class="ch-icon">${ch.icon}</span>
        <span class="ch-info">
          <span class="ch-name">${ch.name}</span>
          <span class="ch-weapons">${ch.weapons}</span>
        </span>
      </button>`;
    });

    html += '<div class="ui-chapter-section-title">Siege Battle</div>';
    siegeChapters.forEach(ch => {
      html += `<button class="ui-chapter-item" data-chapter="${ch.id}">
        <span class="ch-icon">${ch.icon}</span>
        <span class="ch-info">
          <span class="ch-name">${ch.name}</span>
          <span class="ch-weapons">${ch.weapons}</span>
        </span>
      </button>`;
    });

    html += '<div class="ui-chapter-section-title">Final Game</div>';
    html += `<button class="ui-chapter-item" data-chapter="bewilderbeast">
      <span class="ch-icon">🐲</span>
      <span class="ch-info">
        <span class="ch-name">Bewilderbeast Boss Fight</span>
        <span class="ch-weapons">Toothless vs The Tyrant</span>
      </span>
    </button>`;

    html += '<button class="ui-chapter-back" data-action="back">Back</button>';
    html += '</div>';
    overlay.innerHTML = html;

    overlay.querySelectorAll('.ui-chapter-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const chapterId = btn.getAttribute('data-chapter');
        this.hideChapterSelect();
        if (onSelect) onSelect(chapterId);
      });
    });

    overlay.querySelector('[data-action="back"]').addEventListener('click', () => {
      this.hideChapterSelect();
      if (onBack) onBack();
    });

    document.body.appendChild(overlay);
    this._chapterOverlay = overlay;
  }

  hideChapterSelect() {
    if (this._chapterOverlay) {
      this._chapterOverlay.remove();
      this._chapterOverlay = null;
    }
  }

  get isChapterVisible() {
    return !!this._chapterOverlay;
  }

  dispose() {
    this.hidePauseMenu();
    this.hideChapterSelect();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this._style && this._style.parentNode) {
      this._style.parentNode.removeChild(this._style);
    }
  }
}
