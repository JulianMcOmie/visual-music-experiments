"use client";

const projects = [
  {
    title: "Polar Functions",
    href: "/circle",
    description: "Layered polar wave patterns with rotated shape overlays, concentric rings, and oscillating parameters.",
    color: "#4488ff",
    bgColor: "#0a0a0a",
    snapshot: "/snapshots/polar-functions.png",
  },
  {
    title: "3D Polar Functions",
    href: "/polar",
    description: "3D rose, spiral, cardioid, lemniscate, and limaçon curves with depth layers and color palettes.",
    color: "#aa66ff",
    bgColor: "#000510",
    snapshot: "/snapshots/3d-polar-functions.png",
  },
  {
    title: "Polar Bursts",
    href: "/tunnel",
    description: "First-person flight through an infinite procedural tunnel with color-shifting rings.",
    color: "#ff6644",
    bgColor: "#000508",
    snapshot: "/snapshots/polar-bursts.png",
  },
  {
    title: "Cube Tube",
    href: "/cube-tube",
    description: "A tube of rotating cubes stretching into depth, with oscillation-driven color and movement.",
    color: "#44cc88",
    bgColor: "#000510",
    snapshot: "/snapshots/cube-tube.png",
  },
  {
    title: "Penrose Tiling",
    href: "/penrose-tiling",
    description: "Aperiodic P2 Penrose tiling with per-tile oscillators, spiral delay modes, and smooth pause/resume interpolation.",
    color: "#ffaa44",
    bgColor: "#050505",
    snapshot: "/snapshots/penrose-tiling.png",
  },
];

export default function Gallery() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "60px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px 0", color: "#fff" }}>
        Visual Music
      </h1>
      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 56px 0", letterSpacing: "0.05em" }}>
        Experiments
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {projects.map((project) => (
          <a
            key={project.href}
            href={project.href}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#111",
              border: `1px solid #222`,
              borderRadius: "12px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              transition: "border-color 0.2s, transform 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = project.color;
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "#222";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                overflow: "hidden",
                borderRadius: "8px",
                height: "160px",
                background: project.bgColor,
                position: "relative"
              }}
            >
              <img
                src={project.snapshot}
                alt={project.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: project.color,
                  boxShadow: `0 0 8px ${project.color}`,
                }}
              />
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500, color: "#fff" }}>
                {project.title}
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#888", lineHeight: 1.5 }}>
              {project.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
