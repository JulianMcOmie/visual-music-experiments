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

const STORAGE_KEY = "nested-circles-settings";

const DEFAULTS = {
  depth: 3, childCount: 6, baseRadius: 200, radiusRatio: 0.35,
  drawOuterCircles: true, drawLeafCircles: true, lineWidth: 1.5,
  lineWidthOscEnabled: false, lineWidthOscSpeed: 1, lineWidthOscMin: 0.5, lineWidthOscMax: 3, lineWidthOscWave: "sin" as WaveFunction,
  rotationSpeed: 0.3, alternateDirection: true, rotationWave: "sin" as WaveFunction,
  rotationOscEnabled: false, rotationOscSpeed: 0.5, rotationOscMin: 0.1, rotationOscMax: 1.0,
  radiusOscEnabled: false, radiusOscSpeed: 1, radiusOscMin: 0.15, radiusOscMax: 0.5, radiusOscWave: "sin" as WaveFunction, radiusOscByDepth: true,
  childOscEnabled: false, childOscSpeed: 0.3, childOscMin: 3, childOscMax: 10, childOscWave: "sin" as WaveFunction,
  visibleChildren: 6, visibleOscEnabled: false, visibleOscSpeed: 0.5, visibleOscMin: 2, visibleOscMax: 6, visibleOscWave: "sin" as WaveFunction,
  timeDelay: 0, timeDelayOscEnabled: false, timeDelayOscSpeed: 0.3, timeDelayOscMin: 0, timeDelayOscMax: 1.0, timeDelayOscWave: "sin" as WaveFunction,
  ringDelay: 0, ringDelayOscEnabled: false, ringDelayOscSpeed: 0.3, ringDelayOscMin: 0, ringDelayOscMax: 0.5, ringDelayOscWave: "sin" as WaveFunction,
  colorPalette: "ocean" as ColorPalette, baseHue: 200, saturation: 70, lightness: 60, opacity: 0.8,
  hueByDepth: true, hueOscEnabled: false, hueOscSpeed: 0.5,
};

function loadSettings(): typeof DEFAULTS {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export default function NestedCircles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const [isPreview, setIsPreview] = useState(false);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const pausedRef = useRef(false);
  const settingsLoaded = useRef(false);

  // Debug info ref (written in animation loop) and state (read by UI on interval)
  const debugInfoRef = useRef({
    time: 0, fps: 0, depth: 0, children: 0, visibleChildren: 0,
    radiusRatio: 0, rotationSpeed: 0, rotationAngle: 0,
    depthDelay: 0, ringDelay: 0, hue: 0, baseRadius: 0, lineWidth: 0,
  });
  const [debugInfo, setDebugInfo] = useState({ ...debugInfoRef.current });

  // Structure
  const [depth, setDepth] = useState(DEFAULTS.depth);
  const [childCount, setChildCount] = useState(DEFAULTS.childCount);
  const [baseRadius, setBaseRadius] = useState(DEFAULTS.baseRadius);
  const [radiusRatio, setRadiusRatio] = useState(DEFAULTS.radiusRatio);
  const [drawOuterCircles, setDrawOuterCircles] = useState(DEFAULTS.drawOuterCircles);
  const [drawLeafCircles, setDrawLeafCircles] = useState(DEFAULTS.drawLeafCircles);
  const [lineWidth, setLineWidth] = useState(DEFAULTS.lineWidth);
  const [lineWidthOscEnabled, setLineWidthOscEnabled] = useState(DEFAULTS.lineWidthOscEnabled);
  const [lineWidthOscSpeed, setLineWidthOscSpeed] = useState(DEFAULTS.lineWidthOscSpeed);
  const [lineWidthOscMin, setLineWidthOscMin] = useState(DEFAULTS.lineWidthOscMin);
  const [lineWidthOscMax, setLineWidthOscMax] = useState(DEFAULTS.lineWidthOscMax);
  const [lineWidthOscWave, setLineWidthOscWave] = useState(DEFAULTS.lineWidthOscWave);

  // Rotation
  const [rotationSpeed, setRotationSpeed] = useState(DEFAULTS.rotationSpeed);
  const [alternateDirection, setAlternateDirection] = useState(DEFAULTS.alternateDirection);
  const [rotationWave, setRotationWave] = useState(DEFAULTS.rotationWave);
  const [rotationOscEnabled, setRotationOscEnabled] = useState(DEFAULTS.rotationOscEnabled);
  const [rotationOscSpeed, setRotationOscSpeed] = useState(DEFAULTS.rotationOscSpeed);
  const [rotationOscMin, setRotationOscMin] = useState(DEFAULTS.rotationOscMin);
  const [rotationOscMax, setRotationOscMax] = useState(DEFAULTS.rotationOscMax);

  // Radius oscillation
  const [radiusOscEnabled, setRadiusOscEnabled] = useState(DEFAULTS.radiusOscEnabled);
  const [radiusOscSpeed, setRadiusOscSpeed] = useState(DEFAULTS.radiusOscSpeed);
  const [radiusOscMin, setRadiusOscMin] = useState(DEFAULTS.radiusOscMin);
  const [radiusOscMax, setRadiusOscMax] = useState(DEFAULTS.radiusOscMax);
  const [radiusOscWave, setRadiusOscWave] = useState(DEFAULTS.radiusOscWave);
  const [radiusOscByDepth, setRadiusOscByDepth] = useState(DEFAULTS.radiusOscByDepth);

  // Child count oscillation
  const [childOscEnabled, setChildOscEnabled] = useState(DEFAULTS.childOscEnabled);
  const [childOscSpeed, setChildOscSpeed] = useState(DEFAULTS.childOscSpeed);
  const [childOscMin, setChildOscMin] = useState(DEFAULTS.childOscMin);
  const [childOscMax, setChildOscMax] = useState(DEFAULTS.childOscMax);
  const [childOscWave, setChildOscWave] = useState(DEFAULTS.childOscWave);

  // Visible children (how many of the positioned children are drawn)
  const [visibleChildren, setVisibleChildren] = useState(DEFAULTS.visibleChildren);
  const [visibleOscEnabled, setVisibleOscEnabled] = useState(DEFAULTS.visibleOscEnabled);
  const [visibleOscSpeed, setVisibleOscSpeed] = useState(DEFAULTS.visibleOscSpeed);
  const [visibleOscMin, setVisibleOscMin] = useState(DEFAULTS.visibleOscMin);
  const [visibleOscMax, setVisibleOscMax] = useState(DEFAULTS.visibleOscMax);
  const [visibleOscWave, setVisibleOscWave] = useState(DEFAULTS.visibleOscWave);

  // Time delay — depth (ripples from innermost depth outward)
  const [timeDelay, setTimeDelay] = useState(DEFAULTS.timeDelay);
  const [timeDelayOscEnabled, setTimeDelayOscEnabled] = useState(DEFAULTS.timeDelayOscEnabled);
  const [timeDelayOscSpeed, setTimeDelayOscSpeed] = useState(DEFAULTS.timeDelayOscSpeed);
  const [timeDelayOscMin, setTimeDelayOscMin] = useState(DEFAULTS.timeDelayOscMin);
  const [timeDelayOscMax, setTimeDelayOscMax] = useState(DEFAULTS.timeDelayOscMax);
  const [timeDelayOscWave, setTimeDelayOscWave] = useState(DEFAULTS.timeDelayOscWave);

  // Time delay — ring (each child in a ring is offset by index)
  const [ringDelay, setRingDelay] = useState(DEFAULTS.ringDelay);
  const [ringDelayOscEnabled, setRingDelayOscEnabled] = useState(DEFAULTS.ringDelayOscEnabled);
  const [ringDelayOscSpeed, setRingDelayOscSpeed] = useState(DEFAULTS.ringDelayOscSpeed);
  const [ringDelayOscMin, setRingDelayOscMin] = useState(DEFAULTS.ringDelayOscMin);
  const [ringDelayOscMax, setRingDelayOscMax] = useState(DEFAULTS.ringDelayOscMax);
  const [ringDelayOscWave, setRingDelayOscWave] = useState(DEFAULTS.ringDelayOscWave);

  // Color
  const [colorPalette, setColorPalette] = useState(DEFAULTS.colorPalette);
  const [baseHue, setBaseHue] = useState(DEFAULTS.baseHue);
  const [saturation, setSaturation] = useState(DEFAULTS.saturation);
  const [lightness, setLightness] = useState(DEFAULTS.lightness);
  const [opacity, setOpacity] = useState(DEFAULTS.opacity);
  const [hueByDepth, setHueByDepth] = useState(DEFAULTS.hueByDepth);
  const [hueOscEnabled, setHueOscEnabled] = useState(DEFAULTS.hueOscEnabled);
  const [hueOscSpeed, setHueOscSpeed] = useState(DEFAULTS.hueOscSpeed);

  // Load settings from localStorage on mount
  useEffect(() => {
    const s = loadSettings();
    setDepth(s.depth); setChildCount(s.childCount); setBaseRadius(s.baseRadius); setRadiusRatio(s.radiusRatio);
    setDrawOuterCircles(s.drawOuterCircles); setDrawLeafCircles(s.drawLeafCircles); setLineWidth(s.lineWidth);
    setLineWidthOscEnabled(s.lineWidthOscEnabled); setLineWidthOscSpeed(s.lineWidthOscSpeed);
    setLineWidthOscMin(s.lineWidthOscMin); setLineWidthOscMax(s.lineWidthOscMax); setLineWidthOscWave(s.lineWidthOscWave);
    setRotationSpeed(s.rotationSpeed); setAlternateDirection(s.alternateDirection); setRotationWave(s.rotationWave);
    setRotationOscEnabled(s.rotationOscEnabled); setRotationOscSpeed(s.rotationOscSpeed);
    setRotationOscMin(s.rotationOscMin); setRotationOscMax(s.rotationOscMax);
    setRadiusOscEnabled(s.radiusOscEnabled); setRadiusOscSpeed(s.radiusOscSpeed);
    setRadiusOscMin(s.radiusOscMin); setRadiusOscMax(s.radiusOscMax); setRadiusOscWave(s.radiusOscWave); setRadiusOscByDepth(s.radiusOscByDepth);
    setChildOscEnabled(s.childOscEnabled); setChildOscSpeed(s.childOscSpeed);
    setChildOscMin(s.childOscMin); setChildOscMax(s.childOscMax); setChildOscWave(s.childOscWave);
    setVisibleChildren(s.visibleChildren); setVisibleOscEnabled(s.visibleOscEnabled); setVisibleOscSpeed(s.visibleOscSpeed);
    setVisibleOscMin(s.visibleOscMin); setVisibleOscMax(s.visibleOscMax); setVisibleOscWave(s.visibleOscWave);
    setTimeDelay(s.timeDelay); setTimeDelayOscEnabled(s.timeDelayOscEnabled); setTimeDelayOscSpeed(s.timeDelayOscSpeed);
    setTimeDelayOscMin(s.timeDelayOscMin); setTimeDelayOscMax(s.timeDelayOscMax); setTimeDelayOscWave(s.timeDelayOscWave);
    setRingDelay(s.ringDelay); setRingDelayOscEnabled(s.ringDelayOscEnabled); setRingDelayOscSpeed(s.ringDelayOscSpeed);
    setRingDelayOscMin(s.ringDelayOscMin); setRingDelayOscMax(s.ringDelayOscMax); setRingDelayOscWave(s.ringDelayOscWave);
    setColorPalette(s.colorPalette); setBaseHue(s.baseHue); setSaturation(s.saturation);
    setLightness(s.lightness); setOpacity(s.opacity); setHueByDepth(s.hueByDepth);
    setHueOscEnabled(s.hueOscEnabled); setHueOscSpeed(s.hueOscSpeed);
    settingsLoaded.current = true;
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    if (!settingsLoaded.current) return;
    const settings = {
      depth, childCount, baseRadius, radiusRatio, drawOuterCircles, drawLeafCircles, lineWidth,
      lineWidthOscEnabled, lineWidthOscSpeed, lineWidthOscMin, lineWidthOscMax, lineWidthOscWave,
      rotationSpeed, alternateDirection, rotationWave, rotationOscEnabled, rotationOscSpeed, rotationOscMin, rotationOscMax,
      radiusOscEnabled, radiusOscSpeed, radiusOscMin, radiusOscMax, radiusOscWave, radiusOscByDepth,
      childOscEnabled, childOscSpeed, childOscMin, childOscMax, childOscWave,
      visibleChildren, visibleOscEnabled, visibleOscSpeed, visibleOscMin, visibleOscMax, visibleOscWave,
      timeDelay, timeDelayOscEnabled, timeDelayOscSpeed, timeDelayOscMin, timeDelayOscMax, timeDelayOscWave,
      ringDelay, ringDelayOscEnabled, ringDelayOscSpeed, ringDelayOscMin, ringDelayOscMax, ringDelayOscWave,
      colorPalette, baseHue, saturation, lightness, opacity, hueByDepth, hueOscEnabled, hueOscSpeed,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [
    depth, childCount, baseRadius, radiusRatio, drawOuterCircles, drawLeafCircles, lineWidth,
    lineWidthOscEnabled, lineWidthOscSpeed, lineWidthOscMin, lineWidthOscMax, lineWidthOscWave,
    rotationSpeed, alternateDirection, rotationWave, rotationOscEnabled, rotationOscSpeed, rotationOscMin, rotationOscMax,
    radiusOscEnabled, radiusOscSpeed, radiusOscMin, radiusOscMax, radiusOscWave, radiusOscByDepth,
    childOscEnabled, childOscSpeed, childOscMin, childOscMax, childOscWave,
    visibleChildren, visibleOscEnabled, visibleOscSpeed, visibleOscMin, visibleOscMax, visibleOscWave,
    timeDelay, timeDelayOscEnabled, timeDelayOscSpeed, timeDelayOscMin, timeDelayOscMax, timeDelayOscWave,
    ringDelay, ringDelayOscEnabled, ringDelayOscSpeed, ringDelayOscMin, ringDelayOscMax, ringDelayOscWave,
    colorPalette, baseHue, saturation, lightness, opacity, hueByDepth, hueOscEnabled, hueOscSpeed,
  ]);

  // Store refs for animation loop
  const depthRef = useRef(depth);
  const childCountRef = useRef(childCount);
  const baseRadiusRef = useRef(baseRadius);
  const radiusRatioRef = useRef(radiusRatio);
  const drawOuterCirclesRef = useRef(drawOuterCircles);
  const drawLeafCirclesRef = useRef(drawLeafCircles);
  const lineWidthRef = useRef(lineWidth);
  const lineWidthOscEnabledRef = useRef(lineWidthOscEnabled);
  const lineWidthOscSpeedRef = useRef(lineWidthOscSpeed);
  const lineWidthOscMinRef = useRef(lineWidthOscMin);
  const lineWidthOscMaxRef = useRef(lineWidthOscMax);
  const lineWidthOscWaveRef = useRef(lineWidthOscWave);
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
  useEffect(() => { lineWidthOscEnabledRef.current = lineWidthOscEnabled; }, [lineWidthOscEnabled]);
  useEffect(() => { lineWidthOscSpeedRef.current = lineWidthOscSpeed; }, [lineWidthOscSpeed]);
  useEffect(() => { lineWidthOscMinRef.current = lineWidthOscMin; }, [lineWidthOscMin]);
  useEffect(() => { lineWidthOscMaxRef.current = lineWidthOscMax; }, [lineWidthOscMax]);
  useEffect(() => { lineWidthOscWaveRef.current = lineWidthOscWave; }, [lineWidthOscWave]);
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

  // Update debug display from ref on interval
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo({ ...debugInfoRef.current });
    }, 100);
    return () => clearInterval(interval);
  }, []);

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
      ringOffset: number, // accumulated ring delay from ancestors
    ) => {
      // Depth delay: innermost (maxDepth) leads, shallower levels are delayed
      let depthDelay = timeDelayRef.current;
      if (timeDelayOscEnabledRef.current) {
        const dWave = waveFunctions[timeDelayOscWaveRef.current];
        const norm = (dWave(globalT * timeDelayOscSpeedRef.current) + 1) / 2;
        depthDelay = timeDelayOscMinRef.current + norm * (timeDelayOscMaxRef.current - timeDelayOscMinRef.current);
      }
      const depthFromInner = maxDepth - currentDepth;
      // t = base time, offset by depth delay + accumulated ring offsets
      const t = globalT - depthDelay * depthFromInner - ringOffset;

      // Write debug info at root level
      if (currentDepth === 0) {
        debugInfoRef.current.depthDelay = depthDelay;
        debugInfoRef.current.depth = maxDepth;
        debugInfoRef.current.baseRadius = radius;
      }

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

      // Line width — oscillate between min and max
      let lw = lineWidthRef.current;
      if (lineWidthOscEnabledRef.current) {
        const lwWave = waveFunctions[lineWidthOscWaveRef.current];
        const norm = (lwWave(t * lineWidthOscSpeedRef.current) + 1) / 2;
        lw = lineWidthOscMinRef.current + norm * (lineWidthOscMaxRef.current - lineWidthOscMinRef.current);
      }

      // Write debug for line width at root level
      if (currentDepth === 0) {
        debugInfoRef.current.lineWidth = lw;
      }

      // Draw this circle
      const isLeaf = currentDepth >= maxDepth;
      if (isLeaf && drawLeafCirclesRef.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${s}%, ${Math.max(l, 20)}%, ${a})`;
        ctx.lineWidth = lw;
        ctx.stroke();
      } else if (!isLeaf && drawOuterCirclesRef.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${s}%, ${Math.max(l, 20)}%, ${a * 0.5})`;
        ctx.lineWidth = lw;
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

      // Ring delay amount for children at this level
      let ringDel = ringDelayRef.current;
      if (ringDelayOscEnabledRef.current) {
        const rWave = waveFunctions[ringDelayOscWaveRef.current];
        const norm = (rWave(globalT * ringDelayOscSpeedRef.current) + 1) / 2;
        ringDel = ringDelayOscMinRef.current + norm * (ringDelayOscMaxRef.current - ringDelayOscMinRef.current);
      }

      // Write debug info at root level
      if (currentDepth === 0) {
        debugInfoRef.current.children = children;
        debugInfoRef.current.visibleChildren = visible;
        debugInfoRef.current.ringDelay = ringDel;
        debugInfoRef.current.hue = baseHueRef.current;
      }

      for (let i = 0; i < children; i++) {
        if (i >= visible) continue;

        // Per-child ring offset: spreads delay evenly across siblings
        const childRingOffset = ringOffset + ringDel * (children > 1 ? i / (children - 1) : 0);

        // Per-child time for computing this child's radius and position
        const childT = t - ringDel * (children > 1 ? i / (children - 1) : 0);

        // Child circle radius — oscillate the ratio between min and max
        let ratio = radiusRatioRef.current;
        if (radiusOscEnabledRef.current) {
          const rWave = waveFunctions[radiusOscWaveRef.current];
          const phaseOffset = radiusOscByDepthRef.current ? currentDepth * 0.8 : 0;
          const norm = (rWave(childT * radiusOscSpeedRef.current + phaseOffset) + 1) / 2;
          ratio = radiusOscMinRef.current + norm * (radiusOscMaxRef.current - radiusOscMinRef.current);
        }
        const childRadius = radius * ratio;

        // Rotation for this depth level (shared across siblings — uses parent t)
        let speed = rotationSpeedRef.current;
        if (rotationOscEnabledRef.current) {
          const rWave = waveFunctions[rotationWaveRef.current];
          const norm = (rWave(t * rotationOscSpeedRef.current) + 1) / 2;
          speed = rotationOscMinRef.current + norm * (rotationOscMaxRef.current - rotationOscMinRef.current);
        }
        const dir = alternateDirectionRef.current ? (currentDepth % 2 === 0 ? 1 : -1) : 1;
        const rotAngle = t * speed * dir;

        // Write debug for first child at root level
        if (currentDepth === 0 && i === 0) {
          debugInfoRef.current.radiusRatio = ratio;
          debugInfoRef.current.rotationSpeed = speed;
          debugInfoRef.current.rotationAngle = rotAngle;
        }

        // Distance from center to child centers
        const orbitRadius = radius - childRadius;

        const angle = rotAngle + (i / children) * Math.PI * 2;
        const childCx = cx + Math.cos(angle) * orbitRadius;
        const childCy = cy + Math.sin(angle) * orbitRadius;

        drawNestedCircles(childCx, childCy, childRadius, currentDepth + 1, maxDepth, globalT, i, childRingOffset);
      }
    };

    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      if (!pausedRef.current) {
        timeRef.current += delta;
      }

      debugInfoRef.current.time = timeRef.current;
      debugInfoRef.current.fps = delta > 0 ? Math.round(1 / delta) : 0;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const t = timeRef.current;

      drawNestedCircles(centerX, centerY, baseRadiusRef.current, 0, depthRef.current, t, 0, 0);

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

      {/* Debug toggle */}
      {!isPreview && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.8)",
            color: "#66ccff",
            border: "1px solid rgba(102, 204, 255, 0.3)",
            borderRadius: "4px",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
          title={showDebug ? "Hide Debug Info" : "Show Debug Info"}
        >
          {showDebug ? "▼" : "▶"} Debug
        </button>
      )}

      {/* Debug panel */}
      {!isPreview && showDebug && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: "20px",
            minWidth: "200px",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#66ccff",
            padding: "12px 16px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.6",
            border: "1px solid rgba(102, 204, 255, 0.3)",
          }}
        >
          <div style={{ color: debugInfo.fps < 30 ? "#ff4444" : debugInfo.fps < 50 ? "#ffaa44" : "#66ccff" }}>
            FPS: {debugInfo.fps}
          </div>
          <div>Time: {debugInfo.time.toFixed(2)}s</div>

          <div style={{ borderTop: "1px solid rgba(102, 204, 255, 0.2)", marginTop: "8px", paddingTop: "8px", fontWeight: "bold", color: "#ffdd66" }}>
            Structure
          </div>
          <div style={{ fontSize: "11px" }}>Depth: {debugInfo.depth}</div>
          <div style={{ fontSize: "11px" }}>Children: {debugInfo.children}</div>
          <div style={{ fontSize: "11px" }}>Visible: {debugInfo.visibleChildren}</div>
          <div style={{ fontSize: "11px" }}>Base Radius: {debugInfo.baseRadius}</div>

          <div style={{ borderTop: "1px solid rgba(102, 204, 255, 0.2)", marginTop: "8px", paddingTop: "8px", fontWeight: "bold", color: "#88ff88" }}>
            Oscillator Values
          </div>
          <div style={{ fontSize: "11px", opacity: rotationOscEnabled ? 1 : 0.4 }}>
            Rotation: {debugInfo.rotationSpeed.toFixed(3)} rad/s
          </div>
          <div style={{ fontSize: "11px", opacity: rotationOscEnabled ? 1 : 0.4 }}>
            Rot Angle: {(debugInfo.rotationAngle * 180 / Math.PI).toFixed(1)}°
          </div>
          <div style={{ fontSize: "11px", opacity: radiusOscEnabled ? 1 : 0.4 }}>
            Radius Ratio: {debugInfo.radiusRatio.toFixed(3)}
          </div>
          <div style={{ fontSize: "11px", opacity: lineWidthOscEnabled ? 1 : 0.4 }}>
            Line Width: {debugInfo.lineWidth.toFixed(2)}
          </div>
          <div style={{ fontSize: "11px", opacity: hueOscEnabled ? 1 : 0.4 }}>
            Hue: {debugInfo.hue.toFixed(0)}°
          </div>

          <div style={{ borderTop: "1px solid rgba(102, 204, 255, 0.2)", marginTop: "8px", paddingTop: "8px", fontWeight: "bold", color: "#ff8888" }}>
            Time Delays
          </div>
          <div style={{ fontSize: "11px", opacity: timeDelay > 0 || timeDelayOscEnabled ? 1 : 0.4 }}>
            Depth Delay: {debugInfo.depthDelay.toFixed(3)}s
          </div>
          <div style={{ fontSize: "11px", opacity: ringDelay > 0 || ringDelayOscEnabled ? 1 : 0.4 }}>
            Ring Delay: {debugInfo.ringDelay.toFixed(3)}s
          </div>
        </div>
      )}

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
          <input
            type="range" min={0.5} max={10} step={0.1} value={lineWidth}
            onChange={(e) => setLineWidth(+e.target.value)}
            disabled={lineWidthOscEnabled}
            style={{ width: "100%", cursor: lineWidthOscEnabled ? "not-allowed" : "pointer", opacity: lineWidthOscEnabled ? 0.5 : 1 }}
          />
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

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input type="checkbox" checked={lineWidthOscEnabled} onChange={(e) => setLineWidthOscEnabled(e.target.checked)} style={{ marginRight: "8px", cursor: "pointer" }} />
            Enable Line Width Oscillation
          </label>
          {lineWidthOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select value={lineWidthOscWave} onChange={(e) => setLineWidthOscWave(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}>
                  {waveFnNames.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {lineWidthOscSpeed.toFixed(2)}</label>
                <input type="range" min={0.05} max={5} step={0.05} value={lineWidthOscSpeed} onChange={(e) => setLineWidthOscSpeed(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {lineWidthOscMin.toFixed(1)}</label>
                <input type="range" min={0} max={10} step={0.1} value={lineWidthOscMin} onChange={(e) => setLineWidthOscMin(+e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {lineWidthOscMax.toFixed(1)}</label>
                <input type="range" min={0} max={10} step={0.1} value={lineWidthOscMax} onChange={(e) => setLineWidthOscMax(+e.target.value)} style={{ width: "100%" }} />
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
