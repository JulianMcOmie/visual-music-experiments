"use client";

import { useEffect, useRef, useState } from "react";

type WaveFunction = "sin" | "cos" | "abs-sin" | "abs-cos" | "square" | "sawtooth" | "triangle";
type ColorPalette = "analogous" | "complementary" | "triadic" | "warm" | "cool" | "sunset" | "ocean" | "forest" | "monochrome";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  "abs-sin": (x) => Math.abs(Math.sin(x)),
  "abs-cos": (x) => Math.abs(Math.cos(x)),
  square: (x) => (Math.sin(x) >= 0 ? 1 : -1),
  sawtooth: (x) => 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5)),
  triangle: (x) => Math.abs((x / Math.PI) % 2 - 1) * 2 - 1,
};

const colorPalettes: Record<ColorPalette, (baseHue: number, index: number, total: number) => number> = {
  analogous: (base, index, total) => base + (index / total) * 60 - 30,
  complementary: (base, index) => index % 2 === 0 ? base : base + 180,
  triadic: (base, index) => base + (index % 3) * 120,
  warm: (_base, index, total) => 0 + (index / total) * 60,
  cool: (_base, index, total) => 180 + (index / total) * 60,
  sunset: (_base, index, total) => 0 + (index / total) * 90,
  ocean: (_base, index, total) => 180 + (index / total) * 100,
  forest: (_base, index, total) => 90 + (index / total) * 80,
  monochrome: (base) => base,
};

const waveFnNames: WaveFunction[] = ["sin", "cos", "abs-sin", "abs-cos", "square", "sawtooth", "triangle"];
const paletteNames: ColorPalette[] = ["analogous", "complementary", "triadic", "warm", "cool", "sunset", "ocean", "forest", "monochrome"];

// Slider styling helper
const sliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "#4488ff",
  cursor: "pointer",
};
const labelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  color: "#aaa",
  marginBottom: "2px",
};
const sectionStyle: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.1)",
  paddingTop: "10px",
  marginTop: "6px",
};
const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "#222",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "4px",
  padding: "4px",
  fontSize: "12px",
};

export default function NestedCircles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const [isPreview, setIsPreview] = useState(false);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const pausedRef = useRef(false);

  // Structure
  const [depth, setDepth] = useState(3);
  const [childCount, setChildCount] = useState(6);
  const [baseRadius, setBaseRadius] = useState(200);
  const [radiusRatio, setRadiusRatio] = useState(0.35);
  const [drawOuterCircles, setDrawOuterCircles] = useState(true);
  const [drawLeafCircles, setDrawLeafCircles] = useState(true);
  const [lineWidth, setLineWidth] = useState(1.5);

  // Rotation
  const [rotationSpeed, setRotationSpeed] = useState(0.3);
  const [alternateDirection, setAlternateDirection] = useState(true);
  const [rotationWave, setRotationWave] = useState<WaveFunction>("sin");
  const [rotationOscEnabled, setRotationOscEnabled] = useState(false);
  const [rotationOscSpeed, setRotationOscSpeed] = useState(0.5);
  const [rotationOscMin, setRotationOscMin] = useState(0.1);
  const [rotationOscMax, setRotationOscMax] = useState(1.0);

  // Radius oscillation
  const [radiusOscEnabled, setRadiusOscEnabled] = useState(false);
  const [radiusOscSpeed, setRadiusOscSpeed] = useState(1);
  const [radiusOscMin, setRadiusOscMin] = useState(0.15);
  const [radiusOscMax, setRadiusOscMax] = useState(0.5);
  const [radiusOscWave, setRadiusOscWave] = useState<WaveFunction>("sin");
  const [radiusOscByDepth, setRadiusOscByDepth] = useState(true);

  // Child count oscillation
  const [childOscEnabled, setChildOscEnabled] = useState(false);
  const [childOscSpeed, setChildOscSpeed] = useState(0.3);
  const [childOscMin, setChildOscMin] = useState(3);
  const [childOscMax, setChildOscMax] = useState(10);
  const [childOscWave, setChildOscWave] = useState<WaveFunction>("sin");

  // Visible children (how many of the positioned children are drawn)
  const [visibleChildren, setVisibleChildren] = useState(6);
  const [visibleOscEnabled, setVisibleOscEnabled] = useState(false);
  const [visibleOscSpeed, setVisibleOscSpeed] = useState(0.5);
  const [visibleOscMin, setVisibleOscMin] = useState(2);
  const [visibleOscMax, setVisibleOscMax] = useState(6);
  const [visibleOscWave, setVisibleOscWave] = useState<WaveFunction>("sin");

  // Time delay — depth (ripples from innermost depth outward)
  const [timeDelay, setTimeDelay] = useState(0);
  const [timeDelayOscEnabled, setTimeDelayOscEnabled] = useState(false);
  const [timeDelayOscSpeed, setTimeDelayOscSpeed] = useState(0.3);
  const [timeDelayOscMin, setTimeDelayOscMin] = useState(0);
  const [timeDelayOscMax, setTimeDelayOscMax] = useState(1.0);
  const [timeDelayOscWave, setTimeDelayOscWave] = useState<WaveFunction>("sin");

  // Time delay — ring (each child in a ring is offset by index)
  const [ringDelay, setRingDelay] = useState(0);
  const [ringDelayOscEnabled, setRingDelayOscEnabled] = useState(false);
  const [ringDelayOscSpeed, setRingDelayOscSpeed] = useState(0.3);
  const [ringDelayOscMin, setRingDelayOscMin] = useState(0);
  const [ringDelayOscMax, setRingDelayOscMax] = useState(0.5);
  const [ringDelayOscWave, setRingDelayOscWave] = useState<WaveFunction>("sin");

  // Color
  const [colorPalette, setColorPalette] = useState<ColorPalette>("ocean");
  const [baseHue, setBaseHue] = useState(200);
  const [saturation, setSaturation] = useState(70);
  const [lightness, setLightness] = useState(60);
  const [opacity, setOpacity] = useState(0.8);
  const [hueByDepth, setHueByDepth] = useState(true);
  const [hueOscEnabled, setHueOscEnabled] = useState(false);
  const [hueOscSpeed, setHueOscSpeed] = useState(0.5);

  // Store refs for animation loop
  const depthRef = useRef(depth);
  const childCountRef = useRef(childCount);
  const baseRadiusRef = useRef(baseRadius);
  const radiusRatioRef = useRef(radiusRatio);
  const drawOuterCirclesRef = useRef(drawOuterCircles);
  const drawLeafCirclesRef = useRef(drawLeafCircles);
  const lineWidthRef = useRef(lineWidth);
  const rotationSpeedRef = useRef(rotationSpeed);
  const alternateDirectionRef = useRef(alternateDirection);
  const rotationWaveRef = useRef(rotationWave);
  const rotationOscEnabledRef = useRef(rotationOscEnabled);
  const rotationOscSpeedRef = useRef(rotationOscSpeed);
  const rotationOscMinRef = useRef(rotationOscMin);
  const rotationOscMaxRef = useRef(rotationOscMax);
  const radiusOscEnabledRef = useRef(radiusOscEnabled);
  const radiusOscSpeedRef = useRef(radiusOscSpeed);
  const radiusOscMinRef = useRef(radiusOscMin);
  const radiusOscMaxRef = useRef(radiusOscMax);
  const radiusOscWaveRef = useRef(radiusOscWave);
  const radiusOscByDepthRef = useRef(radiusOscByDepth);
  const childOscEnabledRef = useRef(childOscEnabled);
  const childOscSpeedRef = useRef(childOscSpeed);
  const childOscMinRef = useRef(childOscMin);
  const childOscMaxRef = useRef(childOscMax);
  const childOscWaveRef = useRef(childOscWave);
  const visibleChildrenRef = useRef(visibleChildren);
  const visibleOscEnabledRef = useRef(visibleOscEnabled);
  const visibleOscSpeedRef = useRef(visibleOscSpeed);
  const visibleOscMinRef = useRef(visibleOscMin);
  const visibleOscMaxRef = useRef(visibleOscMax);
  const visibleOscWaveRef = useRef(visibleOscWave);
  const timeDelayRef = useRef(timeDelay);
  const timeDelayOscEnabledRef = useRef(timeDelayOscEnabled);
  const timeDelayOscSpeedRef = useRef(timeDelayOscSpeed);
  const timeDelayOscMinRef = useRef(timeDelayOscMin);
  const timeDelayOscMaxRef = useRef(timeDelayOscMax);
  const timeDelayOscWaveRef = useRef(timeDelayOscWave);
  const ringDelayRef = useRef(ringDelay);
  const ringDelayOscEnabledRef = useRef(ringDelayOscEnabled);
  const ringDelayOscSpeedRef = useRef(ringDelayOscSpeed);
  const ringDelayOscMinRef = useRef(ringDelayOscMin);
  const ringDelayOscMaxRef = useRef(ringDelayOscMax);
  const ringDelayOscWaveRef = useRef(ringDelayOscWave);
  const colorPaletteRef = useRef(colorPalette);
  const baseHueRef = useRef(baseHue);
  const saturationRef = useRef(saturation);
  const lightnessRef = useRef(lightness);
  const opacityRef = useRef(opacity);
  const hueByDepthRef = useRef(hueByDepth);
  const hueOscEnabledRef = useRef(hueOscEnabled);
  const hueOscSpeedRef = useRef(hueOscSpeed);

  // Sync refs
  useEffect(() => { depthRef.current = depth; }, [depth]);
  useEffect(() => { childCountRef.current = childCount; }, [childCount]);
  useEffect(() => { baseRadiusRef.current = baseRadius; }, [baseRadius]);
  useEffect(() => { radiusRatioRef.current = radiusRatio; }, [radiusRatio]);
  useEffect(() => { drawOuterCirclesRef.current = drawOuterCircles; }, [drawOuterCircles]);
  useEffect(() => { drawLeafCirclesRef.current = drawLeafCircles; }, [drawLeafCircles]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);
  useEffect(() => { rotationSpeedRef.current = rotationSpeed; }, [rotationSpeed]);
  useEffect(() => { alternateDirectionRef.current = alternateDirection; }, [alternateDirection]);
  useEffect(() => { rotationWaveRef.current = rotationWave; }, [rotationWave]);
  useEffect(() => { rotationOscEnabledRef.current = rotationOscEnabled; }, [rotationOscEnabled]);
  useEffect(() => { rotationOscSpeedRef.current = rotationOscSpeed; }, [rotationOscSpeed]);
  useEffect(() => { rotationOscMinRef.current = rotationOscMin; }, [rotationOscMin]);
  useEffect(() => { rotationOscMaxRef.current = rotationOscMax; }, [rotationOscMax]);
  useEffect(() => { radiusOscEnabledRef.current = radiusOscEnabled; }, [radiusOscEnabled]);
  useEffect(() => { radiusOscSpeedRef.current = radiusOscSpeed; }, [radiusOscSpeed]);
  useEffect(() => { radiusOscMinRef.current = radiusOscMin; }, [radiusOscMin]);
  useEffect(() => { radiusOscMaxRef.current = radiusOscMax; }, [radiusOscMax]);
  useEffect(() => { radiusOscWaveRef.current = radiusOscWave; }, [radiusOscWave]);
  useEffect(() => { radiusOscByDepthRef.current = radiusOscByDepth; }, [radiusOscByDepth]);
  useEffect(() => { childOscEnabledRef.current = childOscEnabled; }, [childOscEnabled]);
  useEffect(() => { childOscSpeedRef.current = childOscSpeed; }, [childOscSpeed]);
  useEffect(() => { childOscMinRef.current = childOscMin; }, [childOscMin]);
  useEffect(() => { childOscMaxRef.current = childOscMax; }, [childOscMax]);
  useEffect(() => { childOscWaveRef.current = childOscWave; }, [childOscWave]);
  useEffect(() => { visibleChildrenRef.current = visibleChildren; }, [visibleChildren]);
  useEffect(() => { visibleOscEnabledRef.current = visibleOscEnabled; }, [visibleOscEnabled]);
  useEffect(() => { visibleOscSpeedRef.current = visibleOscSpeed; }, [visibleOscSpeed]);
  useEffect(() => { visibleOscMinRef.current = visibleOscMin; }, [visibleOscMin]);
  useEffect(() => { visibleOscMaxRef.current = visibleOscMax; }, [visibleOscMax]);
  useEffect(() => { visibleOscWaveRef.current = visibleOscWave; }, [visibleOscWave]);
  useEffect(() => { timeDelayRef.current = timeDelay; }, [timeDelay]);
  useEffect(() => { timeDelayOscEnabledRef.current = timeDelayOscEnabled; }, [timeDelayOscEnabled]);
  useEffect(() => { timeDelayOscSpeedRef.current = timeDelayOscSpeed; }, [timeDelayOscSpeed]);
  useEffect(() => { timeDelayOscMinRef.current = timeDelayOscMin; }, [timeDelayOscMin]);
  useEffect(() => { timeDelayOscMaxRef.current = timeDelayOscMax; }, [timeDelayOscMax]);
  useEffect(() => { timeDelayOscWaveRef.current = timeDelayOscWave; }, [timeDelayOscWave]);
  useEffect(() => { ringDelayRef.current = ringDelay; }, [ringDelay]);
  useEffect(() => { ringDelayOscEnabledRef.current = ringDelayOscEnabled; }, [ringDelayOscEnabled]);
  useEffect(() => { ringDelayOscSpeedRef.current = ringDelayOscSpeed; }, [ringDelayOscSpeed]);
  useEffect(() => { ringDelayOscMinRef.current = ringDelayOscMin; }, [ringDelayOscMin]);
  useEffect(() => { ringDelayOscMaxRef.current = ringDelayOscMax; }, [ringDelayOscMax]);
  useEffect(() => { ringDelayOscWaveRef.current = ringDelayOscWave; }, [ringDelayOscWave]);
  useEffect(() => { colorPaletteRef.current = colorPalette; }, [colorPalette]);
  useEffect(() => { baseHueRef.current = baseHue; }, [baseHue]);
  useEffect(() => { saturationRef.current = saturation; }, [saturation]);
  useEffect(() => { lightnessRef.current = lightness; }, [lightness]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { hueByDepthRef.current = hueByDepth; }, [hueByDepth]);
  useEffect(() => { hueOscEnabledRef.current = hueOscEnabled; }, [hueOscEnabled]);
  useEffect(() => { hueOscSpeedRef.current = hueOscSpeed; }, [hueOscSpeed]);

  // Preview mode
  useEffect(() => {
    if (window.location.search.includes("preview")) {
      setIsPreview(true);
      pausedRef.current = true;
    }
  }, []);
  useEffect(() => {
    if (!isPreview) return;
    const handler = (e: MessageEvent) => {
      if (e.data === "play") pausedRef.current = false;
      if (e.data === "pause") pausedRef.current = true;
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

  // Animation
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

    // Compute ring delay amount at a given time
    const getRingDelay = (globalT: number) => {
      let rDelay = ringDelayRef.current;
      if (ringDelayOscEnabledRef.current) {
        const rWave = waveFunctions[ringDelayOscWaveRef.current];
        const norm = (rWave(globalT * ringDelayOscSpeedRef.current) + 1) / 2;
        rDelay = ringDelayOscMinRef.current + norm * (ringDelayOscMaxRef.current - ringDelayOscMinRef.current);
      }
      return rDelay;
    };

    const drawNestedCircles = (
      cx: number,
      cy: number,
      radius: number,
      currentDepth: number,
      maxDepth: number,
      globalT: number,
      parentIndex: number,
    ) => {
      // Time delay — depth: innermost circles lead, rippling outward
      let depthDelay = timeDelayRef.current;
      if (timeDelayOscEnabledRef.current) {
        const dWave = waveFunctions[timeDelayOscWaveRef.current];
        const norm = (dWave(globalT * timeDelayOscSpeedRef.current) + 1) / 2;
        depthDelay = timeDelayOscMinRef.current + norm * (timeDelayOscMaxRef.current - timeDelayOscMinRef.current);
      }
      const depthFromInner = maxDepth - currentDepth;
      const t = globalT - depthDelay * depthFromInner;

      const paletteFunc = colorPalettes[colorPaletteRef.current];

      // Compute current hue
      let hue = baseHueRef.current;
      if (hueOscEnabledRef.current) {
        hue += waveFunctions.sin(t * hueOscSpeedRef.current) * 60;
      }
      if (hueByDepthRef.current) {
        hue = paletteFunc(hue, currentDepth, maxDepth);
      } else {
        hue = paletteFunc(hue, parentIndex, childCountRef.current);
      }

      const s = saturationRef.current;
      const l = lightnessRef.current - currentDepth * 5;
      const a = opacityRef.current;

      // Draw this circle
      const isLeaf = currentDepth >= maxDepth;
      if (isLeaf && drawLeafCirclesRef.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${s}%, ${Math.max(l, 20)}%, ${a})`;
        ctx.lineWidth = lineWidthRef.current;
        ctx.stroke();
      } else if (!isLeaf && drawOuterCirclesRef.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${s}%, ${Math.max(l, 20)}%, ${a * 0.5})`;
        ctx.lineWidth = lineWidthRef.current;
        ctx.stroke();
      }

      if (isLeaf) return;

      // How many children are positioned at this level
      let children = childCountRef.current;
      if (childOscEnabledRef.current) {
        const wave = waveFunctions[childOscWaveRef.current];
        const norm = (wave(t * childOscSpeedRef.current) + 1) / 2;
        children = Math.round(childOscMinRef.current + norm * (childOscMaxRef.current - childOscMinRef.current));
        children = Math.max(2, children);
      }

      // How many of those children are visible
      let visible = Math.min(visibleChildrenRef.current, children);
      if (visibleOscEnabledRef.current) {
        const vWave = waveFunctions[visibleOscWaveRef.current];
        const norm = (vWave(t * visibleOscSpeedRef.current) + 1) / 2;
        visible = Math.round(visibleOscMinRef.current + norm * (visibleOscMaxRef.current - visibleOscMinRef.current));
      }
      visible = Math.max(1, Math.min(visible, children));

      // Child circle radius — oscillate the ratio between min and max
      let ratio = radiusRatioRef.current;
      if (radiusOscEnabledRef.current) {
        const rWave = waveFunctions[radiusOscWaveRef.current];
        const phaseOffset = radiusOscByDepthRef.current ? currentDepth * 0.8 : 0;
        const norm = (rWave(t * radiusOscSpeedRef.current + phaseOffset) + 1) / 2;
        ratio = radiusOscMinRef.current + norm * (radiusOscMaxRef.current - radiusOscMinRef.current);
      }
      const childRadius = radius * ratio;

      // Rotation for this depth level
      let speed = rotationSpeedRef.current;
      if (rotationOscEnabledRef.current) {
        const rWave = waveFunctions[rotationWaveRef.current];
        const norm = (rWave(t * rotationOscSpeedRef.current) + 1) / 2;
        speed = rotationOscMinRef.current + norm * (rotationOscMaxRef.current - rotationOscMinRef.current);
      }
      const dir = alternateDirectionRef.current ? (currentDepth % 2 === 0 ? 1 : -1) : 1;
      const rotAngle = t * speed * dir;

      // Distance from center to child centers
      const orbitRadius = radius - childRadius;

      // Ring delay: offset globalT per child so each subtree runs at a different time
      const ringDel = getRingDelay(globalT);

      for (let i = 0; i < children; i++) {
        if (i >= visible) continue;

        const angle = rotAngle + (i / children) * Math.PI * 2;
        const childCx = cx + Math.cos(angle) * orbitRadius;
        const childCy = cy + Math.sin(angle) * orbitRadius;

        // Pass offset globalT so the entire child subtree is time-shifted
        const childGlobalT = globalT - ringDel * (children > 1 ? i / (children - 1) : 0);
        drawNestedCircles(childCx, childCy, childRadius, currentDepth + 1, maxDepth, childGlobalT, i);
      }
    };

    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      if (!pausedRef.current) {
        timeRef.current += delta;
      }

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const t = timeRef.current;

      drawNestedCircles(centerX, centerY, baseRadiusRef.current, 0, depthRef.current, t, 0);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0a0a0a" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {!isPreview && (
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.7)",
          padding: "20px",
          borderRadius: "8px",
          width: "250px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: isControlPanelCollapsed ? "0" : "20px", paddingBottom: isControlPanelCollapsed ? "0" : "15px", borderBottom: isControlPanelCollapsed ? "none" : "1px solid #444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <a href="/" style={{ fontSize: "12px", color: "#4488ff", textDecoration: "none" }}>← Gallery</a>
            <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>
              Nested Circles
            </h2>
          </div>
          <button
            onClick={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)}
            style={{
              background: "transparent",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
              padding: "4px 8px",
              marginLeft: "10px",
            }}
            title={isControlPanelCollapsed ? "Expand controls" : "Collapse controls"}
          >
            {isControlPanelCollapsed ? "▼" : "▲"}
          </button>
        </div>

        {!isControlPanelCollapsed && (
        <>
        {/* Structure */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Depth: {depth}
          </label>
          <input type="range" min={1} max={10} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Children per Ring: {childCount}
          </label>
          <input type="range" min={2} max={12} step={1} value={childCount} onChange={(e) => setChildCount(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Base Radius: {baseRadius}
          </label>
          <input type="range" min={50} max={500} step={10} value={baseRadius} onChange={(e) => setBaseRadius(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Radius Ratio: {radiusRatio.toFixed(2)}
          </label>
          <input
            type="range" min={0.1} max={0.6} step={0.01} value={radiusRatio}
            onChange={(e) => setRadiusRatio(+e.target.value)}
            disabled={radiusOscEnabled}
            style={{ width: "100%", cursor: radiusOscEnabled ? "not-allowed" : "pointer", opacity: radiusOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Child circle size relative to parent
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Line Width: {lineWidth.toFixed(1)}
          </label>
          <input type="range" min={0.5} max={4} step={0.1} value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={drawOuterCircles} onChange={(e) => setDrawOuterCircles(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Draw Outer Circles
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={drawLeafCircles} onChange={(e) => setDrawLeafCircles(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Draw Leaf Circles
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Rotation Speed: {rotationSpeed.toFixed(2)}
          </label>
          <input
            type="range" min={0} max={3} step={0.01} value={rotationSpeed}
            onChange={(e) => setRotationSpeed(+e.target.value)}
            disabled={rotationOscEnabled}
            style={{ width: "100%", cursor: rotationOscEnabled ? "not-allowed" : "pointer", opacity: rotationOscEnabled ? 0.5 : 1 }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={alternateDirection} onChange={(e) => setAlternateDirection(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Alternate Direction per Depth
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Visible Children: {visibleChildren}
          </label>
          <input
            type="range" min={1} max={12} step={1} value={visibleChildren}
            onChange={(e) => setVisibleChildren(+e.target.value)}
            disabled={visibleOscEnabled}
            style={{ width: "100%", cursor: visibleOscEnabled ? "not-allowed" : "pointer", opacity: visibleOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            How many children in each ring are drawn
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Color Palette
          </label>
          <select
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", cursor: "pointer" }}
          >
            {paletteNames.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Hue: {baseHue}°
          </label>
          <input
            type="range" min={0} max={360} step={1} value={baseHue}
            onChange={(e) => setBaseHue(+e.target.value)}
            disabled={hueOscEnabled}
            style={{ width: "100%", cursor: hueOscEnabled ? "not-allowed" : "pointer", opacity: hueOscEnabled ? 0.5 : 1 }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Saturation: {saturation}%
          </label>
          <input type="range" min={0} max={100} step={1} value={saturation} onChange={(e) => setSaturation(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Lightness: {lightness}%
          </label>
          <input type="range" min={10} max={90} step={1} value={lightness} onChange={(e) => setLightness(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Opacity: {opacity.toFixed(2)}
          </label>
          <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={hueByDepth} onChange={(e) => setHueByDepth(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Color by Depth
          </label>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Colors vary by depth level vs. ring index
          </div>
        </div>

        {/* Depth Time Delay */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Depth Time Delay: {timeDelay.toFixed(2)}s
          </label>
          <input
            type="range" min={0} max={2} step={0.01} value={timeDelay}
            onChange={(e) => setTimeDelay(+e.target.value)}
            disabled={timeDelayOscEnabled}
            style={{ width: "100%", cursor: timeDelayOscEnabled ? "not-allowed" : "pointer", opacity: timeDelayOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Time offset between depth levels (inner leads)
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Ring Time Delay: {ringDelay.toFixed(2)}s
          </label>
          <input
            type="range" min={0} max={2} step={0.01} value={ringDelay}
            onChange={(e) => setRingDelay(+e.target.value)}
            disabled={ringDelayOscEnabled}
            style={{ width: "100%", cursor: ringDelayOscEnabled ? "not-allowed" : "pointer", opacity: ringDelayOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Time offset between children within each ring
          </div>
        </div>

        {/* Oscillator sections */}
        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={rotationOscEnabled} onChange={(e) => setRotationOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Rotation Oscillation
          </label>
          {rotationOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={rotationWave} onChange={(e) => setRotationWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {rotationOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.01} max={3} step={0.01} value={rotationOscSpeed} onChange={(e) => setRotationOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {rotationOscMin.toFixed(2)}</label>
                <input type="range" min={0} max={3} step={0.01} value={rotationOscMin} onChange={(e) => setRotationOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {rotationOscMax.toFixed(2)}</label>
                <input type="range" min={0} max={3} step={0.01} value={rotationOscMax} onChange={(e) => setRotationOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={radiusOscEnabled} onChange={(e) => setRadiusOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Radius Oscillation
          </label>
          {radiusOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={radiusOscWave} onChange={(e) => setRadiusOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {radiusOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={5} step={0.05} value={radiusOscSpeed} onChange={(e) => setRadiusOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min Ratio: {radiusOscMin.toFixed(2)}</label>
                <input type="range" min={0.05} max={0.6} step={0.01} value={radiusOscMin} onChange={(e) => setRadiusOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max Ratio: {radiusOscMax.toFixed(2)}</label>
                <input type="range" min={0.05} max={0.6} step={0.01} value={radiusOscMax} onChange={(e) => setRadiusOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
                <input type="checkbox" checked={radiusOscByDepth} onChange={(e) => setRadiusOscByDepth(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
                Phase offset by depth
              </label>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={childOscEnabled} onChange={(e) => setChildOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Child Count Oscillation
          </label>
          {childOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={childOscWave} onChange={(e) => setChildOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {childOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={3} step={0.05} value={childOscSpeed} onChange={(e) => setChildOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {childOscMin}</label>
                <input type="range" min={2} max={12} step={1} value={childOscMin} onChange={(e) => setChildOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {childOscMax}</label>
                <input type="range" min={2} max={12} step={1} value={childOscMax} onChange={(e) => setChildOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={visibleOscEnabled} onChange={(e) => setVisibleOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Visible Count Oscillation
          </label>
          {visibleOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={visibleOscWave} onChange={(e) => setVisibleOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {visibleOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={3} step={0.05} value={visibleOscSpeed} onChange={(e) => setVisibleOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {visibleOscMin}</label>
                <input type="range" min={1} max={12} step={1} value={visibleOscMin} onChange={(e) => setVisibleOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {visibleOscMax}</label>
                <input type="range" min={1} max={12} step={1} value={visibleOscMax} onChange={(e) => setVisibleOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={hueOscEnabled} onChange={(e) => setHueOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Hue Oscillation
          </label>
          {hueOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {hueOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={3} step={0.05} value={hueOscSpeed} onChange={(e) => setHueOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={timeDelayOscEnabled} onChange={(e) => setTimeDelayOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Depth Delay Oscillation
          </label>
          {timeDelayOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={timeDelayOscWave} onChange={(e) => setTimeDelayOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {timeDelayOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={3} step={0.05} value={timeDelayOscSpeed} onChange={(e) => setTimeDelayOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {timeDelayOscMin.toFixed(2)}s</label>
                <input type="range" min={0} max={2} step={0.01} value={timeDelayOscMin} onChange={(e) => setTimeDelayOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {timeDelayOscMax.toFixed(2)}s</label>
                <input type="range" min={0} max={2} step={0.01} value={timeDelayOscMax} onChange={(e) => setTimeDelayOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={ringDelayOscEnabled} onChange={(e) => setRingDelayOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Ring Delay Oscillation
          </label>
          {ringDelayOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={ringDelayOscWave} onChange={(e) => setRingDelayOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {ringDelayOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={3} step={0.05} value={ringDelayOscSpeed} onChange={(e) => setRingDelayOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {ringDelayOscMin.toFixed(2)}s</label>
                <input type="range" min={0} max={2} step={0.01} value={ringDelayOscMin} onChange={(e) => setRingDelayOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {ringDelayOscMax.toFixed(2)}s</label>
                <input type="range" min={0} max={2} step={0.01} value={ringDelayOscMax} onChange={(e) => setRingDelayOscMax(+e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>
      )}
    </div>
  );
}
