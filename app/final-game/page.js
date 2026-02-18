"use client";

import { useEffect, useRef } from "react";
import { BewilderbeastBossFight } from "../../lib/bossfight/BewilderbeastBossFight";

export default function FinalGamePage() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (!mounted || !containerRef.current) return;

      const game = new BewilderbeastBossFight(containerRef.current, (success) => {
        console.log("Boss fight completed. Victory:", success);
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
