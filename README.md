# 🐉 How To Save Your Dragon

> An immersive 3D dragon flight experience through six themed realms inspired by *How to Train Your Dragon* — featuring aerial combat, mini-games, boss fights, and a cinematic epilogue.

**▶ Play Now — Live Demo**
[https://how-to-save-your-dragon.vercel.app/](https://how-to-save-your-dragon.vercel.app/)

---

## 📸 Screenshots

|                                           Landing Page                                           |                                           Dragon Flight                                           |
| :----------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------: |
| ![Landing Page](https://github.com/user-attachments/assets/9b61f6e1-de48-4947-924f-0000fb568cbe) | ![Dragon Flight](https://github.com/user-attachments/assets/5341138f-9bf9-4ac6-956c-d75589c126a1) |

|                                           Circuit Puzzle                                           |                                        Mini-Game: Siege                                        |
| :------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------: |
| ![Circuit Puzzle](https://github.com/user-attachments/assets/ea33ed1a-f6a7-42f1-aab5-a2df28d52cd3) | ![Siege Game](https://github.com/user-attachments/assets/44d2cf21-d581-4943-a4c6-476d3758e04e) |

|                                    Boss Fight: Bewilderbeast                                   |
| :--------------------------------------------------------------------------------------------: |
| ![Boss Fight](https://github.com/user-attachments/assets/476efbb2-43c4-4353-bc61-3a591e771bcb) |

---

## 🎮 Overview

**How To Save Your Dragon** is a fully browser-based 3D experience built with Next.js and Three.js. You ride Toothless the Night Fury through six dragon realms on an epic roller-coaster flight, battling enemies, solving quizzes, and ultimately facing the Bewilderbeast in an intense 3D aerial boss fight — all rendered in real-time with procedurally generated textures and audio.

### Key Highlights

* Six unique themed realms — from Berk Village to the Red Death's Lair
* Free-flight dragon controls — WASD + mouse with banking, boost, and barrel rolls
* Fire hoop gates — fly through hoops at realm boundaries for a score boost
* Interactive mini-games — a top-down pixel adventure siege game
* Epic 3D boss fight — Toothless vs the Bewilderbeast with 4 phases and 12+ attack patterns
* Cinematic epilogue — poetic text-beat finale with starfield and ambient audio
* Zero external environment assets — textures, audio, and effects are procedurally generated
* Themed 404 page — even getting lost feels on-brand

---

## 🗺️ The Six Realms

| # | Realm                     | Theme                                                                 |
| - | ------------------------- | --------------------------------------------------------------------- |
| 1 | **Berk Village**          | Viking huts, glowing torches, docks, green hills, and ocean           |
| 2 | **The Cove**              | Hidden lake, rocky cliffs, waterfalls, bioluminescent plants          |
| 3 | **Dragon Training Arena** | Stone arena with shields, weapons, iron chains                        |
| 4 | **Cloud Kingdom**         | Soaring above clouds, golden sun rays, floating islands, rainbow arcs |
| 5 | **Volcanic Nest**         | Dark volcanic island, lava rivers, dragon nests, ember particles      |
| 6 | **The Red Death's Lair**  | Jagged rock pillars, ominous red sky, skulls, lightning               |

After completing all six realms:

Dragon Fall → Siege Mini-Game → Bewilderbeast Boss Fight → Cinematic Epilogue

---

## 🕹️ Controls

### Dragon Flight (Main Experience)

| Key       | Action            |
| --------- | ----------------- |
| `W` / `↑` | Pitch down (dive) |
| `S` / `↓` | Pitch up (climb)  |
| `A` / `←` | Bank left         |
| `D` / `→` | Bank right        |
| `Shift`   | Boost             |
| `Space`   | Ascend            |
| `Mouse`   | Look around       |
| `Esc`     | Pause menu        |

### Bewilderbeast Boss Fight (Pointer Lock)

| Key                 | Action                                       |
| ------------------- | -------------------------------------------- |
| `Mouse`             | Aim / look                                   |
| `Left Click`        | Plasma blast (hold to auto-fire)             |
| `Right Click` / `E` | Charged plasma blast (high damage, cooldown) |
| `W/A/S/D`           | Fly forward / strafe / backward              |
| `Space`             | Ascend                                       |
| `C`                 | Descend                                      |
| `Shift`             | Barrel-roll dodge (invincibility frames)     |
| `Q`                 | Summon allies (when Focus bar is full)       |
| `Esc`               | Pause                                        |

---

## 🏗️ Architecture

```
app/
├── page.js                  # Landing page
├── layout.js                # Root layout
├── not-found.js             # Themed 404 page
├── globals.css              # Global styles
├── experience/
│   └── page.js              # Dragon flight experience
└── final-game/
    └── page.js              # Boss fight → epilogue

lib/
├── engine/
│   ├── RollerCoasterEngine.js
│   ├── TrackBuilder.js
│   └── CameraController.js
├── areas/
│   ├── AreaBase.js
│   ├── AreaManager.js
│   └── Area1.js – Area6.js
├── quiz/
│   ├── QuizGateSystem.js
│   ├── GameManager.js
│   ├── quizData.js
│   ├── gameData.js
│   └── games/
│       ├── SiegeGame.js
│       └── DragonBossGame.js
├── bossfight/
│   └── BewilderbeastBossFight.js
├── epilogue/
│   └── EpilogueSequence.js
├── effects/
│   └── ParticleSystem.js
├── audio/
│   └── AudioManager.js
├── ui/
│   └── UIOverlay.js
└── utils/
    └── ProceduralTextures.js
```

---

## 🛠️ Tech Stack

| Technology       | Usage                              |
| ---------------- | ---------------------------------- |
| Next.js 16       | App Router, SSR/SSG                |
| React 19         | UI components and state            |
| Three.js 0.182   | 3D rendering and scene management  |
| Web Audio API    | Procedural sound synthesis         |
| Canvas2D         | Procedural textures and mini-games |
| Tailwind CSS 4   | Styling                            |
| Pointer Lock API | FPS-style controls                 |
| GLTF Loader      | 3D model loading                   |

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+
* npm, yarn, pnpm, or bun

### Installation

```bash
git clone https://github.com/durvibangera/how-to-save-your-dragon.git
cd how-to-save-your-dragon
npm install
```

### Development

```bash
npm run dev
```

Open:
[http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## 📁 Routes

| Route         | Description                      |
| ------------- | -------------------------------- |
| `/`           | Landing page                     |
| `/experience` | Dragon flight experience         |
| `/final-game` | Standalone boss fight → epilogue |

---

## 🎬 Game Flow

```
Landing Page
      │
      ▼
Dragon Flight (6 Realms)
      │
      ▼
Dragon Fall
      │
      ▼
Siege Mini-Game
      │
      ▼
Bewilderbeast Boss Fight
      │
      ▼
Epilogue Sequence
      │
      ▼
Ride Again → Landing Page
```

---

## ✨ Features In Detail

### Procedural Generation

All environment textures — grass, wood, stone, sand, clouds, lava, rock — are generated at runtime using Canvas2D. No external image assets are used for environments.

### Procedural Audio

All sound effects and ambient audio are synthesized using the Web Audio API, including:

* Boss impacts
* Quiz feedback
* Celebration tones
* Ambient pads
* Wind effects

### Bewilderbeast Boss Fight

* 4 escalating difficulty phases
* 12+ attack patterns (ice beams, shockwaves, minion swarms)
* Charged plasma blast system
* Barrel-roll dodge with invincibility frames
* Ally summoning (Stormfly & Astrid)
* Combo system with damage multiplier

### Epilogue Sequence

* Starfield void environment
* Poetic text beats
* Ambient pad and wind
* Golden light swell
* Pastel sparkle ending
* “Ride Again” restart button

---

## 🌐 Deployment

Deployed on Vercel:
[https://how-to-save-your-dragon.vercel.app/](https://how-to-save-your-dragon.vercel.app/)

To deploy your own instance:

1. Push to GitHub
2. Import into Vercel
3. Vercel auto-detects Next.js and deploys

---

## 📝 License

This project is for educational and entertainment purposes.

---

<p align="center">
  <em>Best experienced on desktop with sound on 🔊</em>
</p>
