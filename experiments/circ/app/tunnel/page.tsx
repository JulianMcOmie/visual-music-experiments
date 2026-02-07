"use client";

import { useEffect, useRef, useState } from "react";

type WaveFunction = "cos" | "sin" | "abs-sin" | "square" | "spiral" | "sawtooth" | "triangle";
type ColorPalette = "chromatic" | "analogous" | "complementary" | "triadic" | "warm" | "cool" | "sunset" | "ocean" | "forest" | "monochrome";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  cos: (x) => Math.cos(x),
  sin: (x) => Math.sin(x),
  "abs-sin": (x) => Math.abs(Math.sin(x)),
  square: (x) => (Math.sin(x) >= 0 ? 1 : -1),
  spiral: (x) => Math.sin(x) * (x / (Math.PI * 2)),
  sawtooth: (x) => 2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5)),
  triangle: (x) => 2 * Math.abs(2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5))) - 1,
};

const colorPalettes: Record<ColorPalette, (baseHue: number, depth: number, time: number) => number> = {
  chromatic: (base, depth, time) => (depth * 30 + base + time * 50) % 360,
  analogous: (base, depth, time) => base + (depth * 30 + time * 20) % 60 - 30,
  complementary: (base, depth, time) => {
    // Smooth interpolation between complementary colors
    const cycle = (depth * 2 + time * 0.5) % 2;
    const blend = Math.abs(cycle - 1); // Creates smooth 0->1->0 pattern
    return base + blend * 180;
  },
  triadic: (base, depth, time) => {
    // Smooth interpolation between triadic colors
    const cycle = (depth * 3 + time * 0.5) % 3;
    const position = cycle % 1;
    const colorIndex = Math.floor(cycle);
    const nextColorIndex = (colorIndex + 1) % 3;
    return base + (colorIndex * 120 + position * 120);
  },
  warm: (base, depth, time) => 0 + (depth * 20 + time * 30) % 60,
  cool: (base, depth, time) => 180 + (depth * 20 + time * 30) % 60,
  sunset: (base, depth, time) => 15 + (depth * 40 + time * 20) % 45,
  ocean: (base, depth, time) => 200 + (depth * 30 + time * 25) % 60,
  forest: (base, depth, time) => 90 + (depth * 40 + time * 15) % 60,
  monochrome: (base, depth, time) => base,
};

export default function Tunnel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(12);
  const [tunnelDepth, setTunnelDepth] = useState(30);
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [waveFunction, setWaveFunction] = useState<WaveFunction>("cos");
  const [petals, setPetals] = useState(6);
  const [colorShift, setColorShift] = useState(180);
  const [colorPalette, setColorPalette] = useState<ColorPalette>("chromatic");
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const [isPreview, setIsPreview] = useState(false);
  const pausedRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (window.location.search.includes("preview")) {
      setIsPreview(true);
      pausedRef.current = true;
    }
  }, []);
  useEffect(() => {
    if (!isPreview) return;
    const handler = (e: MessageEvent) => {
      if (e.data === "play") { pausedRef.current = false; resumeRef.current?.(); }
      if (e.data === "pause") { pausedRef.current = true; }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

  // Speed oscillation
  const [speedOscEnabled, setSpeedOscEnabled] = useState(false);
  const [speedOscFunction, setSpeedOscFunction] = useState<WaveFunction>("sin");
  const [speedOscSpeed, setSpeedOscSpeed] = useState(1);
  const [speedOscMin, setSpeedOscMin] = useState(5);
  const [speedOscMax, setSpeedOscMax] = useState(20);

  // Rotation oscillation
  const [rotationOscEnabled, setRotationOscEnabled] = useState(false);
  const [rotationOscFunction, setRotationOscFunction] = useState<WaveFunction>("sin");
  const [rotationOscSpeed, setRotationOscSpeed] = useState(1);
  const [rotationOscMin, setRotationOscMin] = useState(-3);
  const [rotationOscMax, setRotationOscMax] = useState(3);

  // Tunnel depth oscillation
  const [depthOscEnabled, setDepthOscEnabled] = useState(false);
  const [depthOscFunction, setDepthOscFunction] = useState<WaveFunction>("sin");
  const [depthOscSpeed, setDepthOscSpeed] = useState(1);
  const [depthOscMin, setDepthOscMin] = useState(20);
  const [depthOscMax, setDepthOscMax] = useState(40);

  // Petals oscillation
  const [petalsOscEnabled, setPetalsOscEnabled] = useState(false);
  const [petalsOscFunction, setPetalsOscFunction] = useState<WaveFunction>("sin");
  const [petalsOscSpeed, setPetalsOscSpeed] = useState(1);
  const [petalsOscMin, setPetalsOscMin] = useState(3);
  const [petalsOscMax, setPetalsOscMax] = useState(12);

  // Color shift oscillation
  const [colorOscEnabled, setColorOscEnabled] = useState(false);
  const [colorOscFunction, setColorOscFunction] = useState<WaveFunction>("sin");
  const [colorOscSpeed, setColorOscSpeed] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let zOffset = 0;
    let rotation = 0;

    const animate = () => {
      // Calculate oscillated values
      let currentSpeed = speed;
      if (speedOscEnabled) {
        const wave = waveFunctions[speedOscFunction];
        const normalizedWave = (wave(timeRef.current * speedOscSpeed) + 1) / 2;
        currentSpeed = speedOscMin + normalizedWave * (speedOscMax - speedOscMin);
      }

      let currentRotation = rotationSpeed;
      if (rotationOscEnabled) {
        const wave = waveFunctions[rotationOscFunction];
        const normalizedWave = (wave(timeRef.current * rotationOscSpeed) + 1) / 2;
        currentRotation = rotationOscMin + normalizedWave * (rotationOscMax - rotationOscMin);
      }

      // Use max depth to ensure we always draw enough layers
      let targetDepth = tunnelDepth;
      if (depthOscEnabled) {
        const wave = waveFunctions[depthOscFunction];
        const normalizedWave = (wave(timeRef.current * depthOscSpeed) + 1) / 2;
        targetDepth = depthOscMin + normalizedWave * (depthOscMax - depthOscMin);
      }
      const currentDepth = Math.ceil(targetDepth);

      // Smooth petals transition using opacity blending
      let currentPetals = petals;
      let petalBlend = 0;
      if (petalsOscEnabled) {
        const wave = waveFunctions[petalsOscFunction];
        const normalizedWave = (wave(timeRef.current * petalsOscSpeed) + 1) / 2;
        const targetPetals = petalsOscMin + normalizedWave * (petalsOscMax - petalsOscMin);
        currentPetals = Math.floor(targetPetals);
        petalBlend = targetPetals - currentPetals; // Fractional part for blending
      }

      let currentColorShift = colorShift;
      if (colorOscEnabled) {
        const wave = waveFunctions[colorOscFunction];
        currentColorShift = colorShift + wave(timeRef.current * colorOscSpeed) * 180;
      }

      // Create motion blur effect
      ctx.fillStyle = "rgba(0, 0, 5, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.max(canvas.width, canvas.height);

      const waveFunc = waveFunctions[waveFunction];

      // Camera shake for speed sensation
      const shake = currentSpeed > 10 ? (Math.sin(timeRef.current * 20) * (currentSpeed - 10) * 0.5) : 0;
      const shakeX = centerX + shake;
      const shakeY = centerY + shake * 0.7;

      // Draw tunnel layers from back to front
      // Always draw max layers to prevent popping, but fade based on depth setting
      const MAX_LAYERS = 60;
      for (let layer = 0; layer < MAX_LAYERS; layer++) {
        // Calculate z position with proper wrapping
        let z = (layer - zOffset) % MAX_LAYERS;
        if (z < 0) z += MAX_LAYERS;

        // Calculate opacity based on whether this layer is within current depth range
        let depthFade = 1;
        if (layer >= currentDepth) {
          // Fade out layers beyond current depth setting
          const fadeRange = 5; // Fade over 5 layers
          const beyond = layer - currentDepth;
          depthFade = Math.max(0, 1 - (beyond / fadeRange));
        }

        // Skip if completely faded
        if (depthFade < 0.01) continue;

        // True 3D perspective projection
        const depth = (MAX_LAYERS - z) / MAX_LAYERS; // 0 = far, 1 = near
        const fov = 500; // Field of view
        const perspective = fov / (fov + depth * fov * 3);

        // Exponential growth from vanishing point
        const scale = Math.pow(depth, 4.5);
        const layerRadius = maxRadius * scale * 3;

        // Only skip if radius is too small to see
        if (layerRadius < 1) continue;

        // Calculate color based on depth and time using palette
        const hue = colorPalettes[colorPalette](currentColorShift, z, timeRef.current);
        const brightness = 30 + depth * 60;
        const alpha = (0.3 + depth * 0.7) * depthFade;

        // Draw polar pattern for this layer with 3D perspective
        const segments = 180;

        // Minimal rotation, mostly forward motion
        const rotationAngle = rotation * 0.3 + layer * 0.1;

        // Draw with current petals
        const drawShape = (petalCount: number, shapeAlpha: number) => {
          const points: { x: number; y: number }[] = [];

          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wave = waveFunc(petalCount * angle);
            const r = layerRadius * (0.3 + 0.7 * ((wave + 1) / 2));

            // Apply 3D perspective projection from vanishing point
            const x = shakeX + r * Math.cos(angle + rotationAngle) * perspective;
            const y = shakeY + r * Math.sin(angle + rotationAngle) * perspective;

            points.push({ x, y });
          }

          // Draw the shape with depth-based transparency and glow
          const lineWidth = Math.max(0.5, depth * 12);
          ctx.lineWidth = lineWidth;
          const finalAlpha = alpha * shapeAlpha;
          ctx.strokeStyle = `hsla(${hue}, 85%, ${brightness}%, ${finalAlpha})`;

          // Add glow effect for near objects
          if (depth > 0.4) {
            ctx.shadowBlur = depth * 60;
            ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${finalAlpha})`;
          }

          ctx.beginPath();
          points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
        };

        // Draw current petal count
        drawShape(currentPetals, 1 - petalBlend);

        // Draw next petal count if blending
        if (petalBlend > 0.01 && currentPetals + 1 <= (petalsOscEnabled ? petalsOscMax : petals)) {
          drawShape(currentPetals + 1, petalBlend);
        }

        // Draw radial speed streaks from center
        if (layer % 4 === 0 && depth > 0.2) {
          ctx.lineWidth = depth * 3;

          const drawStreaks = (petalCount: number, streakAlpha: number) => {
            for (let i = 0; i < petalCount * 2; i++) {
              const angle = (i / (petalCount * 2)) * Math.PI * 2 + rotationAngle;
              const wave = waveFunc(petalCount * angle);
              const r = layerRadius * (0.3 + 0.7 * ((wave + 1) / 2));

              const x = shakeX + r * Math.cos(angle) * perspective;
              const y = shakeY + r * Math.sin(angle) * perspective;

              // Draw streak from center toward edge
              const gradient = ctx.createLinearGradient(shakeX, shakeY, x, y);
              gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0)`);
              gradient.addColorStop(0.7, `hsla(${hue}, 80%, 60%, ${alpha * 0.3 * streakAlpha})`);
              gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, ${alpha * 0.6 * streakAlpha})`);

              ctx.strokeStyle = gradient;
              ctx.beginPath();
              ctx.moveTo(shakeX, shakeY);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          };

          // Draw streaks with current petals
          drawStreaks(currentPetals, 1 - petalBlend);

          // Draw streaks with next petals if blending
          if (petalBlend > 0.01 && currentPetals + 1 <= (petalsOscEnabled ? petalsOscMax : petals)) {
            drawStreaks(currentPetals + 1, petalBlend);
          }
        }
      }

      // Add explosive streaming particles from vanishing point
      const numParticles = 400;
      for (let i = 0; i < numParticles; i++) {
        const particleAngle = (i / numParticles) * Math.PI * 2 + i * 0.618;
        const particleProgress = ((i * 11 + timeRef.current * 70 * (currentSpeed / 10)) % 100) / 100;

        // Particle explodes from center with dramatic acceleration
        const particleDepth = Math.pow(particleProgress, 2.5);
        const particleFov = 500;
        const particlePerspective = particleFov / (particleFov + particleDepth * particleFov * 3);
        const particleDist = maxRadius * particleDepth * 4;

        const x = shakeX + particleDist * Math.cos(particleAngle + rotation * 0.1) * particlePerspective;
        const y = shakeY + particleDist * Math.sin(particleAngle + rotation * 0.1) * particlePerspective;

        // Streak trails behind, starting from center
        const streakStart = 0.85; // Start streak near center
        const streakProgress = Math.max(0, particleProgress - streakStart);
        const streakDepth = Math.pow(particleProgress - streakProgress, 2.5);
        const streakPerspective = particleFov / (particleFov + streakDepth * particleFov * 3);
        const streakDist = maxRadius * streakDepth * 4;

        const startX = shakeX + streakDist * Math.cos(particleAngle + rotation * 0.1) * streakPerspective;
        const startY = shakeY + streakDist * Math.sin(particleAngle + rotation * 0.1) * streakPerspective;

        const particleAlpha = 0.4 + particleDepth * 0.6;
        const particleHue = colorPalettes[colorPalette](currentColorShift, particleProgress * 100, timeRef.current);

        // Draw long streak from vanishing point
        const gradient = ctx.createLinearGradient(startX, startY, x, y);
        gradient.addColorStop(0, `hsla(${particleHue}, 100%, 60%, 0)`);
        gradient.addColorStop(0.3, `hsla(${particleHue}, 100%, 75%, ${particleAlpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${particleHue}, 100%, 95%, ${particleAlpha})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.3 + particleDepth * 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw bright particle head
        if (particleProgress > 0.5) {
          ctx.shadowBlur = 20 * particleDepth;
          ctx.shadowColor = `hsla(${particleHue}, 100%, 80%, ${particleAlpha})`;
          ctx.fillStyle = `hsla(${particleHue}, 100%, 95%, ${particleAlpha})`;
          const size = 1 + particleDepth * 5;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Update movement
      zOffset += currentSpeed * 0.05;
      rotation += currentRotation * 0.02;
      timeRef.current += 0.016;

      if (!pausedRef.current) animationRef.current = requestAnimationFrame(animate);
    };

    resumeRef.current = animate;
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    speed, tunnelDepth, rotationSpeed, waveFunction, petals, colorShift, colorPalette,
    speedOscEnabled, speedOscFunction, speedOscSpeed, speedOscMin, speedOscMax,
    rotationOscEnabled, rotationOscFunction, rotationOscSpeed, rotationOscMin, rotationOscMax,
    depthOscEnabled, depthOscFunction, depthOscSpeed, depthOscMin, depthOscMax,
    petalsOscEnabled, petalsOscFunction, petalsOscSpeed, petalsOscMin, petalsOscMax,
    colorOscEnabled, colorOscFunction, colorOscSpeed
  ]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", background: "#000508" }}
      />

      {!isPreview && (
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.8)",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "250px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#fff" }}>
          Warp Speed Controls
        </h2>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="speed"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Speed: {speed.toFixed(1)}x
          </label>
          <input
            id="speed"
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="rotationSpeed"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Rotation: {rotationSpeed.toFixed(2)}
          </label>
          <input
            id="rotationSpeed"
            type="range"
            min="-5"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="tunnelDepth"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Tunnel Depth: {tunnelDepth}
          </label>
          <input
            id="tunnelDepth"
            type="range"
            min="5"
            max="50"
            value={tunnelDepth}
            onChange={(e) => setTunnelDepth(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="petals"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Tunnel Sections: {petals}
          </label>
          <input
            id="petals"
            type="range"
            min="3"
            max="32"
            value={petals}
            onChange={(e) => setPetals(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="waveFunction"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Tunnel Shape
          </label>
          <select
            id="waveFunction"
            value={waveFunction}
            onChange={(e) => setWaveFunction(e.target.value as WaveFunction)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              cursor: "pointer",
            }}
          >
            <option value="cos">Smooth Wave</option>
            <option value="sin">Sine Wave</option>
            <option value="abs-sin">Star Burst</option>
            <option value="square">Geometric</option>
            <option value="spiral">Spiral</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="colorShift"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Color Shift: {colorShift}°
          </label>
          <input
            id="colorShift"
            type="range"
            min="0"
            max="360"
            value={colorShift}
            onChange={(e) => setColorShift(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="colorPalette"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Color Palette
          </label>
          <select
            id="colorPalette"
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              cursor: "pointer",
            }}
          >
            <option value="chromatic">Chromatic</option>
            <option value="analogous">Analogous</option>
            <option value="complementary">Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
            <option value="sunset">Sunset</option>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>

        <h3 style={{ margin: "30px 0 15px 0", fontSize: "16px", color: "#fff", borderTop: "1px solid #444", paddingTop: "20px" }}>
          Oscillations
        </h3>

        {/* Speed Oscillation */}
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "14px", color: "#fff", cursor: "pointer", marginBottom: "10px" }}>
            Speed Oscillation {speedOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "15px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={speedOscEnabled}
                  onChange={(e) => setSpeedOscEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Function</label>
              <select
                value={speedOscFunction}
                onChange={(e) => setSpeedOscFunction(e.target.value as WaveFunction)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "12px" }}
              >
                <option value="sin">Sine</option>
                <option value="cos">Cosine</option>
                <option value="abs-sin">Abs Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Speed: {speedOscSpeed.toFixed(2)}</label>
              <input type="range" min="0.1" max="10" step="0.1" value={speedOscSpeed} onChange={(e) => setSpeedOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Min: {speedOscMin.toFixed(1)}</label>
              <input type="range" min="0.1" max="30" step="0.1" value={speedOscMin} onChange={(e) => setSpeedOscMin(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Max: {speedOscMax.toFixed(1)}</label>
              <input type="range" min="0.1" max="30" step="0.1" value={speedOscMax} onChange={(e) => setSpeedOscMax(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
        </details>

        {/* Rotation Oscillation */}
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "14px", color: "#fff", cursor: "pointer", marginBottom: "10px" }}>
            Rotation Oscillation {rotationOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "15px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={rotationOscEnabled}
                  onChange={(e) => setRotationOscEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Function</label>
              <select
                value={rotationOscFunction}
                onChange={(e) => setRotationOscFunction(e.target.value as WaveFunction)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "12px" }}
              >
                <option value="sin">Sine</option>
                <option value="cos">Cosine</option>
                <option value="abs-sin">Abs Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Speed: {rotationOscSpeed.toFixed(2)}</label>
              <input type="range" min="0.1" max="10" step="0.1" value={rotationOscSpeed} onChange={(e) => setRotationOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Min: {rotationOscMin.toFixed(2)}</label>
              <input type="range" min="-10" max="10" step="0.1" value={rotationOscMin} onChange={(e) => setRotationOscMin(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Max: {rotationOscMax.toFixed(2)}</label>
              <input type="range" min="-10" max="10" step="0.1" value={rotationOscMax} onChange={(e) => setRotationOscMax(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
        </details>

        {/* Tunnel Depth Oscillation */}
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "14px", color: "#fff", cursor: "pointer", marginBottom: "10px" }}>
            Tunnel Depth Oscillation {depthOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "15px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={depthOscEnabled}
                  onChange={(e) => setDepthOscEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Function</label>
              <select
                value={depthOscFunction}
                onChange={(e) => setDepthOscFunction(e.target.value as WaveFunction)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "12px" }}
              >
                <option value="sin">Sine</option>
                <option value="cos">Cosine</option>
                <option value="abs-sin">Abs Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Speed: {depthOscSpeed.toFixed(2)}</label>
              <input type="range" min="0.1" max="10" step="0.1" value={depthOscSpeed} onChange={(e) => setDepthOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Min: {depthOscMin}</label>
              <input type="range" min="5" max="100" step="1" value={depthOscMin} onChange={(e) => setDepthOscMin(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Max: {depthOscMax}</label>
              <input type="range" min="5" max="100" step="1" value={depthOscMax} onChange={(e) => setDepthOscMax(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
        </details>

        {/* Petals Oscillation */}
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "14px", color: "#fff", cursor: "pointer", marginBottom: "10px" }}>
            Tunnel Sections Oscillation {petalsOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "15px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={petalsOscEnabled}
                  onChange={(e) => setPetalsOscEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Function</label>
              <select
                value={petalsOscFunction}
                onChange={(e) => setPetalsOscFunction(e.target.value as WaveFunction)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "12px" }}
              >
                <option value="sin">Sine</option>
                <option value="cos">Cosine</option>
                <option value="abs-sin">Abs Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Speed: {petalsOscSpeed.toFixed(2)}</label>
              <input type="range" min="0.1" max="10" step="0.1" value={petalsOscSpeed} onChange={(e) => setPetalsOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Min: {petalsOscMin}</label>
              <input type="range" min="3" max="48" step="1" value={petalsOscMin} onChange={(e) => setPetalsOscMin(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Max: {petalsOscMax}</label>
              <input type="range" min="3" max="48" step="1" value={petalsOscMax} onChange={(e) => setPetalsOscMax(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
        </details>

        {/* Color Oscillation */}
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "14px", color: "#fff", cursor: "pointer", marginBottom: "10px" }}>
            Color Shift Oscillation {colorOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "15px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={colorOscEnabled}
                  onChange={(e) => setColorOscEnabled(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Function</label>
              <select
                value={colorOscFunction}
                onChange={(e) => setColorOscFunction(e.target.value as WaveFunction)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "12px" }}
              >
                <option value="sin">Sine</option>
                <option value="cos">Cosine</option>
                <option value="abs-sin">Abs Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#aaa" }}>Speed: {colorOscSpeed.toFixed(2)}</label>
              <input type="range" min="0.1" max="10" step="0.1" value={colorOscSpeed} onChange={(e) => setColorOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          </div>
        </details>

        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "20px" }}>
          <a href="/" style={{ color: "#4488ff" }}>← Gallery</a>
        </div>
      </div>
      )}
    </div>
  );
}
