"use client";

import { useEffect, useRef } from "react";
import { BewilderbeastBossFight } from "../../lib/bossfight/BewilderbeastBossFight";

export default function FinalGamePage() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const showEpilogue = () => {
      if (!mounted || !containerRef.current) return;

      // Clear container
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }

      // Remove any boss fight overlays
      const bfEnd = document.getElementById("bf-end");
      if (bfEnd && bfEnd.parentNode) bfEnd.parentNode.removeChild(bfEnd);

      // Create ambient victory music using Web Audio API
      let audioCtx = null;
      let masterGain = null;
      const audioNodes = [];

      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;

        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.15, now + 3);
        masterGain.connect(audioCtx.destination);

        // Victory chord progression (C major -> G major -> Am -> F major)
        const chords = [
          [261.63, 329.63, 392.00], // C major
          [392.00, 493.88, 587.33], // G major
          [220.00, 261.63, 329.63], // A minor
          [174.61, 220.00, 261.63], // F major
        ];

        let chordIndex = 0;
        const playChord = () => {
          if (!audioCtx || audioCtx.state === 'closed') return;
          
          const chord = chords[chordIndex % chords.length];
          const startTime = audioCtx.currentTime;

          chord.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;

            const oscGain = audioCtx.createGain();
            oscGain.gain.setValueAtTime(0, startTime);
            oscGain.gain.linearRampToValueAtTime(0.08, startTime + 0.3);
            oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 4);

            osc.connect(oscGain);
            oscGain.connect(masterGain);

            osc.start(startTime);
            osc.stop(startTime + 4.5);
            audioNodes.push(osc);
          });

          chordIndex++;
          if (chordIndex < 16) {
            setTimeout(playChord, 3500);
          }
        };

        playChord();

        // Soft pad layer
        const padFreqs = [130.81, 164.81, 196.00, 246.94];
        padFreqs.forEach((freq) => {
          const osc = audioCtx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;

          const oscGain = audioCtx.createGain();
          oscGain.gain.value = 0.04;

          const lfo = audioCtx.createOscillator();
          lfo.type = "sine";
          lfo.frequency.value = 0.3 + Math.random() * 0.2;
          const lfoGain = audioCtx.createGain();
          lfoGain.gain.value = 1.5;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);

          osc.connect(oscGain);
          oscGain.connect(masterGain);

          osc.start(now);
          lfo.start(now);
          audioNodes.push(osc, lfo);
        });

        // Gentle bell-like tones
        const bellTimes = [2, 5, 8, 11, 14, 17, 20];
        bellTimes.forEach((time) => {
          setTimeout(() => {
            if (!audioCtx || audioCtx.state === 'closed') return;
            const freq = 523.25 + Math.random() * 200; // C5 and above
            const osc = audioCtx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;

            const gain = audioCtx.createGain();
            const startTime = audioCtx.currentTime;
            gain.gain.setValueAtTime(0.06, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 3);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(startTime);
            osc.stop(startTime + 3.5);
          }, time * 1000);
        });

        // Fade out music before button appears
        setTimeout(() => {
          if (masterGain && audioCtx && audioCtx.state !== 'closed') {
            masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4);
          }
        }, 16000);

        // Clean up audio after epilogue
        setTimeout(() => {
          audioNodes.forEach((node) => {
            try { node.stop(); } catch (e) { /* already stopped */ }
          });
          if (audioCtx) {
            audioCtx.close().catch(() => {});
          }
        }, 25000);
      } catch (e) {
        console.warn("Audio context not available:", e);
      }

      // Create simple epilogue overlay
      const epilogueDiv = document.createElement("div");
      epilogueDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 1.5s ease;
      `;

      const textContainer = document.createElement("div");
      textContainer.style.cssText = `
        text-align: center;
        max-width: 800px;
        padding: 2rem;
      `;

      const messages = [
        { text: "Victory!", size: "clamp(2.5rem, 6vw, 4rem)", delay: 0, duration: 3000 },
        { text: "The Bewilderbeast has been defeated.", size: "clamp(1.2rem, 3vw, 2rem)", delay: 3000, duration: 4000 },
        { text: "Toothless is now the Alpha Dragon.", size: "clamp(1.2rem, 3vw, 2rem)", delay: 7000, duration: 4000 },
        { text: "The journey was legendary.", size: "clamp(1rem, 2.5vw, 1.5rem)", delay: 11000, duration: 4000 },
        { text: "Thanks for playing!", size: "clamp(1.5rem, 4vw, 2.5rem)", delay: 15000, duration: 3000 },
      ];

      let currentIndex = 0;
      const textEl = document.createElement("div");
      textEl.style.cssText = `
        font-family: 'Cinzel', serif;
        color: #ffeaa7;
        text-shadow: 0 0 20px rgba(255, 234, 167, 0.5), 3px 3px 6px rgba(0, 0, 0, 0.9);
        letter-spacing: 0.05em;
        opacity: 0;
        transition: opacity 1s ease;
        margin-bottom: 2rem;
      `;

      const showNextMessage = () => {
        if (currentIndex >= messages.length) {
          // Show button after all messages
          setTimeout(() => {
            const btn = document.createElement("button");
            btn.textContent = "Return to Start";
            btn.style.cssText = `
              font-family: 'Cinzel', serif;
              font-size: clamp(1rem, 2.5vw, 1.4rem);
              padding: 16px 52px;
              border: 2px solid rgba(255, 234, 167, 0.8);
              background: rgba(139, 69, 19, 0.7);
              color: #ffeaa7;
              border-radius: 50px;
              cursor: pointer;
              transition: all 0.3s ease;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              backdrop-filter: blur(10px);
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
              opacity: 0;
              transition: opacity 1s ease, transform 0.3s ease, background 0.3s ease;
            `;
            btn.addEventListener("mouseenter", () => {
              btn.style.background = "rgba(255, 182, 193, 0.4)";
              btn.style.transform = "scale(1.05)";
            });
            btn.addEventListener("mouseleave", () => {
              btn.style.background = "rgba(139, 69, 19, 0.7)";
              btn.style.transform = "scale(1)";
            });
            btn.addEventListener("click", () => {
              window.location.href = "/";
            });
            textContainer.appendChild(btn);
            setTimeout(() => { btn.style.opacity = "1"; }, 100);
          }, 1000);
          return;
        }

        const msg = messages[currentIndex];
        textEl.style.fontSize = msg.size;
        textEl.style.opacity = "0";
        
        setTimeout(() => {
          textEl.textContent = msg.text;
          textEl.style.opacity = "1";
          
          setTimeout(() => {
            textEl.style.opacity = "0";
            setTimeout(() => {
              currentIndex++;
              showNextMessage();
            }, 1000);
          }, msg.duration);
        }, msg.delay - (currentIndex > 0 ? messages[currentIndex - 1].delay + messages[currentIndex - 1].duration + 1000 : 0));
      };

      textContainer.appendChild(textEl);
      epilogueDiv.appendChild(textContainer);
      containerRef.current.appendChild(epilogueDiv);

      // Fade in
      setTimeout(() => { epilogueDiv.style.opacity = "1"; }, 100);
      
      // Start showing messages
      showNextMessage();
    };

    const timer = setTimeout(() => {
      if (!mounted || !containerRef.current) return;

      const game = new BewilderbeastBossFight(containerRef.current, (success) => {
        if (success && mounted) {
          setTimeout(() => {
            if (!mounted) return;
            if (gameRef.current) {
              gameRef.current.dispose();
              gameRef.current = null;
            }
            showEpilogue();
          }, 4000);
        }
      });

      gameRef.current = game;
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#060614",
        zIndex: 9999,
      }}
    />
  );
}
