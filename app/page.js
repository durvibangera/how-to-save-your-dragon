"use client";

import { useRef, useState } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartAdventure = async () => {
    setGameStarted(true);
    
    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const { RollerCoasterEngine } = await import("../lib/engine/RollerCoasterEngine");
    if (!containerRef.current) return;
    
    const engine = new RollerCoasterEngine(containerRef.current);
    engineRef.current = engine;
    
    engine.start();
  };

  return (
    <>
      {/* Landing page */}
      {!gameStarted && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            backgroundImage: "url('/bg-image.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            fontFamily: "'Cinzel', 'Trajan Pro', serif",
            color: "#ffffff",
          }}
        >
      {/* Text content on the left */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "4rem 2rem 2rem 3rem",
          maxWidth: "600px",
          textAlign: "left",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 900,
            marginBottom: "0.5em",
            textShadow: "3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#ffeaa7",
          }}
        >
          How To Save Your Dragon
        </h1>
        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
            color: "#f5f5f5",
            fontWeight: 400,
            lineHeight: 1.7,
            textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.02em",
          }}
        >
          A ride of dragon adventure.
          <br />
          <span style={{ fontSize: "0.85em", opacity: 0.8 }}>
            Best experienced on desktop with sound on.
          </span>
        </p>
      </div>
      
      {/* Button at bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: "3rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
        }}
      >
        <button
          onClick={handleStartAdventure}
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            padding: "18px 60px",
            border: "2px solid rgba(255,220,100,0.8)",
            background: "rgba(139,69,19,0.7)",
            color: "#ffeaa7",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            letterSpacing: "0.15em",
            fontFamily: "'Cinzel', 'Trajan Pro', serif",
            fontWeight: 700,
            textTransform: "uppercase",
            backdropFilter: "blur(5px)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          Start the Adventure
        </button>
      </div>
        </div>
      )}
      
      {/* Game container */}
      {gameStarted && (
        <div
          ref={containerRef}
          id="experience-container"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            background: "#000",
          }}
        />
      )}
    </>
  );
}
