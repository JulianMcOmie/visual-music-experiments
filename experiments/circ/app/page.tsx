"use client";

import { useEffect, useRef, useState } from "react";

type WaveFunction = "cos" | "sin" | "abs-sin" | "abs-cos" | "square" | "sawtooth" | "triangle";

type ColorPalette = "analogous" | "complementary" | "triadic" | "warm" | "cool" | "sunset" | "ocean" | "forest" | "monochrome";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  cos: (x) => Math.cos(x),
  sin: (x) => Math.sin(x),
  "abs-sin": (x) => Math.abs(Math.sin(x)),
  "abs-cos": (x) => Math.abs(Math.cos(x)),
  square: (x) => (Math.sin(x) >= 0 ? 1 : -1),
  sawtooth: (x) => (2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5))),
  triangle: (x) => Math.abs((x / Math.PI) % 2 - 1) * 2 - 1,
};

const colorPalettes: Record<ColorPalette, (baseHue: number, index: number, total: number) => number> = {
  analogous: (base, index, total) => base + (index / total) * 60 - 30,
  complementary: (base, index, total) => index % 2 === 0 ? base : base + 180,
  triadic: (base, index, total) => base + (index % 3) * 120,
  warm: (base, index, total) => 0 + (index / total) * 60,
  cool: (base, index, total) => 180 + (index / total) * 60,
  sunset: (base, index, total) => 0 + (index / total) * 90,
  ocean: (base, index, total) => 180 + (index / total) * 100,
  forest: (base, index, total) => 90 + (index / total) * 80,
  monochrome: (base, index, total) => base,
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [radius, setRadius] = useState(50);
  const [petals, setPetals] = useState(5);
  const [numShapes, setNumShapes] = useState(1);
  const [waveFunction, setWaveFunction] = useState<WaveFunction>("cos");

  // Color palette controls
  const [colorPalette, setColorPalette] = useState<ColorPalette>("analogous");
  const [baseHue, setBaseHue] = useState(200);
  const [paletteOscillationEnabled, setPaletteOscillationEnabled] = useState(false);
  const [paletteOscillationSpeed, setPaletteOscillationSpeed] = useState(1);
  const [paletteOscillationFunction, setPaletteOscillationFunction] = useState<WaveFunction>("sin");

  // Shape oscillation controls
  const [oscillationEnabled, setOscillationEnabled] = useState(false);
  const [oscillationSpeed, setOscillationSpeed] = useState(1);
  const [oscillationMin, setOscillationMin] = useState(1);
  const [oscillationMax, setOscillationMax] = useState(16);
  const [oscillationFunction, setOscillationFunction] = useState<WaveFunction>("sin");

  // Shape speed meta-oscillation
  const [shapeSpeedOscEnabled, setShapeSpeedOscEnabled] = useState(false);
  const [shapeSpeedOscSpeed, setShapeSpeedOscSpeed] = useState(1);
  const [shapeSpeedOscMin, setShapeSpeedOscMin] = useState(0.5);
  const [shapeSpeedOscMax, setShapeSpeedOscMax] = useState(10);
  const [shapeSpeedOscFunction, setShapeSpeedOscFunction] = useState<WaveFunction>("sin");

  // Petal oscillation controls
  const [petalOscillationEnabled, setPetalOscillationEnabled] = useState(false);
  const [petalOscillationSpeed, setPetalOscillationSpeed] = useState(1);
  const [petalOscillationMin, setPetalOscillationMin] = useState(1);
  const [petalOscillationMax, setPetalOscillationMax] = useState(12);
  const [petalOscillationFunction, setPetalOscillationFunction] = useState<WaveFunction>("cos");

  // Petal speed meta-oscillation
  const [petalSpeedOscEnabled, setPetalSpeedOscEnabled] = useState(false);
  const [petalSpeedOscSpeed, setPetalSpeedOscSpeed] = useState(1);
  const [petalSpeedOscMin, setPetalSpeedOscMin] = useState(0.5);
  const [petalSpeedOscMax, setPetalSpeedOscMax] = useState(10);
  const [petalSpeedOscFunction, setPetalSpeedOscFunction] = useState<WaveFunction>("sin");

  // Radius oscillation controls
  const [radiusOscillationEnabled, setRadiusOscillationEnabled] = useState(false);
  const [radiusOscillationSpeed, setRadiusOscillationSpeed] = useState(1);
  const [radiusOscillationMin, setRadiusOscillationMin] = useState(50);
  const [radiusOscillationMax, setRadiusOscillationMax] = useState(400);
  const [radiusOscillationFunction, setRadiusOscillationFunction] = useState<WaveFunction>("sin");

  // Radius speed meta-oscillation
  const [radiusSpeedOscEnabled, setRadiusSpeedOscEnabled] = useState(false);
  const [radiusSpeedOscSpeed, setRadiusSpeedOscSpeed] = useState(1);
  const [radiusSpeedOscMin, setRadiusSpeedOscMin] = useState(0.5);
  const [radiusSpeedOscMax, setRadiusSpeedOscMax] = useState(10);
  const [radiusSpeedOscFunction, setRadiusSpeedOscFunction] = useState<WaveFunction>("sin");

  // Layer oscillation controls
  const [numLayers, setNumLayers] = useState(2);
  const [layerOscillationEnabled, setLayerOscillationEnabled] = useState(false);
  const [layerOscillationSpeed, setLayerOscillationSpeed] = useState(1);
  const [layerOscillationMin, setLayerOscillationMin] = useState(2);
  const [layerOscillationMax, setLayerOscillationMax] = useState(8);
  const [layerOscillationFunction, setLayerOscillationFunction] = useState<WaveFunction>("sin");

  // Layer speed meta-oscillation
  const [layerSpeedOscEnabled, setLayerSpeedOscEnabled] = useState(false);
  const [layerSpeedOscSpeed, setLayerSpeedOscSpeed] = useState(1);
  const [layerSpeedOscMin, setLayerSpeedOscMin] = useState(0.5);
  const [layerSpeedOscMax, setLayerSpeedOscMax] = useState(10);
  const [layerSpeedOscFunction, setLayerSpeedOscFunction] = useState<WaveFunction>("sin");

  const animationRef = useRef<number>();
  const timeRef = useRef(0);

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

    let angle = 0;

    const animate = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const waveFunc = waveFunctions[waveFunction];
      const paletteFunc = colorPalettes[colorPalette];

      // Calculate oscillating base hue
      let currentBaseHue = baseHue;
      if (paletteOscillationEnabled) {
        const hueWave = waveFunctions[paletteOscillationFunction];
        const normalizedWave = (hueWave(timeRef.current * paletteOscillationSpeed) + 1) / 2;
        currentBaseHue = normalizedWave * 360;
      }

      // Calculate meta-oscillating speeds
      let currentPetalSpeed = petalOscillationSpeed;
      if (petalSpeedOscEnabled) {
        const speedWave = waveFunctions[petalSpeedOscFunction];
        const normalizedWave = (speedWave(timeRef.current * petalSpeedOscSpeed) + 1) / 2;
        currentPetalSpeed = petalSpeedOscMin + normalizedWave * (petalSpeedOscMax - petalSpeedOscMin);
      }

      let currentRadiusSpeed = radiusOscillationSpeed;
      if (radiusSpeedOscEnabled) {
        const speedWave = waveFunctions[radiusSpeedOscFunction];
        const normalizedWave = (speedWave(timeRef.current * radiusSpeedOscSpeed) + 1) / 2;
        currentRadiusSpeed = radiusSpeedOscMin + normalizedWave * (radiusSpeedOscMax - radiusSpeedOscMin);
      }

      let currentLayerSpeed = layerOscillationSpeed;
      if (layerSpeedOscEnabled) {
        const speedWave = waveFunctions[layerSpeedOscFunction];
        const normalizedWave = (speedWave(timeRef.current * layerSpeedOscSpeed) + 1) / 2;
        currentLayerSpeed = layerSpeedOscMin + normalizedWave * (layerSpeedOscMax - layerSpeedOscMin);
      }

      let currentShapeSpeed = oscillationSpeed;
      if (shapeSpeedOscEnabled) {
        const speedWave = waveFunctions[shapeSpeedOscFunction];
        const normalizedWave = (speedWave(timeRef.current * shapeSpeedOscSpeed) + 1) / 2;
        currentShapeSpeed = shapeSpeedOscMin + normalizedWave * (shapeSpeedOscMax - shapeSpeedOscMin);
      }

      // Calculate oscillating petals
      let currentPetals = petals;
      if (petalOscillationEnabled) {
        const petalWave = waveFunctions[petalOscillationFunction];
        const normalizedWave = (petalWave(timeRef.current * currentPetalSpeed) + 1) / 2;
        currentPetals = petalOscillationMin + normalizedWave * (petalOscillationMax - petalOscillationMin);
      }

      // Calculate oscillating radius
      let currentRadius = radius;
      if (radiusOscillationEnabled) {
        const radiusWave = waveFunctions[radiusOscillationFunction];
        const normalizedWave = (radiusWave(timeRef.current * currentRadiusSpeed) + 1) / 2;
        currentRadius = radiusOscillationMin + normalizedWave * (radiusOscillationMax - radiusOscillationMin);
      }

      // Calculate oscillating number of layers
      let currentNumLayers = numLayers;
      if (layerOscillationEnabled) {
        const layerWave = waveFunctions[layerOscillationFunction];
        const normalizedWave = (layerWave(timeRef.current * currentLayerSpeed) + 1) / 2;
        currentNumLayers = layerOscillationMin + normalizedWave * (layerOscillationMax - layerOscillationMin);
      }

      // Calculate oscillating number of shapes (smooth, fractional value)
      let currentNumShapes = numShapes;
      let oscillationValue = 0;
      if (oscillationEnabled) {
        const oscillationWave = waveFunctions[oscillationFunction];
        const normalizedWave = (oscillationWave(timeRef.current * currentShapeSpeed) + 1) / 2;
        oscillationValue = oscillationMin + normalizedWave * (oscillationMax - oscillationMin);
        currentNumShapes = oscillationMax; // Always draw max shapes for smooth transitions
      }

      // Draw multiple shapes
      for (let shapeIndex = 0; shapeIndex < currentNumShapes; shapeIndex++) {
        // Calculate opacity for smooth fade in/out during oscillation (quicker fade)
        let shapeOpacity = 1.0;
        if (oscillationEnabled) {
          // Shapes fade out as oscillation value decreases
          const shapeThreshold = shapeIndex + 1;
          if (oscillationValue < shapeThreshold) {
            // Fade out with power function for quicker transition
            const fadeValue = Math.max(0, oscillationValue - shapeIndex);
            shapeOpacity = Math.pow(fadeValue, 0.3); // Power < 1 makes fade quicker
          }
        }

        // Skip shapes that are fully transparent
        if (shapeOpacity <= 0.01) continue;

        const shapeAngle = angle + (shapeIndex / currentNumShapes) * Math.PI * 2;

        // Color variations for each shape using palette
        const hue = paletteFunc(currentBaseHue, shapeIndex, currentNumShapes);

        // Draw rose curve using polar coordinates with selected wave function
        // r(θ) = baseRadius + amplitude * waveFunc(k * θ)
        const points = 360;

        // Draw multiple concentric layers
        const maxLayers = Math.ceil(currentNumLayers);
        for (let layerIndex = 0; layerIndex < maxLayers; layerIndex++) {
          // Calculate layer opacity for smooth transitions
          let layerOpacity = shapeOpacity;
          if (layerOscillationEnabled) {
            const layerThreshold = layerIndex + 1;
            if (currentNumLayers < layerThreshold) {
              const fadeValue = Math.max(0, currentNumLayers - layerIndex);
              layerOpacity *= Math.pow(fadeValue, 0.3);
            }
          }

          if (layerOpacity <= 0.01) continue;

          // Calculate this layer's radius (spread evenly from base to max)
          const layerProgress = maxLayers > 1 ? layerIndex / (maxLayers - 1) : 0;
          const layerBaseRadius = currentRadius * (0.5 + layerProgress * 1.5);
          const layerAmplitude = layerBaseRadius * 0.8;

          // Vary hue for each layer
          const layerHue = (hue + layerIndex * 30) % 360;

          ctx.strokeStyle = `hsla(${layerHue}, 70%, ${60 - layerIndex * 5}%, ${layerOpacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();

          for (let i = 0; i <= points; i++) {
            const theta = (i / points) * Math.PI * 2;
            const r = layerBaseRadius + layerAmplitude * waveFunc(currentPetals * theta);

            const x = centerX + r * Math.cos(theta + shapeAngle);
            const y = centerY + r * Math.sin(theta + shapeAngle);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();

          // Draw lines to next layer
          if (layerIndex < maxLayers - 1) {
            const nextLayerProgress = (layerIndex + 1) / (maxLayers - 1);
            const nextLayerBaseRadius = currentRadius * (0.5 + nextLayerProgress * 1.5);
            const nextLayerAmplitude = nextLayerBaseRadius * 0.8;

            const numLines = Math.ceil(currentPetals * 8);
            ctx.strokeStyle = `hsla(${(layerHue + 45) % 360}, 70%, 70%, ${layerOpacity * 0.5})`;
            ctx.lineWidth = 1;

            for (let i = 0; i < numLines; i++) {
              const theta = (i / numLines) * Math.PI * 2;

              const r1 = layerBaseRadius + layerAmplitude * waveFunc(currentPetals * theta);
              const x1 = centerX + r1 * Math.cos(theta + shapeAngle);
              const y1 = centerY + r1 * Math.sin(theta + shapeAngle);

              const r2 = nextLayerBaseRadius + nextLayerAmplitude * waveFunc(currentPetals * theta);
              const x2 = centerX + r2 * Math.cos(theta + shapeAngle);
              const y2 = centerY + r2 * Math.sin(theta + shapeAngle);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
      }

      angle += 0.01;
      timeRef.current += 0.016;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    radius, petals, numShapes, numLayers, waveFunction,
    colorPalette, baseHue, paletteOscillationEnabled, paletteOscillationSpeed, paletteOscillationFunction,
    oscillationEnabled, oscillationSpeed, oscillationMin, oscillationMax, oscillationFunction,
    shapeSpeedOscEnabled, shapeSpeedOscSpeed, shapeSpeedOscMin, shapeSpeedOscMax, shapeSpeedOscFunction,
    petalOscillationEnabled, petalOscillationSpeed, petalOscillationMin, petalOscillationMax, petalOscillationFunction,
    petalSpeedOscEnabled, petalSpeedOscSpeed, petalSpeedOscMin, petalSpeedOscMax, petalSpeedOscFunction,
    radiusOscillationEnabled, radiusOscillationSpeed, radiusOscillationMin, radiusOscillationMax, radiusOscillationFunction,
    radiusSpeedOscEnabled, radiusSpeedOscSpeed, radiusSpeedOscMin, radiusSpeedOscMax, radiusSpeedOscFunction,
    layerOscillationEnabled, layerOscillationSpeed, layerOscillationMin, layerOscillationMax, layerOscillationFunction,
    layerSpeedOscEnabled, layerSpeedOscSpeed, layerSpeedOscMin, layerSpeedOscMax, layerSpeedOscFunction
  ]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block" }}
      />

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.7)",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "250px",
        }}
      >
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
            Wave Function
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
            <option value="cos">Cosine</option>
            <option value="sin">Sine</option>
            <option value="abs-sin">Absolute Sine</option>
            <option value="abs-cos">Absolute Cosine</option>
            <option value="square">Square Wave</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
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
            <option value="analogous">Analogous (Harmonious)</option>
            <option value="complementary">Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="warm">Warm Tones</option>
            <option value="cool">Cool Tones</option>
            <option value="sunset">Sunset</option>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="baseHue"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Base Hue: {baseHue}°
          </label>
          <input
            id="baseHue"
            type="range"
            min="0"
            max="360"
            value={baseHue}
            onChange={(e) => setBaseHue(Number(e.target.value))}
            disabled={paletteOscillationEnabled}
            style={{
              width: "100%",
              cursor: paletteOscillationEnabled ? "not-allowed" : "pointer",
              opacity: paletteOscillationEnabled ? 0.5 : 1,
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "12px",
              color: "#aaa",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            <input
              type="checkbox"
              checked={paletteOscillationEnabled}
              onChange={(e) => setPaletteOscillationEnabled(e.target.checked)}
              style={{
                marginRight: "6px",
                cursor: "pointer",
              }}
            />
            Oscillate Hue
          </label>
          {paletteOscillationEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #444" }}>
              <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                <label style={{ color: "#aaa", marginBottom: "4px", display: "block" }}>
                  Function
                </label>
                <select
                  value={paletteOscillationFunction}
                  onChange={(e) => setPaletteOscillationFunction(e.target.value as WaveFunction)}
                  style={{
                    width: "100%",
                    padding: "4px",
                    borderRadius: "4px",
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "1px solid #333",
                    fontSize: "11px",
                  }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                </select>
              </div>
              <div style={{ fontSize: "12px" }}>
                <label style={{ color: "#aaa" }}>Speed: {paletteOscillationSpeed.toFixed(2)}</label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={paletteOscillationSpeed}
                  onChange={(e) => setPaletteOscillationSpeed(Number(e.target.value))}
                  style={{ width: "100%", cursor: "pointer" }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="radius"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Base Radius: {radius}px
          </label>
          <input
            id="radius"
            type="range"
            min="20"
            max="800"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            disabled={radiusOscillationEnabled}
            style={{
              width: "100%",
              cursor: radiusOscillationEnabled ? "not-allowed" : "pointer",
              opacity: radiusOscillationEnabled ? 0.5 : 1,
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
            Petals: {petals}
          </label>
          <input
            id="petals"
            type="range"
            min="1"
            max="48"
            value={petals}
            onChange={(e) => setPetals(Number(e.target.value))}
            disabled={petalOscillationEnabled}
            style={{
              width: "100%",
              cursor: petalOscillationEnabled ? "not-allowed" : "pointer",
              opacity: petalOscillationEnabled ? 0.5 : 1,
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="numShapes"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Number of Shapes: {numShapes}
          </label>
          <input
            id="numShapes"
            type="range"
            min="1"
            max="48"
            value={numShapes}
            onChange={(e) => setNumShapes(Number(e.target.value))}
            disabled={oscillationEnabled}
            style={{
              width: "100%",
              cursor: oscillationEnabled ? "not-allowed" : "pointer",
              opacity: oscillationEnabled ? 0.5 : 1,
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="numLayers"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            Concentric Layers: {numLayers}
          </label>
          <input
            id="numLayers"
            type="range"
            min="1"
            max="24"
            value={numLayers}
            onChange={(e) => setNumLayers(Number(e.target.value))}
            disabled={layerOscillationEnabled}
            style={{
              width: "100%",
              cursor: layerOscillationEnabled ? "not-allowed" : "pointer",
              opacity: layerOscillationEnabled ? 0.5 : 1,
            }}
          />
        </div>

        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: "20px",
            marginTop: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={oscillationEnabled}
                onChange={(e) => setOscillationEnabled(e.target.checked)}
                style={{
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              />
              Enable Shape Oscillation
            </label>
          </div>

          {oscillationEnabled && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="oscillationFunction"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Oscillation Function
                </label>
                <select
                  id="oscillationFunction"
                  value={oscillationFunction}
                  onChange={(e) => setOscillationFunction(e.target.value as WaveFunction)}
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
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="abs-sin">Absolute Sine</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="oscillationSpeed"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Speed: {oscillationSpeed.toFixed(2)}
                </label>
                <input
                  id="oscillationSpeed"
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={oscillationSpeed}
                  onChange={(e) => setOscillationSpeed(Number(e.target.value))}
                  disabled={shapeSpeedOscEnabled}
                  style={{
                    width: "100%",
                    cursor: shapeSpeedOscEnabled ? "not-allowed" : "pointer",
                    opacity: shapeSpeedOscEnabled ? 0.5 : 1,
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#aaa",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shapeSpeedOscEnabled}
                    onChange={(e) => setShapeSpeedOscEnabled(e.target.checked)}
                    style={{
                      marginRight: "6px",
                      cursor: "pointer",
                    }}
                  />
                  Oscillate Speed
                </label>
                {shapeSpeedOscEnabled && (
                  <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #444" }}>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa", marginBottom: "4px", display: "block" }}>
                        Function
                      </label>
                      <select
                        value={shapeSpeedOscFunction}
                        onChange={(e) => setShapeSpeedOscFunction(e.target.value as WaveFunction)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: "4px",
                          background: "#1a1a1a",
                          color: "#fff",
                          border: "1px solid #333",
                          fontSize: "11px",
                        }}
                      >
                        <option value="sin">Sine</option>
                        <option value="cos">Cosine</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Meta-Speed: {shapeSpeedOscSpeed.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.05"
                        max="20"
                        step="0.05"
                        value={shapeSpeedOscSpeed}
                        onChange={(e) => setShapeSpeedOscSpeed(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Min: {shapeSpeedOscMin.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={shapeSpeedOscMin}
                        onChange={(e) => setShapeSpeedOscMin(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Max: {shapeSpeedOscMax.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={shapeSpeedOscMax}
                        onChange={(e) => setShapeSpeedOscMax(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="oscillationMin"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Min Shapes: {oscillationMin}
                </label>
                <input
                  id="oscillationMin"
                  type="range"
                  min="1"
                  max="48"
                  value={oscillationMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOscillationMin(val);
                    if (val > oscillationMax) setOscillationMax(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="oscillationMax"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Max Shapes: {oscillationMax}
                </label>
                <input
                  id="oscillationMax"
                  type="range"
                  min="1"
                  max="48"
                  value={oscillationMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOscillationMax(val);
                    if (val < oscillationMin) setOscillationMin(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: "20px",
            marginTop: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={petalOscillationEnabled}
                onChange={(e) => setPetalOscillationEnabled(e.target.checked)}
                style={{
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              />
              Enable Petal Oscillation
            </label>
          </div>

          {petalOscillationEnabled && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="petalOscillationFunction"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Petal Function
                </label>
                <select
                  id="petalOscillationFunction"
                  value={petalOscillationFunction}
                  onChange={(e) => setPetalOscillationFunction(e.target.value as WaveFunction)}
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
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="abs-sin">Absolute Sine</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="petalOscillationSpeed"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Speed: {petalOscillationSpeed.toFixed(2)}
                </label>
                <input
                  id="petalOscillationSpeed"
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={petalOscillationSpeed}
                  onChange={(e) => setPetalOscillationSpeed(Number(e.target.value))}
                  disabled={petalSpeedOscEnabled}
                  style={{
                    width: "100%",
                    cursor: petalSpeedOscEnabled ? "not-allowed" : "pointer",
                    opacity: petalSpeedOscEnabled ? 0.5 : 1,
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#aaa",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={petalSpeedOscEnabled}
                    onChange={(e) => setPetalSpeedOscEnabled(e.target.checked)}
                    style={{
                      marginRight: "6px",
                      cursor: "pointer",
                    }}
                  />
                  Oscillate Speed
                </label>
                {petalSpeedOscEnabled && (
                  <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #444" }}>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa", marginBottom: "4px", display: "block" }}>
                        Function
                      </label>
                      <select
                        value={petalSpeedOscFunction}
                        onChange={(e) => setPetalSpeedOscFunction(e.target.value as WaveFunction)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: "4px",
                          background: "#1a1a1a",
                          color: "#fff",
                          border: "1px solid #333",
                          fontSize: "11px",
                        }}
                      >
                        <option value="sin">Sine</option>
                        <option value="cos">Cosine</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Meta-Speed: {petalSpeedOscSpeed.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.05"
                        max="20"
                        step="0.05"
                        value={petalSpeedOscSpeed}
                        onChange={(e) => setPetalSpeedOscSpeed(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Min: {petalSpeedOscMin.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={petalSpeedOscMin}
                        onChange={(e) => setPetalSpeedOscMin(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Max: {petalSpeedOscMax.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={petalSpeedOscMax}
                        onChange={(e) => setPetalSpeedOscMax(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="petalOscillationMin"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Min Petals: {petalOscillationMin}
                </label>
                <input
                  id="petalOscillationMin"
                  type="range"
                  min="1"
                  max="48"
                  value={petalOscillationMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPetalOscillationMin(val);
                    if (val > petalOscillationMax) setPetalOscillationMax(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="petalOscillationMax"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Max Petals: {petalOscillationMax}
                </label>
                <input
                  id="petalOscillationMax"
                  type="range"
                  min="1"
                  max="48"
                  value={petalOscillationMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPetalOscillationMax(val);
                    if (val < petalOscillationMin) setPetalOscillationMin(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: "20px",
            marginTop: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={radiusOscillationEnabled}
                onChange={(e) => setRadiusOscillationEnabled(e.target.checked)}
                style={{
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              />
              Enable Radius Oscillation
            </label>
          </div>

          {radiusOscillationEnabled && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="radiusOscillationFunction"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Radius Function
                </label>
                <select
                  id="radiusOscillationFunction"
                  value={radiusOscillationFunction}
                  onChange={(e) => setRadiusOscillationFunction(e.target.value as WaveFunction)}
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
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="abs-sin">Absolute Sine</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="radiusOscillationSpeed"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Speed: {radiusOscillationSpeed.toFixed(2)}
                </label>
                <input
                  id="radiusOscillationSpeed"
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={radiusOscillationSpeed}
                  onChange={(e) => setRadiusOscillationSpeed(Number(e.target.value))}
                  disabled={radiusSpeedOscEnabled}
                  style={{
                    width: "100%",
                    cursor: radiusSpeedOscEnabled ? "not-allowed" : "pointer",
                    opacity: radiusSpeedOscEnabled ? 0.5 : 1,
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#aaa",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={radiusSpeedOscEnabled}
                    onChange={(e) => setRadiusSpeedOscEnabled(e.target.checked)}
                    style={{
                      marginRight: "6px",
                      cursor: "pointer",
                    }}
                  />
                  Oscillate Speed
                </label>
                {radiusSpeedOscEnabled && (
                  <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #444" }}>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa", marginBottom: "4px", display: "block" }}>
                        Function
                      </label>
                      <select
                        value={radiusSpeedOscFunction}
                        onChange={(e) => setRadiusSpeedOscFunction(e.target.value as WaveFunction)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: "4px",
                          background: "#1a1a1a",
                          color: "#fff",
                          border: "1px solid #333",
                          fontSize: "11px",
                        }}
                      >
                        <option value="sin">Sine</option>
                        <option value="cos">Cosine</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Meta-Speed: {radiusSpeedOscSpeed.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.05"
                        max="20"
                        step="0.05"
                        value={radiusSpeedOscSpeed}
                        onChange={(e) => setRadiusSpeedOscSpeed(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Min: {radiusSpeedOscMin.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={radiusSpeedOscMin}
                        onChange={(e) => setRadiusSpeedOscMin(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Max: {radiusSpeedOscMax.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={radiusSpeedOscMax}
                        onChange={(e) => setRadiusSpeedOscMax(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="radiusOscillationMin"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Min Radius: {radiusOscillationMin}
                </label>
                <input
                  id="radiusOscillationMin"
                  type="range"
                  min="20"
                  max="800"
                  value={radiusOscillationMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRadiusOscillationMin(val);
                    if (val > radiusOscillationMax) setRadiusOscillationMax(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="radiusOscillationMax"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Max Radius: {radiusOscillationMax}
                </label>
                <input
                  id="radiusOscillationMax"
                  type="range"
                  min="20"
                  max="800"
                  value={radiusOscillationMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRadiusOscillationMax(val);
                    if (val < radiusOscillationMin) setRadiusOscillationMin(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: "20px",
            marginTop: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={layerOscillationEnabled}
                onChange={(e) => setLayerOscillationEnabled(e.target.checked)}
                style={{
                  marginRight: "8px",
                  cursor: "pointer",
                }}
              />
              Enable Layer Oscillation
            </label>
          </div>

          {layerOscillationEnabled && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="layerOscillationFunction"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Layer Function
                </label>
                <select
                  id="layerOscillationFunction"
                  value={layerOscillationFunction}
                  onChange={(e) => setLayerOscillationFunction(e.target.value as WaveFunction)}
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
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="abs-sin">Absolute Sine</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="layerOscillationSpeed"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Speed: {layerOscillationSpeed.toFixed(2)}
                </label>
                <input
                  id="layerOscillationSpeed"
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={layerOscillationSpeed}
                  onChange={(e) => setLayerOscillationSpeed(Number(e.target.value))}
                  disabled={layerSpeedOscEnabled}
                  style={{
                    width: "100%",
                    cursor: layerSpeedOscEnabled ? "not-allowed" : "pointer",
                    opacity: layerSpeedOscEnabled ? 0.5 : 1,
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#aaa",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={layerSpeedOscEnabled}
                    onChange={(e) => setLayerSpeedOscEnabled(e.target.checked)}
                    style={{
                      marginRight: "6px",
                      cursor: "pointer",
                    }}
                  />
                  Oscillate Speed
                </label>
                {layerSpeedOscEnabled && (
                  <div style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid #444" }}>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa", marginBottom: "4px", display: "block" }}>
                        Function
                      </label>
                      <select
                        value={layerSpeedOscFunction}
                        onChange={(e) => setLayerSpeedOscFunction(e.target.value as WaveFunction)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: "4px",
                          background: "#1a1a1a",
                          color: "#fff",
                          border: "1px solid #333",
                          fontSize: "11px",
                        }}
                      >
                        <option value="sin">Sine</option>
                        <option value="cos">Cosine</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Meta-Speed: {layerSpeedOscSpeed.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.05"
                        max="20"
                        step="0.05"
                        value={layerSpeedOscSpeed}
                        onChange={(e) => setLayerSpeedOscSpeed(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ marginBottom: "12px", fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Min: {layerSpeedOscMin.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={layerSpeedOscMin}
                        onChange={(e) => setLayerSpeedOscMin(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <label style={{ color: "#aaa" }}>Max: {layerSpeedOscMax.toFixed(1)}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={layerSpeedOscMax}
                        onChange={(e) => setLayerSpeedOscMax(Number(e.target.value))}
                        style={{ width: "100%", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="layerOscillationMin"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Min Layers: {layerOscillationMin}
                </label>
                <input
                  id="layerOscillationMin"
                  type="range"
                  min="1"
                  max="24"
                  value={layerOscillationMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayerOscillationMin(val);
                    if (val > layerOscillationMax) setLayerOscillationMax(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="layerOscillationMax"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  Max Layers: {layerOscillationMax}
                </label>
                <input
                  id="layerOscillationMax"
                  type="range"
                  min="1"
                  max="24"
                  value={layerOscillationMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayerOscillationMax(val);
                    if (val < layerOscillationMin) setLayerOscillationMin(val);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
