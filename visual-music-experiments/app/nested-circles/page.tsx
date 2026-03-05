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

  // Pulsing (radius oscillation)
  const [pulseEnabled, setPulseEnabled] = useState(false);
  const [pulseSpeed, setPulseSpeed] = useState(1);
  const [pulseAmount, setPulseAmount] = useState(0.2);
  const [pulseWave, setPulseWave] = useState<WaveFunction>("sin");
  const [pulseByDepth, setPulseByDepth] = useState(true);

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

  // Time delay (ripples from innermost depth outward)
  const [timeDelay, setTimeDelay] = useState(0);
  const [timeDelayOscEnabled, setTimeDelayOscEnabled] = useState(false);
  const [timeDelayOscSpeed, setTimeDelayOscSpeed] = useState(0.3);
  const [timeDelayOscMin, setTimeDelayOscMin] = useState(0);
  const [timeDelayOscMax, setTimeDelayOscMax] = useState(1.0);
  const [timeDelayOscWave, setTimeDelayOscWave] = useState<WaveFunction>("sin");

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
  const pulseEnabledRef = useRef(pulseEnabled);
  const pulseSpeedRef = useRef(pulseSpeed);
  const pulseAmountRef = useRef(pulseAmount);
  const pulseWaveRef = useRef(pulseWave);
  const pulseByDepthRef = useRef(pulseByDepth);
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
  useEffect(() => { pulseEnabledRef.current = pulseEnabled; }, [pulseEnabled]);
  useEffect(() => { pulseSpeedRef.current = pulseSpeed; }, [pulseSpeed]);
  useEffect(() => { pulseAmountRef.current = pulseAmount; }, [pulseAmount]);
  useEffect(() => { pulseWaveRef.current = pulseWave; }, [pulseWave]);
  useEffect(() => { pulseByDepthRef.current = pulseByDepth; }, [pulseByDepth]);
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

    const drawNestedCircles = (
      cx: number,
      cy: number,
      radius: number,
      currentDepth: number,
      maxDepth: number,
      globalT: number,
      parentIndex: number,
    ) => {
      // Time delay: innermost circles lead, rippling outward
      // Deepest depth (maxDepth) uses globalT, shallower levels are delayed
      let delay = timeDelayRef.current;
      if (timeDelayOscEnabledRef.current) {
        const dWave = waveFunctions[timeDelayOscWaveRef.current];
        const norm = (dWave(globalT * timeDelayOscSpeedRef.current) + 1) / 2;
        delay = timeDelayOscMinRef.current + norm * (timeDelayOscMaxRef.current - timeDelayOscMinRef.current);
      }
      const depthFromInner = maxDepth - currentDepth;
      const t = globalT - delay * depthFromInner;

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

      // Child circle radius
      let childRadius = radius * radiusRatioRef.current;

      // Apply pulse
      if (pulseEnabledRef.current) {
        const pWave = waveFunctions[pulseWaveRef.current];
        const phaseOffset = pulseByDepthRef.current ? currentDepth * 0.8 : 0;
        const pulse = pWave(t * pulseSpeedRef.current + phaseOffset);
        childRadius *= 1 + pulse * pulseAmountRef.current;
      }

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

      for (let i = 0; i < children; i++) {
        const angle = rotAngle + (i / children) * Math.PI * 2;
        const childCx = cx + Math.cos(angle) * orbitRadius;
        const childCy = cy + Math.sin(angle) * orbitRadius;

        // Only recurse/draw if this child is visible
        if (i < visible) {
          drawNestedCircles(childCx, childCy, childRadius, currentDepth + 1, maxDepth, globalT, i);
        }
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
            top: 0,
            left: 0,
            bottom: 0,
            width: "280px",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            padding: "16px",
            overflowY: "auto",
            color: "#fff",
            fontSize: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <h2 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 500 }}>Nested Circles</h2>

          {/* Structure */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Structure</div>

            <div style={labelStyle}><span>Depth</span><span>{depth}</span></div>
            <input type="range" min={1} max={5} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Children per ring</span><span>{childCount}</span></div>
            <input type="range" min={2} max={12} step={1} value={childCount} onChange={(e) => setChildCount(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Base radius</span><span>{baseRadius}</span></div>
            <input type="range" min={50} max={500} step={10} value={baseRadius} onChange={(e) => setBaseRadius(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Radius ratio</span><span>{radiusRatio.toFixed(2)}</span></div>
            <input type="range" min={0.1} max={0.6} step={0.01} value={radiusRatio} onChange={(e) => setRadiusRatio(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Line width</span><span>{lineWidth.toFixed(1)}</span></div>
            <input type="range" min={0.5} max={4} step={0.1} value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} style={sliderStyle} />

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={drawOuterCircles} onChange={(e) => setDrawOuterCircles(e.target.checked)} />
              Draw outer circles
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={drawLeafCircles} onChange={(e) => setDrawLeafCircles(e.target.checked)} />
              Draw leaf circles
            </label>
          </div>

          {/* Rotation */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Rotation</div>

            <div style={labelStyle}><span>Speed</span><span>{rotationSpeed.toFixed(2)}</span></div>
            <input type="range" min={0} max={3} step={0.01} value={rotationSpeed} onChange={(e) => setRotationSpeed(+e.target.value)} style={sliderStyle} />

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={alternateDirection} onChange={(e) => setAlternateDirection(e.target.checked)} />
              Alternate direction per depth
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer", marginTop: "4px" }}>
              <input type="checkbox" checked={rotationOscEnabled} onChange={(e) => setRotationOscEnabled(e.target.checked)} />
              Oscillate speed
            </label>
            {rotationOscEnabled && (
              <>
                <div style={labelStyle}><span>Wave</span></div>
                <select value={rotationWave} onChange={(e) => setRotationWave(e.target.value as WaveFunction)} style={selectStyle}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <div style={labelStyle}><span>Osc speed</span><span>{rotationOscSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.01} max={3} step={0.01} value={rotationOscSpeed} onChange={(e) => setRotationOscSpeed(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Min</span><span>{rotationOscMin.toFixed(2)}</span></div>
                <input type="range" min={0} max={3} step={0.01} value={rotationOscMin} onChange={(e) => setRotationOscMin(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Max</span><span>{rotationOscMax.toFixed(2)}</span></div>
                <input type="range" min={0} max={3} step={0.01} value={rotationOscMax} onChange={(e) => setRotationOscMax(+e.target.value)} style={sliderStyle} />
              </>
            )}
          </div>

          {/* Pulse */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Pulse</div>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={pulseEnabled} onChange={(e) => setPulseEnabled(e.target.checked)} />
              Enable pulse
            </label>
            {pulseEnabled && (
              <>
                <div style={labelStyle}><span>Wave</span></div>
                <select value={pulseWave} onChange={(e) => setPulseWave(e.target.value as WaveFunction)} style={selectStyle}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <div style={labelStyle}><span>Speed</span><span>{pulseSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.1} max={5} step={0.1} value={pulseSpeed} onChange={(e) => setPulseSpeed(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Amount</span><span>{pulseAmount.toFixed(2)}</span></div>
                <input type="range" min={0} max={0.5} step={0.01} value={pulseAmount} onChange={(e) => setPulseAmount(+e.target.value)} style={sliderStyle} />
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
                  <input type="checkbox" checked={pulseByDepth} onChange={(e) => setPulseByDepth(e.target.checked)} />
                  Phase offset by depth
                </label>
              </>
            )}
          </div>

          {/* Child count oscillation */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Child Count Oscillation</div>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={childOscEnabled} onChange={(e) => setChildOscEnabled(e.target.checked)} />
              Oscillate child count
            </label>
            {childOscEnabled && (
              <>
                <div style={labelStyle}><span>Wave</span></div>
                <select value={childOscWave} onChange={(e) => setChildOscWave(e.target.value as WaveFunction)} style={selectStyle}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <div style={labelStyle}><span>Speed</span><span>{childOscSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.05} max={3} step={0.05} value={childOscSpeed} onChange={(e) => setChildOscSpeed(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Min</span><span>{childOscMin}</span></div>
                <input type="range" min={2} max={12} step={1} value={childOscMin} onChange={(e) => setChildOscMin(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Max</span><span>{childOscMax}</span></div>
                <input type="range" min={2} max={12} step={1} value={childOscMax} onChange={(e) => setChildOscMax(+e.target.value)} style={sliderStyle} />
              </>
            )}
          </div>

          {/* Visible Children */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Visible Children</div>

            <div style={labelStyle}><span>Visible</span><span>{visibleChildren}</span></div>
            <input type="range" min={1} max={12} step={1} value={visibleChildren} onChange={(e) => setVisibleChildren(+e.target.value)} style={sliderStyle} />

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={visibleOscEnabled} onChange={(e) => setVisibleOscEnabled(e.target.checked)} />
              Oscillate visible count
            </label>
            {visibleOscEnabled && (
              <>
                <div style={labelStyle}><span>Wave</span></div>
                <select value={visibleOscWave} onChange={(e) => setVisibleOscWave(e.target.value as WaveFunction)} style={selectStyle}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <div style={labelStyle}><span>Speed</span><span>{visibleOscSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.05} max={3} step={0.05} value={visibleOscSpeed} onChange={(e) => setVisibleOscSpeed(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Min</span><span>{visibleOscMin}</span></div>
                <input type="range" min={1} max={12} step={1} value={visibleOscMin} onChange={(e) => setVisibleOscMin(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Max</span><span>{visibleOscMax}</span></div>
                <input type="range" min={1} max={12} step={1} value={visibleOscMax} onChange={(e) => setVisibleOscMax(+e.target.value)} style={sliderStyle} />
              </>
            )}
          </div>

          {/* Time Delay */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Time Delay (Inner → Outer)</div>

            <div style={labelStyle}><span>Delay</span><span>{timeDelay.toFixed(2)}s</span></div>
            <input type="range" min={0} max={2} step={0.01} value={timeDelay} onChange={(e) => setTimeDelay(+e.target.value)} style={sliderStyle} />

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={timeDelayOscEnabled} onChange={(e) => setTimeDelayOscEnabled(e.target.checked)} />
              Oscillate delay
            </label>
            {timeDelayOscEnabled && (
              <>
                <div style={labelStyle}><span>Wave</span></div>
                <select value={timeDelayOscWave} onChange={(e) => setTimeDelayOscWave(e.target.value as WaveFunction)} style={selectStyle}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <div style={labelStyle}><span>Speed</span><span>{timeDelayOscSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.05} max={3} step={0.05} value={timeDelayOscSpeed} onChange={(e) => setTimeDelayOscSpeed(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Min</span><span>{timeDelayOscMin.toFixed(2)}s</span></div>
                <input type="range" min={0} max={2} step={0.01} value={timeDelayOscMin} onChange={(e) => setTimeDelayOscMin(+e.target.value)} style={sliderStyle} />
                <div style={labelStyle}><span>Max</span><span>{timeDelayOscMax.toFixed(2)}s</span></div>
                <input type="range" min={0} max={2} step={0.01} value={timeDelayOscMax} onChange={(e) => setTimeDelayOscMax(+e.target.value)} style={sliderStyle} />
              </>
            )}
          </div>

          {/* Color */}
          <div style={sectionStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#4488ff" }}>Color</div>

            <div style={labelStyle}><span>Palette</span></div>
            <select value={colorPalette} onChange={(e) => setColorPalette(e.target.value as ColorPalette)} style={selectStyle}>
              {paletteNames.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <div style={labelStyle}><span>Base hue</span><span>{baseHue}</span></div>
            <input type="range" min={0} max={360} step={1} value={baseHue} onChange={(e) => setBaseHue(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Saturation</span><span>{saturation}%</span></div>
            <input type="range" min={0} max={100} step={1} value={saturation} onChange={(e) => setSaturation(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Lightness</span><span>{lightness}%</span></div>
            <input type="range" min={10} max={90} step={1} value={lightness} onChange={(e) => setLightness(+e.target.value)} style={sliderStyle} />

            <div style={labelStyle}><span>Opacity</span><span>{opacity.toFixed(2)}</span></div>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} style={sliderStyle} />

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={hueByDepth} onChange={(e) => setHueByDepth(e.target.checked)} />
              Color by depth (vs. by index)
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
              <input type="checkbox" checked={hueOscEnabled} onChange={(e) => setHueOscEnabled(e.target.checked)} />
              Oscillate hue
            </label>
            {hueOscEnabled && (
              <>
                <div style={labelStyle}><span>Hue osc speed</span><span>{hueOscSpeed.toFixed(2)}</span></div>
                <input type="range" min={0.05} max={3} step={0.05} value={hueOscSpeed} onChange={(e) => setHueOscSpeed(+e.target.value)} style={sliderStyle} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
