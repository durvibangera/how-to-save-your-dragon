import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #1a0a1e 0%, #050008 100%)",
        fontFamily: "'Georgia', serif",
        color: "#ffd6e0",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2.5rem, 6vw, 4rem)",
          fontWeight: 600,
          marginBottom: "0.5em",
          textShadow: "0 0 40px rgba(255,180,200,0.3)",
          letterSpacing: "0.03em",
        }}
      >
        How To Game Your Dragon
      </h1>
      <p
        style={{
          fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
          color: "rgba(255,200,220,0.7)",
          marginBottom: "2.5em",
          fontWeight: 300,
          maxWidth: "400px",
          lineHeight: 1.6,
        }}
      >
        A ride of dragon adventure.
        <br />
        <span style={{ fontSize: "0.85em", opacity: 0.6 }}>
          Best experienced on desktop with sound on.
        </span>
      </p>
      <Link
        href="/experience"
        style={{
          fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
          padding: "16px 52px",
          border: "1px solid rgba(255,180,200,0.4)",
          background: "rgba(255,100,150,0.12)",
          color: "#ffd6e0",
          borderRadius: "50px",
          cursor: "pointer",
          textDecoration: "none",
          transition: "all 0.3s ease",
          letterSpacing: "0.12em",
          fontFamily: "'Georgia', serif",
        }}
      >
        Start the Adventure
      </Link>
    </div>
  );
}
