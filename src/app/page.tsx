"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// Circle layout configuration
const CIRCLE_RADIUS = 12;
const NUM_RINGS = 2;

// Generate circle positions
function generateCircles() {
  const circles: { id: number; cx: number; cy: number; ring: number; index: number }[] = [];
  let id = 1;

  // Center circle
  circles.push({ id: id++, cx: 0, cy: 0, ring: 0, index: 0 });

  // Generate rings with increasing circle counts
  for (let ringNum = 1; ringNum <= NUM_RINGS; ringNum++) {
    const count = ringNum * 6; // 6, 12, 18, 24, 30, 36, 42
    const distance = CIRCLE_RADIUS * 2.3 * ringNum;

    for (let i = 0; i < count; i++) {
      const angle = (i * (360 / count) - 90) * (Math.PI / 180);
      circles.push({
        id: id++,
        cx: Math.cos(angle) * distance,
        cy: Math.sin(angle) * distance,
        ring: ringNum,
        index: i,
      });
    }
  }

  return circles;
}

const ALL_CIRCLES = generateCircles();
// Total: 1 + 6 + 12 = 19 circles

// Helper to get circle count for a ring
function getCountForRing(ring: number): number {
  return ring === 0 ? 1 : ring * 6;
}

// Symmetric pattern definitions - grouped logically on QWERTY keyboard
const PATTERNS: Record<string, number[]> = {
  // === NUMBER ROW: Ring selections ===
  "1": ALL_CIRCLES.filter((c) => c.ring === 1).map((c) => c.id),
  "2": ALL_CIRCLES.filter((c) => c.ring === 2).map((c) => c.id),
  "3": ALL_CIRCLES.filter((c) => c.ring === 3).map((c) => c.id),
  "4": ALL_CIRCLES.filter((c) => c.ring === 4).map((c) => c.id),
  "5": ALL_CIRCLES.filter((c) => c.ring === 5).map((c) => c.id),

  // === TOP ROW: Cumulative and special selections ===
  q: [1], // Center only
  w: ALL_CIRCLES.filter((c) => c.ring <= 1).map((c) => c.id), // Center + ring 1
  e: ALL_CIRCLES.filter((c) => c.ring <= 2).map((c) => c.id), // Inner 2
  r: ALL_CIRCLES.filter((c) => c.ring <= 3).map((c) => c.id), // Inner 3
  t: ALL_CIRCLES.filter((c) => c.ring <= 4).map((c) => c.id), // Inner 4
  y: ALL_CIRCLES.map((c) => c.id), // All circles
  u: ALL_CIRCLES.filter((c) => c.ring >= 3).map((c) => c.id), // Outer 3
  i: ALL_CIRCLES.filter((c) => c.ring >= 4).map((c) => c.id), // Outer 2
  o: ALL_CIRCLES.filter((c) => c.ring === 5).map((c) => c.id), // Outermost
  p: ALL_CIRCLES.filter((c) => c.ring === 1 || c.ring === 3 || c.ring === 5).map((c) => c.id), // Odd rings

  // === HOME ROW LEFT: Alternating patterns (evens) ===
  a: ALL_CIRCLES.filter((c) => c.ring === 0 || c.index % 2 === 0).map((c) => c.id), // All evens + center
  s: ALL_CIRCLES.filter((c) => c.ring <= 3 && (c.ring === 0 || c.index % 2 === 0)).map((c) => c.id), // Inner evens
  d: ALL_CIRCLES.filter((c) => c.ring >= 4 && c.index % 2 === 0).map((c) => c.id), // Outer evens
  f: ALL_CIRCLES.filter((c) => c.index % 3 === 0).map((c) => c.id), // Every 3rd

  // === HOME ROW RIGHT: Alternating patterns (odds) ===
  g: ALL_CIRCLES.filter((c) => c.ring % 2 === 1).map((c) => c.id), // Odd rings (1, 3, 5, 7)
  h: ALL_CIRCLES.filter((c) => c.ring % 2 === 0).map((c) => c.id), // Even rings (0, 2, 4, 6)
  j: ALL_CIRCLES.filter((c) => c.index % 2 === 1).map((c) => c.id), // All odds
  k: ALL_CIRCLES.filter((c) => c.ring <= 3 && c.index % 2 === 1).map((c) => c.id), // Inner odds
  l: ALL_CIRCLES.filter((c) => c.ring >= 4 && c.index % 2 === 1).map((c) => c.id), // Outer odds

  // === BOTTOM ROW LEFT: Directional / halves ===
  z: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index <= count / 4 || c.index >= (count * 3) / 4;
  }).map((c) => c.id), // Top half

  x: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index >= count / 4 && c.index <= (count * 3) / 4;
  }).map((c) => c.id), // Bottom half

  c: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index < count / 2;
  }).map((c) => c.id), // Right half

  v: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index >= count / 2;
  }).map((c) => c.id), // Left half

  // === BOTTOM ROW RIGHT: Radial patterns ===
  b: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    // Vertical line (top and bottom)
    return c.index === 0 || c.index === count / 2;
  }).map((c) => c.id),

  n: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    // Horizontal line (left and right)
    return c.index === count / 4 || c.index === (count * 3) / 4;
  }).map((c) => c.id),

  m: ALL_CIRCLES.filter((c) => {
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    // 4-point cross (top, right, bottom, left)
    return c.index === 0 || c.index === count / 4 || c.index === count / 2 || c.index === (count * 3) / 4;
  }).map((c) => c.id),

  // === NUMBER ROW TOP: Special patterns ===
  "`": ALL_CIRCLES.filter((c) => {
    // 6-point star
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index % (count / 6) === 0;
  }).map((c) => c.id),

  "-": ALL_CIRCLES.filter((c) => {
    // 3-point star
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    return c.index % (count / 3) === 0;
  }).map((c) => c.id),

  "=": ALL_CIRCLES.filter((c) => {
    // Spiral pattern
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    const offset = (c.ring - 1) * 2;
    return c.index >= offset && c.index < offset + count / 4;
  }).map((c) => c.id),

  "[": ALL_CIRCLES.filter((c) => {
    // Checkerboard
    return (c.ring + c.index) % 2 === 0;
  }).map((c) => c.id),

  "]": ALL_CIRCLES.filter((c) => {
    // Inverse checkerboard
    return (c.ring + c.index) % 2 === 1;
  }).map((c) => c.id),

  "\\": ALL_CIRCLES.filter((c) => {
    // Diagonal stripes
    if (c.ring === 0) return true;
    const count = getCountForRing(c.ring);
    const stripe = Math.floor((c.index / count) * 6);
    return stripe % 2 === 0;
  }).map((c) => c.id),

  ";": ALL_CIRCLES.filter((c) => {
    // Concentric - every other ring filled
    return c.ring % 2 === 0;
  }).map((c) => c.id),

  "'": ALL_CIRCLES.filter((c) => {
    // Opposite concentric
    return c.ring % 2 === 1;
  }).map((c) => c.id),
};

export default function Home() {
  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set());

  // Compute filled circles based on all currently held keys
  const filledCircles = useMemo(() => {
    const filled = new Set<number>();

    heldKeys.forEach((key) => {
      // All keys go through patterns now (including numbers)
      const pattern = PATTERNS[key] || PATTERNS[key.toLowerCase()];
      if (pattern) {
        pattern.forEach((id) => filled.add(id));
      }
    });

    return filled;
  }, [heldKeys]);

  const addKey = useCallback((key: string) => {
    setHeldKeys((prev) => new Set(prev).add(key.toLowerCase()));
  }, []);

  const removeKey = useCallback((key: string) => {
    setHeldKeys((prev) => {
      const next = new Set(prev);
      next.delete(key.toLowerCase());
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      addKey(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      removeKey(e.key);
    };

    // Clear all keys if window loses focus
    const handleBlur = () => {
      setHeldKeys(new Set());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [addKey, removeKey]);

  const containerSize = 500;
  const centerOffset = containerSize / 2;
  const outerRadius = CIRCLE_RADIUS * 2.3 * NUM_RINGS + CIRCLE_RADIUS + 6;

  return (
    <div className="instrument-container">
      <svg
        width={containerSize}
        height={containerSize}
        viewBox={`0 0 ${containerSize} ${containerSize}`}
        className="instrument-svg"
      >
        {/* Outer containing circle */}
        <circle
          cx={centerOffset}
          cy={centerOffset}
          r={outerRadius}
          fill="none"
          stroke="var(--circle-stroke)"
          strokeWidth="1.5"
          className="outer-ring"
        />

        {/* All interactive circles */}
        {ALL_CIRCLES.map((circle) => (
          <circle
            key={circle.id}
            cx={centerOffset + circle.cx}
            cy={centerOffset + circle.cy}
            r={CIRCLE_RADIUS}
            fill={filledCircles.has(circle.id) ? "var(--circle-fill)" : "none"}
            stroke="var(--circle-stroke)"
            strokeWidth="1"
            className={`inner-circle ${filledCircles.has(circle.id) ? "filled" : ""}`}
          />
        ))}
      </svg>

      <div className="hint-container">
        <div className="hint-row">
          <span className="hint-label">Rings:</span>
          <span>1-5 each ring · Q center · O outer</span>
        </div>
        <div className="hint-row">
          <span className="hint-label">Cumulative:</span>
          <span>W/E/R/T inner · U/I outer · Y all · P stripes</span>
        </div>
        <div className="hint-row">
          <span className="hint-label">Alternating:</span>
          <span>A evens · J odds · G/H odd/even rings</span>
        </div>
        <div className="hint-row">
          <span className="hint-label">Halves:</span>
          <span>Z top · X bottom · C right · V left</span>
        </div>
        <div className="hint-row">
          <span className="hint-label">Radial:</span>
          <span>B vertical · N horizontal · M cross</span>
        </div>
        <div className="hint-row">
          <span className="hint-label">Patterns:</span>
          <span>` 6-star · - 3-star · = spiral · [ ] checker</span>
        </div>
      </div>

      <style jsx>{`
        .instrument-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
          gap: 1.5rem;
        }

        .instrument-svg {
          filter: drop-shadow(0 0 40px var(--glow-color));
        }

        .outer-ring {
          opacity: 0.4;
        }

        .inner-circle {
          transition: fill 0.06s ease-out, filter 0.06s ease-out;
        }

        .inner-circle.filled {
          filter: drop-shadow(0 0 4px var(--circle-fill));
        }

        .hint-container {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-family: "JetBrains Mono", "SF Mono", "Fira Code", monospace;
          font-size: 10px;
          color: var(--hint-color);
        }

        .hint-row {
          display: flex;
          gap: 0.6rem;
        }

        .hint-label {
          color: var(--circle-stroke);
          opacity: 0.5;
          min-width: 70px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
