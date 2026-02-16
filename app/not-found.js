"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
    const [floaters, setFloaters] = useState([]);

    // Generate floating dragon-themed items on mount
    useEffect(() => {
        const newFloaters = [];
        const emojis = ['🐉', '🔥', '⚔️', '🛡️', '⛰️', '☁️', '🌋'];

        for (let i = 0; i < 25; i++) {
            newFloaters.push({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 5,
                duration: 12 + Math.random() * 8,
                size: 1.2 + Math.random() * 1.8,
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                opacity: 0.3 + Math.random() * 0.4
            });
        }
        setFloaters(newFloaters);
    }, []);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes floatUp {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; }
                }
                @keyframes gradientBG {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes dragonGlow {
                    0%, 100% { text-shadow: 0 0 20px rgba(255, 68, 0, 0.6), 0 0 40px rgba(255, 68, 0, 0.3); }
                    50% { text-shadow: 0 0 30px rgba(255, 68, 0, 0.8), 0 0 60px rgba(255, 68, 0, 0.5); }
                }
            `}} />

            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 25%, #2a1500 50%, #1a0a00 75%, #000000 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradientBG 20s ease infinite',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontFamily: "'Georgia', serif",
                color: '#ffddaa'
            }}>

                {/* Floating Background Items */}
                {floaters.map(h => (
                    <div key={h.id} style={{
                        position: 'absolute',
                        left: `${h.left}%`,
                        bottom: '-10vh',
                        fontSize: `${h.size}rem`,
                        opacity: h.opacity,
                        animation: `floatUp ${h.duration}s ${h.delay}s linear infinite`,
                        pointerEvents: 'none',
                        zIndex: 1,
                        filter: 'drop-shadow(0 0 8px rgba(255, 120, 0, 0.4))'
                    }}>
                        {h.emoji}
                    </div>
                ))}

                {/* Main Card */}
                <div style={{
                    position: 'relative',
                    padding: 'clamp(30px, 5vw, 50px) clamp(40px, 7vw, 70px)',
                    background: 'linear-gradient(135deg, rgba(40, 20, 10, 0.85), rgba(20, 10, 5, 0.9))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 100, 0, 0.4)',
                    boxShadow: '0 0 60px rgba(255, 68, 0, 0.3), inset 0 0 40px rgba(0, 0, 0, 0.5)',
                    textAlign: 'center',
                    maxWidth: '90%',
                    width: '550px',
                    zIndex: 10
                }}>
                    <div style={{ 
                        fontSize: 'clamp(3rem, 8vw, 5rem)', 
                        marginBottom: '15px',
                        animation: 'dragonGlow 3s ease-in-out infinite'
                    }}>
                        🐉
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(3rem, 10vw, 5rem)',
                        margin: '0 0 10px 0',
                        background: 'linear-gradient(45deg, #ff4400, #ffaa00, #ff6600)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: 'bold',
                        textShadow: '0 0 20px rgba(255, 68, 0, 0.5)'
                    }}>404</h1>

                    <h2 style={{
                        fontSize: 'clamp(1.3rem, 4vw, 2rem)',
                        marginBottom: '20px',
                        fontWeight: 'normal',
                        color: '#ffddaa',
                        fontStyle: 'italic'
                    }}>
                        This Island Doesn't Exist on the Map!
                    </h2>

                    <p style={{
                        fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
                        lineHeight: '1.7',
                        marginBottom: '30px',
                        color: '#ccaa88',
                        maxWidth: '450px',
                        margin: '0 auto 30px'
                    }}>
                        Looks like you've flown off course, Viking. Even Toothless can't find this page. Let's get you back to Berk!
                    </p>

                    <Link href="/" style={{
                        display: 'inline-block',
                        padding: 'clamp(12px, 2.5vw, 16px) clamp(28px, 5vw, 40px)',
                        background: 'linear-gradient(135deg, #ff4400, #ff6600)',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '50px',
                        fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 20px rgba(255, 68, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.05em',
                        border: '1px solid rgba(255, 100, 0, 0.6)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 6px 30px rgba(255, 68, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #ff5500, #ff7700)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 68, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #ff4400, #ff6600)';
                        }}
                    >
                        ⚔️ Return to Berk
                    </Link>

                    {/* Viking decoration */}
                    <div style={{
                        marginTop: '25px',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(255, 100, 0, 0.2)',
                        fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                        color: '#aa8866',
                        fontStyle: 'italic'
                    }}>
                        "A dragon and its rider... always find their way home."
                    </div>
                </div>

                {/* Corner dragon silhouette */}
                <div style={{
                    position: 'absolute',
                    bottom: '-50px',
                    right: '-50px',
                    fontSize: '15rem',
                    opacity: 0.08,
                    transform: 'rotate(-15deg)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}>
                    🐉
                </div>
            </div>
        </>
    );
}
