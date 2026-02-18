"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type WaveFunction =
  | "sin"
  | "cos"
  | "triangle"
  | "sawtooth"
  | "bounce"
  | "elastic"
  | "circular"
  | "exponential"
  | "logarithmic"
  | "pulse"
  | "square"
  | "smoothstep"
  | "zigzag"
  | "heart"
  | "spiral"
  | "wobble"
  | "double-sin"
  | "triple-sin"
  | "chaos"
  | "steps"
  | "breath";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  triangle: (x) => Math.abs((x / Math.PI) % 2 - 1) * 2 - 1,
  sawtooth: (x) => 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5)),

  // Bounce effect (like a bouncing ball)
  bounce: (x) => {
    const t = (x % (2 * Math.PI)) / (2 * Math.PI);
    if (t < 0.25) return 8 * t * t;
    if (t < 0.5) return 1 - 8 * (t - 0.25) * (t - 0.25);
    if (t < 0.75) return 0.5 * (t - 0.5) * (t - 0.5);
    return 1 - 2 * (t - 0.75) * (t - 0.75);
  },

  // Elastic spring effect
  elastic: (x) => {
    const t = Math.sin(x);
    return t * Math.exp(-Math.abs(Math.sin(x * 0.5)));
  },

  // Circular arc motion
  circular: (x) => Math.sqrt(1 - Math.pow(Math.sin(x), 2)) * Math.sign(Math.cos(x)),

  // Exponential growth/decay
  exponential: (x) => {
    const normalized = (x % (2 * Math.PI)) / (2 * Math.PI);
    return normalized < 0.5
      ? Math.pow(2, 10 * (normalized - 0.5)) - 1
      : 2 - Math.pow(2, -10 * (normalized - 0.5));
  },

  // Logarithmic curve
  logarithmic: (x) => {
    const t = (x % (2 * Math.PI)) / (2 * Math.PI);
    return Math.log(1 + t * 9) / Math.log(10);
  },

  // Pulse wave (sharp transitions)
  pulse: (x) => Math.sin(x) > 0.3 ? 1 : -1,

  // Square wave
  square: (x) => Math.sin(x) >= 0 ? 1 : -1,

  // Smooth step function
  smoothstep: (x) => {
    const t = (Math.sin(x) + 1) / 2;
    return t * t * (3 - 2 * t) * 2 - 1;
  },

  // Zigzag pattern
  zigzag: (x) => {
    const t = (x % (2 * Math.PI)) / (2 * Math.PI);
    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  },

  // Heart-like curve
  heart: (x) => {
    const t = Math.sin(x);
    return t * Math.abs(t) + 0.3 * Math.cos(x * 3);
  },

  // Spiral intensity
  spiral: (x) => Math.sin(x) * (1 + 0.3 * Math.sin(x * 5)),

  // Wobble effect
  wobble: (x) => Math.sin(x) + 0.5 * Math.sin(x * 2.5) + 0.25 * Math.sin(x * 5),

  // Double frequency sine
  "double-sin": (x) => Math.sin(x) * Math.sin(x * 2),

  // Triple layered sine
  "triple-sin": (x) =>
    0.5 * Math.sin(x) +
    0.3 * Math.sin(x * 2) +
    0.2 * Math.sin(x * 3),

  // Chaotic/random-ish pattern
  chaos: (x) => {
    const seed = Math.floor(x / 0.5) * 0.5;
    return Math.sin(seed * 12.9898 + x) * Math.cos(seed * 78.233);
  },

  // Step function
  steps: (x) => Math.floor(Math.sin(x) * 4) / 4,

  // Breathing pattern
  breath: (x) => {
    const t = (Math.sin(x) + 1) / 2;
    return Math.pow(t, 0.5) * 2 - 1;
  },
};

// Default settings
const DEFAULT_SETTINGS = {
  speed: 2,
  cameraRotation: 0,
  numRings: 50,
  colorPattern: "none",
  generationHue: 180,
  generationSaturation: 0.8,
  generationBrightness: 0.5,
  generationRadius: 5,
  generationSpacing: 2,
  generationSegments: 3,
  tubeThickness: 0.2,
  shapeRotation: 0,
  rotationSpeed: 0,
  burstEnabled: false,
  burstInterval: 2,
  burstMagnitude: 1.5,
  burstDecay: 20,
  hueOscEnabled: false,
  hueOscFunction: "sin" as WaveFunction,
  hueOscSpeed: 1,
  hueOscMin: 0,
  hueOscMax: 360,
  radiusOscEnabled: false,
  radiusOscFunction: "sin" as WaveFunction,
  radiusOscSpeed: 1,
  radiusOscMin: 2,
  radiusOscMax: 1000,
  spacingOscEnabled: false,
  spacingOscFunction: "sin" as WaveFunction,
  spacingOscSpeed: 1,
  spacingOscMin: 0.5,
  spacingOscMax: 5,
  segmentsOscEnabled: false,
  segmentsOscFunction: "sin" as WaveFunction,
  segmentsOscSpeed: 1,
  segmentsOscMin: 3,
  segmentsOscMax: 64,
  cameraRotationOscEnabled: false,
  cameraRotationOscFunction: "sin" as WaveFunction,
  cameraRotationOscSpeed: 1,
  cameraRotationOscMin: 0,
  cameraRotationOscMax: Math.PI * 2,
  rotationSpeedOscEnabled: false,
  rotationSpeedOscFunction: "sin" as WaveFunction,
  rotationSpeedOscSpeed: 1,
  rotationSpeedOscMin: -10,
  rotationSpeedOscMax: 10,
  shapeRotationOscEnabled: false,
  shapeRotationOscFunction: "sin" as WaveFunction,
  shapeRotationOscSpeed: 1,
  shapeRotationOscMin: 0,
  shapeRotationOscMax: Math.PI * 2,
  tubeThicknessOscEnabled: false,
  tubeThicknessOscFunction: "sin" as WaveFunction,
  tubeThicknessOscSpeed: 1,
  tubeThicknessOscMin: 0.05,
  tubeThicknessOscMax: 1,
  saturationOscEnabled: false,
  saturationOscFunction: "sin" as WaveFunction,
  saturationOscSpeed: 1,
  saturationOscMin: 0,
  saturationOscMax: 1,
  brightnessOscEnabled: false,
  brightnessOscFunction: "sin" as WaveFunction,
  brightnessOscSpeed: 1,
  brightnessOscMin: 0,
  brightnessOscMax: 1,
};

export default function Tunnel3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Always initialize with defaults to avoid hydration mismatch
  const [speed, setSpeed] = useState(DEFAULT_SETTINGS.speed);
  const [cameraRotation, setCameraRotation] = useState(DEFAULT_SETTINGS.cameraRotation);
  const [numRings, setNumRings] = useState(DEFAULT_SETTINGS.numRings);
  const [colorPattern, setColorPattern] = useState<string>(DEFAULT_SETTINGS.colorPattern);

  // Generation constants - determine how new rings are created
  const [generationHue, setGenerationHue] = useState(DEFAULT_SETTINGS.generationHue);
  const [generationSaturation, setGenerationSaturation] = useState(DEFAULT_SETTINGS.generationSaturation);
  const [generationBrightness, setGenerationBrightness] = useState(DEFAULT_SETTINGS.generationBrightness);
  const [generationRadius, setGenerationRadius] = useState(DEFAULT_SETTINGS.generationRadius);
  const [generationSpacing, setGenerationSpacing] = useState(DEFAULT_SETTINGS.generationSpacing);
  const [generationSegments, setGenerationSegments] = useState(DEFAULT_SETTINGS.generationSegments);
  const [tubeThickness, setTubeThickness] = useState(DEFAULT_SETTINGS.tubeThickness);
  const [shapeRotation, setShapeRotation] = useState(DEFAULT_SETTINGS.shapeRotation);
  const [rotationSpeed, setRotationSpeed] = useState(DEFAULT_SETTINGS.rotationSpeed);

  // Oscillators for generation constants
  const [hueOscEnabled, setHueOscEnabled] = useState(DEFAULT_SETTINGS.hueOscEnabled);
  const [hueOscFunction, setHueOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.hueOscFunction);
  const [hueOscSpeed, setHueOscSpeed] = useState(DEFAULT_SETTINGS.hueOscSpeed);
  const [hueOscMin, setHueOscMin] = useState(DEFAULT_SETTINGS.hueOscMin);
  const [hueOscMax, setHueOscMax] = useState(DEFAULT_SETTINGS.hueOscMax);

  const [radiusOscEnabled, setRadiusOscEnabled] = useState(DEFAULT_SETTINGS.radiusOscEnabled);
  const [radiusOscFunction, setRadiusOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.radiusOscFunction);
  const [radiusOscSpeed, setRadiusOscSpeed] = useState(DEFAULT_SETTINGS.radiusOscSpeed);
  const [radiusOscMin, setRadiusOscMin] = useState(DEFAULT_SETTINGS.radiusOscMin);
  const [radiusOscMax, setRadiusOscMax] = useState(DEFAULT_SETTINGS.radiusOscMax);

  const [spacingOscEnabled, setSpacingOscEnabled] = useState(DEFAULT_SETTINGS.spacingOscEnabled);
  const [spacingOscFunction, setSpacingOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.spacingOscFunction);
  const [spacingOscSpeed, setSpacingOscSpeed] = useState(DEFAULT_SETTINGS.spacingOscSpeed);
  const [spacingOscMin, setSpacingOscMin] = useState(DEFAULT_SETTINGS.spacingOscMin);
  const [spacingOscMax, setSpacingOscMax] = useState(DEFAULT_SETTINGS.spacingOscMax);

  const [segmentsOscEnabled, setSegmentsOscEnabled] = useState(DEFAULT_SETTINGS.segmentsOscEnabled);
  const [segmentsOscFunction, setSegmentsOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.segmentsOscFunction);
  const [segmentsOscSpeed, setSegmentsOscSpeed] = useState(DEFAULT_SETTINGS.segmentsOscSpeed);
  const [segmentsOscMin, setSegmentsOscMin] = useState(DEFAULT_SETTINGS.segmentsOscMin);
  const [segmentsOscMax, setSegmentsOscMax] = useState(DEFAULT_SETTINGS.segmentsOscMax);

  const [cameraRotationOscEnabled, setCameraRotationOscEnabled] = useState(DEFAULT_SETTINGS.cameraRotationOscEnabled);
  const [cameraRotationOscFunction, setCameraRotationOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.cameraRotationOscFunction);
  const [cameraRotationOscSpeed, setCameraRotationOscSpeed] = useState(DEFAULT_SETTINGS.cameraRotationOscSpeed);
  const [cameraRotationOscMin, setCameraRotationOscMin] = useState(DEFAULT_SETTINGS.cameraRotationOscMin);
  const [cameraRotationOscMax, setCameraRotationOscMax] = useState(DEFAULT_SETTINGS.cameraRotationOscMax);

  const [rotationSpeedOscEnabled, setRotationSpeedOscEnabled] = useState(DEFAULT_SETTINGS.rotationSpeedOscEnabled);
  const [rotationSpeedOscFunction, setRotationSpeedOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.rotationSpeedOscFunction);
  const [rotationSpeedOscSpeed, setRotationSpeedOscSpeed] = useState(DEFAULT_SETTINGS.rotationSpeedOscSpeed);
  const [rotationSpeedOscMin, setRotationSpeedOscMin] = useState(DEFAULT_SETTINGS.rotationSpeedOscMin);
  const [rotationSpeedOscMax, setRotationSpeedOscMax] = useState(DEFAULT_SETTINGS.rotationSpeedOscMax);

  const [shapeRotationOscEnabled, setShapeRotationOscEnabled] = useState(DEFAULT_SETTINGS.shapeRotationOscEnabled);
  const [shapeRotationOscFunction, setShapeRotationOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.shapeRotationOscFunction);
  const [shapeRotationOscSpeed, setShapeRotationOscSpeed] = useState(DEFAULT_SETTINGS.shapeRotationOscSpeed);
  const [shapeRotationOscMin, setShapeRotationOscMin] = useState(DEFAULT_SETTINGS.shapeRotationOscMin);
  const [shapeRotationOscMax, setShapeRotationOscMax] = useState(DEFAULT_SETTINGS.shapeRotationOscMax);

  const [tubeThicknessOscEnabled, setTubeThicknessOscEnabled] = useState(DEFAULT_SETTINGS.tubeThicknessOscEnabled);
  const [tubeThicknessOscFunction, setTubeThicknessOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.tubeThicknessOscFunction);
  const [tubeThicknessOscSpeed, setTubeThicknessOscSpeed] = useState(DEFAULT_SETTINGS.tubeThicknessOscSpeed);
  const [tubeThicknessOscMin, setTubeThicknessOscMin] = useState(DEFAULT_SETTINGS.tubeThicknessOscMin);
  const [tubeThicknessOscMax, setTubeThicknessOscMax] = useState(DEFAULT_SETTINGS.tubeThicknessOscMax);

  const [saturationOscEnabled, setSaturationOscEnabled] = useState(DEFAULT_SETTINGS.saturationOscEnabled);
  const [saturationOscFunction, setSaturationOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.saturationOscFunction);
  const [saturationOscSpeed, setSaturationOscSpeed] = useState(DEFAULT_SETTINGS.saturationOscSpeed);
  const [saturationOscMin, setSaturationOscMin] = useState(DEFAULT_SETTINGS.saturationOscMin);
  const [saturationOscMax, setSaturationOscMax] = useState(DEFAULT_SETTINGS.saturationOscMax);

  const [brightnessOscEnabled, setBrightnessOscEnabled] = useState(DEFAULT_SETTINGS.brightnessOscEnabled);
  const [brightnessOscFunction, setBrightnessOscFunction] = useState<WaveFunction>(DEFAULT_SETTINGS.brightnessOscFunction);
  const [brightnessOscSpeed, setBrightnessOscSpeed] = useState(DEFAULT_SETTINGS.brightnessOscSpeed);
  const [brightnessOscMin, setBrightnessOscMin] = useState(DEFAULT_SETTINGS.brightnessOscMin);
  const [brightnessOscMax, setBrightnessOscMax] = useState(DEFAULT_SETTINGS.brightnessOscMax);

  // Burst parameters
  const [burstEnabled, setBurstEnabled] = useState(DEFAULT_SETTINGS.burstEnabled);
  const [burstInterval, setBurstInterval] = useState(DEFAULT_SETTINGS.burstInterval);
  const [burstMagnitude, setBurstMagnitude] = useState(DEFAULT_SETTINGS.burstMagnitude);
  const [burstDecay, setBurstDecay] = useState(DEFAULT_SETTINGS.burstDecay);

  const [showControls, setShowControls] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const pausedRef = useRef(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Debug values - use refs to avoid triggering re-renders from animation loop
  const debugInfoRef = useRef({
    time: 0,
    ringZ: 0,
    hue: 0,
    fps: 0,
    regenCount: 0,
    shapeRotation: 0,
    rotationSpeed: 0,
    generationRotation: 0,
    actualRotation: 0,
    // Oscillator current values
    oscHue: 0,
    oscRadius: 0,
    oscSpacing: 0,
    oscSegments: 0,
    oscCameraRotation: 0,
    oscRotationSpeed: 0,
    oscShapeRotation: 0,
    oscTubeThickness: 0,
    oscSaturation: 0,
    oscBrightness: 0,
  });
  // State for display only, updated on interval
  const [debugInfo, setDebugInfo] = useState({
    time: 0,
    ringZ: 0,
    hue: 0,
    fps: 0,
    regenCount: 0,
    shapeRotation: 0,
    rotationSpeed: 0,
    generationRotation: 0,
    actualRotation: 0,
    oscHue: 0,
    oscRadius: 0,
    oscSpacing: 0,
    oscSegments: 0,
    oscCameraRotation: 0,
    oscRotationSpeed: 0,
    oscShapeRotation: 0,
    oscTubeThickness: 0,
    oscSaturation: 0,
    oscBrightness: 0,
  });

  // Load settings from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem("tunnel3d-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setSpeed(settings.speed ?? DEFAULT_SETTINGS.speed);
        setCameraRotation(settings.cameraRotation ?? DEFAULT_SETTINGS.cameraRotation);
        setNumRings(settings.numRings ?? DEFAULT_SETTINGS.numRings);
        setColorPattern(settings.colorPattern ?? DEFAULT_SETTINGS.colorPattern);
        setGenerationHue(settings.generationHue ?? DEFAULT_SETTINGS.generationHue);
        setGenerationSaturation(settings.generationSaturation ?? DEFAULT_SETTINGS.generationSaturation);
        setGenerationBrightness(settings.generationBrightness ?? DEFAULT_SETTINGS.generationBrightness);
        setGenerationRadius(settings.generationRadius ?? DEFAULT_SETTINGS.generationRadius);
        setGenerationSpacing(settings.generationSpacing ?? DEFAULT_SETTINGS.generationSpacing);
        setGenerationSegments(settings.generationSegments ?? DEFAULT_SETTINGS.generationSegments);
        setTubeThickness(settings.tubeThickness ?? DEFAULT_SETTINGS.tubeThickness);
        setShapeRotation(settings.shapeRotation ?? DEFAULT_SETTINGS.shapeRotation);
        setRotationSpeed(settings.rotationSpeed ?? DEFAULT_SETTINGS.rotationSpeed);
        setBurstEnabled(settings.burstEnabled ?? DEFAULT_SETTINGS.burstEnabled);
        setBurstInterval(settings.burstInterval ?? DEFAULT_SETTINGS.burstInterval);
        setBurstMagnitude(settings.burstMagnitude ?? DEFAULT_SETTINGS.burstMagnitude);
        setBurstDecay(settings.burstDecay ?? DEFAULT_SETTINGS.burstDecay);
        setHueOscEnabled(settings.hueOscEnabled ?? DEFAULT_SETTINGS.hueOscEnabled);
        setHueOscFunction(settings.hueOscFunction ?? DEFAULT_SETTINGS.hueOscFunction);
        setHueOscSpeed(settings.hueOscSpeed ?? DEFAULT_SETTINGS.hueOscSpeed);
        setHueOscMin(settings.hueOscMin ?? DEFAULT_SETTINGS.hueOscMin);
        setHueOscMax(settings.hueOscMax ?? DEFAULT_SETTINGS.hueOscMax);
        setRadiusOscEnabled(settings.radiusOscEnabled ?? DEFAULT_SETTINGS.radiusOscEnabled);
        setRadiusOscFunction(settings.radiusOscFunction ?? DEFAULT_SETTINGS.radiusOscFunction);
        setRadiusOscSpeed(settings.radiusOscSpeed ?? DEFAULT_SETTINGS.radiusOscSpeed);
        setRadiusOscMin(settings.radiusOscMin ?? DEFAULT_SETTINGS.radiusOscMin);
        setRadiusOscMax(settings.radiusOscMax ?? DEFAULT_SETTINGS.radiusOscMax);
        setSpacingOscEnabled(settings.spacingOscEnabled ?? DEFAULT_SETTINGS.spacingOscEnabled);
        setSpacingOscFunction(settings.spacingOscFunction ?? DEFAULT_SETTINGS.spacingOscFunction);
        setSpacingOscSpeed(settings.spacingOscSpeed ?? DEFAULT_SETTINGS.spacingOscSpeed);
        setSpacingOscMin(settings.spacingOscMin ?? DEFAULT_SETTINGS.spacingOscMin);
        setSpacingOscMax(settings.spacingOscMax ?? DEFAULT_SETTINGS.spacingOscMax);
        setSegmentsOscEnabled(settings.segmentsOscEnabled ?? DEFAULT_SETTINGS.segmentsOscEnabled);
        setSegmentsOscFunction(settings.segmentsOscFunction ?? DEFAULT_SETTINGS.segmentsOscFunction);
        setSegmentsOscSpeed(settings.segmentsOscSpeed ?? DEFAULT_SETTINGS.segmentsOscSpeed);
        setSegmentsOscMin(settings.segmentsOscMin ?? DEFAULT_SETTINGS.segmentsOscMin);
        setSegmentsOscMax(settings.segmentsOscMax ?? DEFAULT_SETTINGS.segmentsOscMax);
        setCameraRotationOscEnabled(settings.cameraRotationOscEnabled ?? DEFAULT_SETTINGS.cameraRotationOscEnabled);
        setCameraRotationOscFunction(settings.cameraRotationOscFunction ?? DEFAULT_SETTINGS.cameraRotationOscFunction);
        setCameraRotationOscSpeed(settings.cameraRotationOscSpeed ?? DEFAULT_SETTINGS.cameraRotationOscSpeed);
        setCameraRotationOscMin(settings.cameraRotationOscMin ?? DEFAULT_SETTINGS.cameraRotationOscMin);
        setCameraRotationOscMax(settings.cameraRotationOscMax ?? DEFAULT_SETTINGS.cameraRotationOscMax);
        setRotationSpeedOscEnabled(settings.rotationSpeedOscEnabled ?? DEFAULT_SETTINGS.rotationSpeedOscEnabled);
        setRotationSpeedOscFunction(settings.rotationSpeedOscFunction ?? DEFAULT_SETTINGS.rotationSpeedOscFunction);
        setRotationSpeedOscSpeed(settings.rotationSpeedOscSpeed ?? DEFAULT_SETTINGS.rotationSpeedOscSpeed);
        setRotationSpeedOscMin(settings.rotationSpeedOscMin ?? DEFAULT_SETTINGS.rotationSpeedOscMin);
        setRotationSpeedOscMax(settings.rotationSpeedOscMax ?? DEFAULT_SETTINGS.rotationSpeedOscMax);
        setShapeRotationOscEnabled(settings.shapeRotationOscEnabled ?? DEFAULT_SETTINGS.shapeRotationOscEnabled);
        setShapeRotationOscFunction(settings.shapeRotationOscFunction ?? DEFAULT_SETTINGS.shapeRotationOscFunction);
        setShapeRotationOscSpeed(settings.shapeRotationOscSpeed ?? DEFAULT_SETTINGS.shapeRotationOscSpeed);
        setShapeRotationOscMin(settings.shapeRotationOscMin ?? DEFAULT_SETTINGS.shapeRotationOscMin);
        setShapeRotationOscMax(settings.shapeRotationOscMax ?? DEFAULT_SETTINGS.shapeRotationOscMax);
        setTubeThicknessOscEnabled(settings.tubeThicknessOscEnabled ?? DEFAULT_SETTINGS.tubeThicknessOscEnabled);
        setTubeThicknessOscFunction(settings.tubeThicknessOscFunction ?? DEFAULT_SETTINGS.tubeThicknessOscFunction);
        setTubeThicknessOscSpeed(settings.tubeThicknessOscSpeed ?? DEFAULT_SETTINGS.tubeThicknessOscSpeed);
        setTubeThicknessOscMin(settings.tubeThicknessOscMin ?? DEFAULT_SETTINGS.tubeThicknessOscMin);
        setTubeThicknessOscMax(settings.tubeThicknessOscMax ?? DEFAULT_SETTINGS.tubeThicknessOscMax);
        setSaturationOscEnabled(settings.saturationOscEnabled ?? DEFAULT_SETTINGS.saturationOscEnabled);
        setSaturationOscFunction(settings.saturationOscFunction ?? DEFAULT_SETTINGS.saturationOscFunction);
        setSaturationOscSpeed(settings.saturationOscSpeed ?? DEFAULT_SETTINGS.saturationOscSpeed);
        setSaturationOscMin(settings.saturationOscMin ?? DEFAULT_SETTINGS.saturationOscMin);
        setSaturationOscMax(settings.saturationOscMax ?? DEFAULT_SETTINGS.saturationOscMax);
        setBrightnessOscEnabled(settings.brightnessOscEnabled ?? DEFAULT_SETTINGS.brightnessOscEnabled);
        setBrightnessOscFunction(settings.brightnessOscFunction ?? DEFAULT_SETTINGS.brightnessOscFunction);
        setBrightnessOscSpeed(settings.brightnessOscSpeed ?? DEFAULT_SETTINGS.brightnessOscSpeed);
        setBrightnessOscMin(settings.brightnessOscMin ?? DEFAULT_SETTINGS.brightnessOscMin);
        setBrightnessOscMax(settings.brightnessOscMax ?? DEFAULT_SETTINGS.brightnessOscMax);
      } catch (e) {
        console.error("Failed to load settings from localStorage:", e);
      }
    }
    // Mark as loaded regardless of whether we found saved settings
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => setHasLoadedFromStorage(true), 0);
  }, []);

  useEffect(() => {
    if (window.location.search.includes("preview")) {
      setIsPreview(true);
      setShowControls(false);
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

  const speedRef = useRef(speed);
  const cameraRotationRef = useRef(cameraRotation);
  const colorPatternRef = useRef(colorPattern);
  const generationHueRef = useRef(generationHue);
  const generationSaturationRef = useRef(generationSaturation);
  const generationBrightnessRef = useRef(generationBrightness);
  const generationRadiusRef = useRef(generationRadius);
  const generationSpacingRef = useRef(generationSpacing);
  const generationSegmentsRef = useRef(generationSegments);
  const tubeThicknessRef = useRef(tubeThickness);
  const shapeRotationRef = useRef(shapeRotation);
  const rotationSpeedRef = useRef(rotationSpeed);

  // Oscillator refs
  const hueOscEnabledRef = useRef(hueOscEnabled);
  const hueOscFunctionRef = useRef(hueOscFunction);
  const hueOscSpeedRef = useRef(hueOscSpeed);
  const hueOscMinRef = useRef(hueOscMin);
  const hueOscMaxRef = useRef(hueOscMax);

  const radiusOscEnabledRef = useRef(radiusOscEnabled);
  const radiusOscFunctionRef = useRef(radiusOscFunction);
  const radiusOscSpeedRef = useRef(radiusOscSpeed);
  const radiusOscMinRef = useRef(radiusOscMin);
  const radiusOscMaxRef = useRef(radiusOscMax);

  const spacingOscEnabledRef = useRef(spacingOscEnabled);
  const spacingOscFunctionRef = useRef(spacingOscFunction);
  const spacingOscSpeedRef = useRef(spacingOscSpeed);
  const spacingOscMinRef = useRef(spacingOscMin);
  const spacingOscMaxRef = useRef(spacingOscMax);

  const segmentsOscEnabledRef = useRef(segmentsOscEnabled);
  const segmentsOscFunctionRef = useRef(segmentsOscFunction);
  const segmentsOscSpeedRef = useRef(segmentsOscSpeed);
  const segmentsOscMinRef = useRef(segmentsOscMin);
  const segmentsOscMaxRef = useRef(segmentsOscMax);

  const cameraRotationOscEnabledRef = useRef(cameraRotationOscEnabled);
  const cameraRotationOscFunctionRef = useRef(cameraRotationOscFunction);
  const cameraRotationOscSpeedRef = useRef(cameraRotationOscSpeed);
  const cameraRotationOscMinRef = useRef(cameraRotationOscMin);
  const cameraRotationOscMaxRef = useRef(cameraRotationOscMax);

  const rotationSpeedOscEnabledRef = useRef(rotationSpeedOscEnabled);
  const rotationSpeedOscFunctionRef = useRef(rotationSpeedOscFunction);
  const rotationSpeedOscSpeedRef = useRef(rotationSpeedOscSpeed);
  const rotationSpeedOscMinRef = useRef(rotationSpeedOscMin);
  const rotationSpeedOscMaxRef = useRef(rotationSpeedOscMax);

  const shapeRotationOscEnabledRef = useRef(shapeRotationOscEnabled);
  const shapeRotationOscFunctionRef = useRef(shapeRotationOscFunction);
  const shapeRotationOscSpeedRef = useRef(shapeRotationOscSpeed);
  const shapeRotationOscMinRef = useRef(shapeRotationOscMin);
  const shapeRotationOscMaxRef = useRef(shapeRotationOscMax);

  const tubeThicknessOscEnabledRef = useRef(tubeThicknessOscEnabled);
  const tubeThicknessOscFunctionRef = useRef(tubeThicknessOscFunction);
  const tubeThicknessOscSpeedRef = useRef(tubeThicknessOscSpeed);
  const tubeThicknessOscMinRef = useRef(tubeThicknessOscMin);
  const tubeThicknessOscMaxRef = useRef(tubeThicknessOscMax);

  const saturationOscEnabledRef = useRef(saturationOscEnabled);
  const saturationOscFunctionRef = useRef(saturationOscFunction);
  const saturationOscSpeedRef = useRef(saturationOscSpeed);
  const saturationOscMinRef = useRef(saturationOscMin);
  const saturationOscMaxRef = useRef(saturationOscMax);

  const brightnessOscEnabledRef = useRef(brightnessOscEnabled);
  const brightnessOscFunctionRef = useRef(brightnessOscFunction);
  const brightnessOscSpeedRef = useRef(brightnessOscSpeed);
  const brightnessOscMinRef = useRef(brightnessOscMin);
  const brightnessOscMaxRef = useRef(brightnessOscMax);

  const burstEnabledRef = useRef(burstEnabled);
  const burstIntervalRef = useRef(burstInterval);
  const burstMagnitudeRef = useRef(burstMagnitude);
  const burstDecayRef = useRef(burstDecay);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    burstEnabledRef.current = burstEnabled;
    burstIntervalRef.current = burstInterval;
    burstMagnitudeRef.current = burstMagnitude;
    burstDecayRef.current = burstDecay;
  }, [burstEnabled, burstInterval, burstMagnitude, burstDecay]);

  useEffect(() => {
    cameraRotationRef.current = cameraRotation;
  }, [cameraRotation]);

  useEffect(() => {
    colorPatternRef.current = colorPattern;
  }, [colorPattern]);

  useEffect(() => {
    shapeRotationRef.current = shapeRotation;
  }, [shapeRotation]);

  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  useEffect(() => {
    generationHueRef.current = generationHue;
  }, [generationHue]);

  useEffect(() => {
    generationSaturationRef.current = generationSaturation;
  }, [generationSaturation]);

  useEffect(() => {
    generationBrightnessRef.current = generationBrightness;
  }, [generationBrightness]);

  useEffect(() => {
    generationRadiusRef.current = generationRadius;
  }, [generationRadius]);

  useEffect(() => {
    generationSpacingRef.current = generationSpacing;
  }, [generationSpacing]);

  useEffect(() => {
    generationSegmentsRef.current = generationSegments;
  }, [generationSegments]);

  useEffect(() => {
    tubeThicknessRef.current = tubeThickness;
  }, [tubeThickness]);

  useEffect(() => {
    hueOscEnabledRef.current = hueOscEnabled;
    hueOscFunctionRef.current = hueOscFunction;
    hueOscSpeedRef.current = hueOscSpeed;
    hueOscMinRef.current = hueOscMin;
    hueOscMaxRef.current = hueOscMax;
  }, [hueOscEnabled, hueOscFunction, hueOscSpeed, hueOscMin, hueOscMax]);

  useEffect(() => {
    radiusOscEnabledRef.current = radiusOscEnabled;
    radiusOscFunctionRef.current = radiusOscFunction;
    radiusOscSpeedRef.current = radiusOscSpeed;
    radiusOscMinRef.current = radiusOscMin;
    radiusOscMaxRef.current = radiusOscMax;
  }, [radiusOscEnabled, radiusOscFunction, radiusOscSpeed, radiusOscMin, radiusOscMax]);

  useEffect(() => {
    spacingOscEnabledRef.current = spacingOscEnabled;
    spacingOscFunctionRef.current = spacingOscFunction;
    spacingOscSpeedRef.current = spacingOscSpeed;
    spacingOscMinRef.current = spacingOscMin;
    spacingOscMaxRef.current = spacingOscMax;
  }, [spacingOscEnabled, spacingOscFunction, spacingOscSpeed, spacingOscMin, spacingOscMax]);

  useEffect(() => {
    segmentsOscEnabledRef.current = segmentsOscEnabled;
    segmentsOscFunctionRef.current = segmentsOscFunction;
    segmentsOscSpeedRef.current = segmentsOscSpeed;
    segmentsOscMinRef.current = segmentsOscMin;
    segmentsOscMaxRef.current = segmentsOscMax;
  }, [segmentsOscEnabled, segmentsOscFunction, segmentsOscSpeed, segmentsOscMin, segmentsOscMax]);

  useEffect(() => {
    cameraRotationOscEnabledRef.current = cameraRotationOscEnabled;
    cameraRotationOscFunctionRef.current = cameraRotationOscFunction;
    cameraRotationOscSpeedRef.current = cameraRotationOscSpeed;
    cameraRotationOscMinRef.current = cameraRotationOscMin;
    cameraRotationOscMaxRef.current = cameraRotationOscMax;
  }, [cameraRotationOscEnabled, cameraRotationOscFunction, cameraRotationOscSpeed, cameraRotationOscMin, cameraRotationOscMax]);

  useEffect(() => {
    rotationSpeedOscEnabledRef.current = rotationSpeedOscEnabled;
    rotationSpeedOscFunctionRef.current = rotationSpeedOscFunction;
    rotationSpeedOscSpeedRef.current = rotationSpeedOscSpeed;
    rotationSpeedOscMinRef.current = rotationSpeedOscMin;
    rotationSpeedOscMaxRef.current = rotationSpeedOscMax;
  }, [rotationSpeedOscEnabled, rotationSpeedOscFunction, rotationSpeedOscSpeed, rotationSpeedOscMin, rotationSpeedOscMax]);

  useEffect(() => {
    shapeRotationOscEnabledRef.current = shapeRotationOscEnabled;
    shapeRotationOscFunctionRef.current = shapeRotationOscFunction;
    shapeRotationOscSpeedRef.current = shapeRotationOscSpeed;
    shapeRotationOscMinRef.current = shapeRotationOscMin;
    shapeRotationOscMaxRef.current = shapeRotationOscMax;
  }, [shapeRotationOscEnabled, shapeRotationOscFunction, shapeRotationOscSpeed, shapeRotationOscMin, shapeRotationOscMax]);

  useEffect(() => {
    tubeThicknessOscEnabledRef.current = tubeThicknessOscEnabled;
    tubeThicknessOscFunctionRef.current = tubeThicknessOscFunction;
    tubeThicknessOscSpeedRef.current = tubeThicknessOscSpeed;
    tubeThicknessOscMinRef.current = tubeThicknessOscMin;
    tubeThicknessOscMaxRef.current = tubeThicknessOscMax;
  }, [tubeThicknessOscEnabled, tubeThicknessOscFunction, tubeThicknessOscSpeed, tubeThicknessOscMin, tubeThicknessOscMax]);

  useEffect(() => {
    saturationOscEnabledRef.current = saturationOscEnabled;
    saturationOscFunctionRef.current = saturationOscFunction;
    saturationOscSpeedRef.current = saturationOscSpeed;
    saturationOscMinRef.current = saturationOscMin;
    saturationOscMaxRef.current = saturationOscMax;
  }, [saturationOscEnabled, saturationOscFunction, saturationOscSpeed, saturationOscMin, saturationOscMax]);

  useEffect(() => {
    brightnessOscEnabledRef.current = brightnessOscEnabled;
    brightnessOscFunctionRef.current = brightnessOscFunction;
    brightnessOscSpeedRef.current = brightnessOscSpeed;
    brightnessOscMinRef.current = brightnessOscMin;
    brightnessOscMaxRef.current = brightnessOscMax;
  }, [brightnessOscEnabled, brightnessOscFunction, brightnessOscSpeed, brightnessOscMin, brightnessOscMax]);

  // Save all settings to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    // Don't save until we've loaded from localStorage first
    if (!hasLoadedFromStorage) return;

    const settings = {
      speed,
      cameraRotation,
      numRings,
      colorPattern,
      generationHue,
      generationSaturation,
      generationBrightness,
      generationRadius,
      generationSpacing,
      generationSegments,
      tubeThickness,
      shapeRotation,
      rotationSpeed,
      burstEnabled,
      burstInterval,
      burstMagnitude,
      burstDecay,
      hueOscEnabled,
      hueOscFunction,
      hueOscSpeed,
      hueOscMin,
      hueOscMax,
      radiusOscEnabled,
      radiusOscFunction,
      radiusOscSpeed,
      radiusOscMin,
      radiusOscMax,
      spacingOscEnabled,
      spacingOscFunction,
      spacingOscSpeed,
      spacingOscMin,
      spacingOscMax,
      segmentsOscEnabled,
      segmentsOscFunction,
      segmentsOscSpeed,
      segmentsOscMin,
      segmentsOscMax,
      cameraRotationOscEnabled,
      cameraRotationOscFunction,
      cameraRotationOscSpeed,
      cameraRotationOscMin,
      cameraRotationOscMax,
      rotationSpeedOscEnabled,
      rotationSpeedOscFunction,
      rotationSpeedOscSpeed,
      rotationSpeedOscMin,
      rotationSpeedOscMax,
      shapeRotationOscEnabled,
      shapeRotationOscFunction,
      shapeRotationOscSpeed,
      shapeRotationOscMin,
      shapeRotationOscMax,
      tubeThicknessOscEnabled,
      tubeThicknessOscFunction,
      tubeThicknessOscSpeed,
      tubeThicknessOscMin,
      tubeThicknessOscMax,
      saturationOscEnabled,
      saturationOscFunction,
      saturationOscSpeed,
      saturationOscMin,
      saturationOscMax,
      brightnessOscEnabled,
      brightnessOscFunction,
      brightnessOscSpeed,
      brightnessOscMin,
      brightnessOscMax,
    };
    localStorage.setItem("tunnel3d-settings", JSON.stringify(settings));
  }, [
    speed,
    cameraRotation,
    numRings,
    colorPattern,
    generationHue,
    generationSaturation,
    generationBrightness,
    generationRadius,
    generationSpacing,
    generationSegments,
    tubeThickness,
    shapeRotation,
    rotationSpeed,
    burstEnabled,
    burstInterval,
    burstMagnitude,
    burstDecay,
    hueOscEnabled,
    hueOscFunction,
    hueOscSpeed,
    hueOscMin,
    hueOscMax,
    radiusOscEnabled,
    radiusOscFunction,
    radiusOscSpeed,
    radiusOscMin,
    radiusOscMax,
    spacingOscEnabled,
    spacingOscFunction,
    spacingOscSpeed,
    spacingOscMin,
    spacingOscMax,
    segmentsOscEnabled,
    segmentsOscFunction,
    segmentsOscSpeed,
    segmentsOscMin,
    segmentsOscMax,
    cameraRotationOscEnabled,
    cameraRotationOscFunction,
    cameraRotationOscSpeed,
    cameraRotationOscMin,
    cameraRotationOscMax,
    rotationSpeedOscEnabled,
    rotationSpeedOscFunction,
    rotationSpeedOscSpeed,
    rotationSpeedOscMin,
    rotationSpeedOscMax,
    shapeRotationOscEnabled,
    shapeRotationOscFunction,
    shapeRotationOscSpeed,
    shapeRotationOscMin,
    shapeRotationOscMax,
    tubeThicknessOscEnabled,
    tubeThicknessOscFunction,
    tubeThicknessOscSpeed,
    tubeThicknessOscMin,
    tubeThicknessOscMax,
    saturationOscEnabled,
    saturationOscFunction,
    saturationOscSpeed,
    saturationOscMin,
    saturationOscMax,
    brightnessOscEnabled,
    brightnessOscFunction,
    brightnessOscSpeed,
    brightnessOscMin,
    brightnessOscMax,
  ]);

  // Clear all oscillators function
  const clearAllOscillators = () => {
    setHueOscEnabled(false);
    setRadiusOscEnabled(false);
    setSpacingOscEnabled(false);
    setSegmentsOscEnabled(false);
    setCameraRotationOscEnabled(false);
    setRotationSpeedOscEnabled(false);
    setShapeRotationOscEnabled(false);
    setTubeThicknessOscEnabled(false);
    setSaturationOscEnabled(false);
    setBrightnessOscEnabled(false);
  };

  // Reset all settings to defaults
  const resetAllSettings = () => {
    setSpeed(DEFAULT_SETTINGS.speed);
    setCameraRotation(DEFAULT_SETTINGS.cameraRotation);
    setNumRings(DEFAULT_SETTINGS.numRings);
    setColorPattern(DEFAULT_SETTINGS.colorPattern);
    setGenerationHue(DEFAULT_SETTINGS.generationHue);
    setGenerationSaturation(DEFAULT_SETTINGS.generationSaturation);
    setGenerationBrightness(DEFAULT_SETTINGS.generationBrightness);
    setGenerationRadius(DEFAULT_SETTINGS.generationRadius);
    setGenerationSpacing(DEFAULT_SETTINGS.generationSpacing);
    setGenerationSegments(DEFAULT_SETTINGS.generationSegments);
    setTubeThickness(DEFAULT_SETTINGS.tubeThickness);
    setShapeRotation(DEFAULT_SETTINGS.shapeRotation);
    setRotationSpeed(DEFAULT_SETTINGS.rotationSpeed);
    setBurstEnabled(DEFAULT_SETTINGS.burstEnabled);
    setBurstInterval(DEFAULT_SETTINGS.burstInterval);
    setBurstMagnitude(DEFAULT_SETTINGS.burstMagnitude);
    setBurstDecay(DEFAULT_SETTINGS.burstDecay);
    setHueOscEnabled(DEFAULT_SETTINGS.hueOscEnabled);
    setHueOscFunction(DEFAULT_SETTINGS.hueOscFunction);
    setHueOscSpeed(DEFAULT_SETTINGS.hueOscSpeed);
    setHueOscMin(DEFAULT_SETTINGS.hueOscMin);
    setHueOscMax(DEFAULT_SETTINGS.hueOscMax);
    setRadiusOscEnabled(DEFAULT_SETTINGS.radiusOscEnabled);
    setRadiusOscFunction(DEFAULT_SETTINGS.radiusOscFunction);
    setRadiusOscSpeed(DEFAULT_SETTINGS.radiusOscSpeed);
    setRadiusOscMin(DEFAULT_SETTINGS.radiusOscMin);
    setRadiusOscMax(DEFAULT_SETTINGS.radiusOscMax);
    setSpacingOscEnabled(DEFAULT_SETTINGS.spacingOscEnabled);
    setSpacingOscFunction(DEFAULT_SETTINGS.spacingOscFunction);
    setSpacingOscSpeed(DEFAULT_SETTINGS.spacingOscSpeed);
    setSpacingOscMin(DEFAULT_SETTINGS.spacingOscMin);
    setSpacingOscMax(DEFAULT_SETTINGS.spacingOscMax);
    setSegmentsOscEnabled(DEFAULT_SETTINGS.segmentsOscEnabled);
    setSegmentsOscFunction(DEFAULT_SETTINGS.segmentsOscFunction);
    setSegmentsOscSpeed(DEFAULT_SETTINGS.segmentsOscSpeed);
    setSegmentsOscMin(DEFAULT_SETTINGS.segmentsOscMin);
    setSegmentsOscMax(DEFAULT_SETTINGS.segmentsOscMax);
    setCameraRotationOscEnabled(DEFAULT_SETTINGS.cameraRotationOscEnabled);
    setCameraRotationOscFunction(DEFAULT_SETTINGS.cameraRotationOscFunction);
    setCameraRotationOscSpeed(DEFAULT_SETTINGS.cameraRotationOscSpeed);
    setCameraRotationOscMin(DEFAULT_SETTINGS.cameraRotationOscMin);
    setCameraRotationOscMax(DEFAULT_SETTINGS.cameraRotationOscMax);
    setRotationSpeedOscEnabled(DEFAULT_SETTINGS.rotationSpeedOscEnabled);
    setRotationSpeedOscFunction(DEFAULT_SETTINGS.rotationSpeedOscFunction);
    setRotationSpeedOscSpeed(DEFAULT_SETTINGS.rotationSpeedOscSpeed);
    setRotationSpeedOscMin(DEFAULT_SETTINGS.rotationSpeedOscMin);
    setRotationSpeedOscMax(DEFAULT_SETTINGS.rotationSpeedOscMax);
    setShapeRotationOscEnabled(DEFAULT_SETTINGS.shapeRotationOscEnabled);
    setShapeRotationOscFunction(DEFAULT_SETTINGS.shapeRotationOscFunction);
    setShapeRotationOscSpeed(DEFAULT_SETTINGS.shapeRotationOscSpeed);
    setShapeRotationOscMin(DEFAULT_SETTINGS.shapeRotationOscMin);
    setShapeRotationOscMax(DEFAULT_SETTINGS.shapeRotationOscMax);
    setTubeThicknessOscEnabled(DEFAULT_SETTINGS.tubeThicknessOscEnabled);
    setTubeThicknessOscFunction(DEFAULT_SETTINGS.tubeThicknessOscFunction);
    setTubeThicknessOscSpeed(DEFAULT_SETTINGS.tubeThicknessOscSpeed);
    setTubeThicknessOscMin(DEFAULT_SETTINGS.tubeThicknessOscMin);
    setTubeThicknessOscMax(DEFAULT_SETTINGS.tubeThicknessOscMax);
    setSaturationOscEnabled(DEFAULT_SETTINGS.saturationOscEnabled);
    setSaturationOscFunction(DEFAULT_SETTINGS.saturationOscFunction);
    setSaturationOscSpeed(DEFAULT_SETTINGS.saturationOscSpeed);
    setSaturationOscMin(DEFAULT_SETTINGS.saturationOscMin);
    setSaturationOscMax(DEFAULT_SETTINGS.saturationOscMax);
    setBrightnessOscEnabled(DEFAULT_SETTINGS.brightnessOscEnabled);
    setBrightnessOscFunction(DEFAULT_SETTINGS.brightnessOscFunction);
    setBrightnessOscSpeed(DEFAULT_SETTINGS.brightnessOscSpeed);
    setBrightnessOscMin(DEFAULT_SETTINGS.brightnessOscMin);
    setBrightnessOscMax(DEFAULT_SETTINGS.brightnessOscMax);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      20000
    );
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Helper function to apply color pattern override
    const applyColorPattern = (material: THREE.MeshBasicMaterial, birthIndex: number, baseHue: number, saturation: number, brightness: number) => {
      const pattern = colorPatternRef.current;

      if (pattern === "every-5-white" && birthIndex % 5 === 0) {
        material.color.setRGB(1, 1, 1); // White
      } else {
        material.color.setHSL(baseHue / 360, saturation, brightness);
      }
    };

    // Create tunnel rings
    const rings: THREE.Mesh[] = [];

    for (let i = 0; i < numRings; i++) {
      const geometry = new THREE.TorusGeometry(
        generationRadiusRef.current,
        tubeThicknessRef.current,
        16,
        generationSegmentsRef.current
      );
      // Hue is exactly the generation constant, not calculated from ring index
      const hue = generationHueRef.current;
      const material = new THREE.MeshBasicMaterial({
        wireframe: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = -i * generationSpacingRef.current;
      // Initial rotation uses base values (will be updated in animation loop with oscillated values)
      ring.rotation.z = shapeRotationRef.current + rotationSpeedRef.current;

      // Apply color with pattern consideration (will be set after userData is defined)
      const birthIndex = i;

      // Bake ring properties from generation constants
      ring.userData = {
        radius: generationRadiusRef.current,
        segments: generationSegmentsRef.current,
        hue: hue,
        saturation: generationSaturationRef.current,
        brightness: generationBrightnessRef.current,
        spacing: generationSpacingRef.current,
        shapeRotation: shapeRotationRef.current,
        tubeThickness: tubeThicknessRef.current,
        birthIndex: birthIndex,
      };

      // Apply color with pattern override if applicable
      applyColorPattern(ring.material as THREE.MeshBasicMaterial, birthIndex, hue, generationSaturationRef.current, generationBrightnessRef.current);

      scene.add(ring);
      rings.push(ring);
    }

    let time = 0;
    let frameCount = 0;
    let lastBurstTime = 0;
    let lastFrameTime = performance.now();
    let fps = 60;
    let regenThisFrame = 0;
    let wasBurstEnabled = burstEnabledRef.current;

    // Helper function to calculate oscillated value
    const getOscillatedValue = (
      baseValue: number,
      enabled: boolean,
      waveFunc: WaveFunction,
      speed: number,
      min: number,
      max: number
    ): number => {
      if (!enabled) return baseValue;
      const wave = waveFunctions[waveFunc];
      const normalizedWave = (wave(time * speed) + 1) / 2; // 0 to 1
      return min + normalizedWave * (max - min);
    };

    const animate = () => {
      // FPS tracking
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      fps = 1000 / delta;
      regenThisFrame = 0;

      if (!pausedRef.current) {
        time += 0.01;

        // Apply camera rotation with oscillation
        const currentCameraRotation = getOscillatedValue(
          cameraRotationRef.current,
          cameraRotationOscEnabledRef.current,
          cameraRotationOscFunctionRef.current,
          cameraRotationOscSpeedRef.current,
          cameraRotationOscMinRef.current,
          cameraRotationOscMaxRef.current
        );
        camera.rotation.z = currentCameraRotation;
        debugInfoRef.current.oscCameraRotation = currentCameraRotation;

        // Calculate current shape rotation and rotation speed for debug display
        const currentShapeRotationDebug = getOscillatedValue(
          shapeRotationRef.current,
          shapeRotationOscEnabledRef.current,
          shapeRotationOscFunctionRef.current,
          shapeRotationOscSpeedRef.current,
          shapeRotationOscMinRef.current,
          shapeRotationOscMaxRef.current
        );

        const currentRotationSpeedDebug = getOscillatedValue(
          rotationSpeedRef.current,
          rotationSpeedOscEnabledRef.current,
          rotationSpeedOscFunctionRef.current,
          rotationSpeedOscSpeedRef.current,
          rotationSpeedOscMinRef.current,
          rotationSpeedOscMaxRef.current
        );

        // Calculate actual rotation (source of truth for visual rotation)
        const actualRotation = currentShapeRotationDebug + currentRotationSpeedDebug;

        // Update debug info for rotation values every frame
        debugInfoRef.current.shapeRotation = currentShapeRotationDebug;
        debugInfoRef.current.rotationSpeed = currentRotationSpeedDebug;
        debugInfoRef.current.oscShapeRotation = currentShapeRotationDebug;
        debugInfoRef.current.oscRotationSpeed = currentRotationSpeedDebug;
        debugInfoRef.current.generationRotation = shapeRotationRef.current;
        debugInfoRef.current.actualRotation = actualRotation;
        debugInfoRef.current.time = time;
        debugInfoRef.current.fps = Math.round(fps);

        // Calculate burst effect (ADSR-like envelope)
        let burstScale = 1;
        if (burstEnabledRef.current) {
          const timeSinceLastBurst = time - lastBurstTime;

          // Trigger new burst if interval has passed
          if (timeSinceLastBurst >= burstIntervalRef.current) {
            lastBurstTime = time;
          }

          // Fast attack + exponential decay
          const attackTime = 0.02; // Very short attack (20ms)
          let envelope;

          if (timeSinceLastBurst < attackTime) {
            // Quick linear attack
            envelope = timeSinceLastBurst / attackTime;
          } else {
            // Exponential decay after attack
            const decayTime = timeSinceLastBurst - attackTime;
            envelope = Math.exp(-burstDecayRef.current * decayTime);
          }

          burstScale = 1 + (burstMagnitudeRef.current - 1) * envelope;
        }

        // Move all rings forward toward camera first
        rings.forEach((ring) => {
          ring.position.z += 0.1 * speedRef.current;
        });

        // Apply burst by regenerating geometry with scaled major radius
        if (burstEnabledRef.current) {
          rings.forEach((ring) => {
            const originalRadius = ring.userData.radius;
            const segments = ring.userData.segments;
            const tubeThickness = ring.userData.tubeThickness;
            const burstRadius = originalRadius * burstScale;

            // Only regenerate if burst scale changed significantly (optimization)
            const currentRadius = (ring.geometry as THREE.TorusGeometry).parameters.radius;
            if (Math.abs(currentRadius - burstRadius) > 0.01) {
              ring.geometry.dispose();
              ring.geometry = new THREE.TorusGeometry(
                burstRadius,    // Scaled major radius
                tubeThickness,  // Constant tube thickness
                16,
                segments
              );
              regenThisFrame++;
            }
          });
        } else if (wasBurstEnabled) {
          // Reset to original radius ONCE when burst is first disabled
          rings.forEach((ring) => {
            const originalRadius = ring.userData.radius;
            const segments = ring.userData.segments;
            const tubeThickness = ring.userData.tubeThickness;
            const currentRadius = (ring.geometry as THREE.TorusGeometry).parameters.radius;

            if (Math.abs(currentRadius - originalRadius) > 0.01) {
              ring.geometry.dispose();
              ring.geometry = new THREE.TorusGeometry(
                originalRadius, // Original radius
                tubeThickness,  // Constant tube thickness
                16,
                segments
              );
              regenThisFrame++;
            }
          });
        }

        // Track burst state for next frame
        wasBurstEnabled = burstEnabledRef.current;

        // Calculate minimum Z once for all regenerations this frame
        let minZ = Infinity;
        for (let i = 0; i < rings.length; i++) {
          if (rings[i].position.z < minZ) minZ = rings[i].position.z;
        }

        // Then reset rings that passed the camera (after all movement is complete)
        rings.forEach((ring, i) => {
          if (ring.position.z > 5) {
            // Calculate oscillated generation constants
            const currentHue = getOscillatedValue(
              generationHueRef.current,
              hueOscEnabledRef.current,
              hueOscFunctionRef.current,
              hueOscSpeedRef.current,
              hueOscMinRef.current,
              hueOscMaxRef.current
            );

            const currentRadius = getOscillatedValue(
              generationRadiusRef.current,
              radiusOscEnabledRef.current,
              radiusOscFunctionRef.current,
              radiusOscSpeedRef.current,
              radiusOscMinRef.current,
              radiusOscMaxRef.current
            );

            const currentSpacing = getOscillatedValue(
              generationSpacingRef.current,
              spacingOscEnabledRef.current,
              spacingOscFunctionRef.current,
              spacingOscSpeedRef.current,
              spacingOscMinRef.current,
              spacingOscMaxRef.current
            );

            const currentSegments = Math.round(getOscillatedValue(
              generationSegmentsRef.current,
              segmentsOscEnabledRef.current,
              segmentsOscFunctionRef.current,
              segmentsOscSpeedRef.current,
              segmentsOscMinRef.current,
              segmentsOscMaxRef.current
            ));

            const currentShapeRotation = getOscillatedValue(
              shapeRotationRef.current,
              shapeRotationOscEnabledRef.current,
              shapeRotationOscFunctionRef.current,
              shapeRotationOscSpeedRef.current,
              shapeRotationOscMinRef.current,
              shapeRotationOscMaxRef.current
            );

            const currentTubeThickness = getOscillatedValue(
              tubeThicknessRef.current,
              tubeThicknessOscEnabledRef.current,
              tubeThicknessOscFunctionRef.current,
              tubeThicknessOscSpeedRef.current,
              tubeThicknessOscMinRef.current,
              tubeThicknessOscMaxRef.current
            );

            const currentRotationSpeed = getOscillatedValue(
              rotationSpeedRef.current,
              rotationSpeedOscEnabledRef.current,
              rotationSpeedOscFunctionRef.current,
              rotationSpeedOscSpeedRef.current,
              rotationSpeedOscMinRef.current,
              rotationSpeedOscMaxRef.current
            );

            const currentSaturation = getOscillatedValue(
              generationSaturationRef.current,
              saturationOscEnabledRef.current,
              saturationOscFunctionRef.current,
              saturationOscSpeedRef.current,
              saturationOscMinRef.current,
              saturationOscMaxRef.current
            );

            const currentBrightness = getOscillatedValue(
              generationBrightnessRef.current,
              brightnessOscEnabledRef.current,
              brightnessOscFunctionRef.current,
              brightnessOscSpeedRef.current,
              brightnessOscMinRef.current,
              brightnessOscMaxRef.current
            );

            // Update oscillator debug values
            debugInfoRef.current.oscHue = currentHue;
            debugInfoRef.current.oscRadius = currentRadius;
            debugInfoRef.current.oscSpacing = currentSpacing;
            debugInfoRef.current.oscSegments = currentSegments;
            debugInfoRef.current.oscTubeThickness = currentTubeThickness;
            debugInfoRef.current.oscSaturation = currentSaturation;
            debugInfoRef.current.oscBrightness = currentBrightness;

            // Place this ring behind the furthest back ring
            ring.position.z = minZ - currentSpacing;
            // Update minZ for next ring that might regenerate this frame
            minZ = ring.position.z;

            // Only regenerate geometry if parameters changed significantly
            const oldRadius = ring.userData.radius;
            const oldSegments = ring.userData.segments;
            const oldThickness = ring.userData.tubeThickness;
            const needsRegen =
              Math.abs(oldRadius - currentRadius) > 0.1 ||
              oldSegments !== currentSegments ||
              Math.abs(oldThickness - currentTubeThickness) > 0.01;

            if (needsRegen) {
              ring.geometry.dispose();
              ring.geometry = new THREE.TorusGeometry(
                currentRadius,
                currentTubeThickness,
                16,
                currentSegments
              );
              regenThisFrame++;
            }

            // Apply actual rotation (source of truth - combines shape rotation + rotation speed)
            const currentActualRotation = currentShapeRotation + currentRotationSpeed;
            ring.rotation.z = currentActualRotation;

            // Bake oscillated generation constants into ring
            ring.userData = {
              radius: currentRadius,
              segments: currentSegments,
              hue: currentHue,
              saturation: currentSaturation,
              brightness: currentBrightness,
              spacing: currentSpacing,
              shapeRotation: currentShapeRotation,
              tubeThickness: currentTubeThickness,
              birthIndex: ring.userData.birthIndex,
            };

            // Apply color with pattern override if applicable
            applyColorPattern(ring.material as THREE.MeshBasicMaterial, ring.userData.birthIndex, currentHue, currentSaturation, currentBrightness);
          }

          // Update ring-specific debug values (rotation values updated above every frame)
          if (i === 0) {
            debugInfoRef.current.ringZ = ring.position.z;
            debugInfoRef.current.hue = ring.userData.hue;
            debugInfoRef.current.regenCount = regenThisFrame;
          }
        });

        frameCount++;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [numRings]);

  // Update debug display state from ref on interval (avoids setState in animation loop)
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo({ ...debugInfoRef.current });
    }, 100); // Update display 10x per second

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Debug display - top right */}
      {!isPreview && (
        <>
          {/* Toggle Debug Button */}
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

          {showDebug && (
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
              <div style={{ color: debugInfo.regenCount > 5 ? "#ff4444" : debugInfo.regenCount > 2 ? "#ffaa44" : "#66ccff" }}>
                Regen/frame: {debugInfo.regenCount}
              </div>
              <div>Time: {debugInfo.time.toFixed(2)}</div>
              <div>Ring Z: {debugInfo.ringZ.toFixed(2)}</div>
              <div>Hue: {debugInfo.hue.toFixed(0)}°</div>
              <div style={{ borderTop: "1px solid rgba(102, 204, 255, 0.2)", marginTop: "8px", paddingTop: "8px", fontWeight: "bold", color: "#ffdd66" }}>
                Actual Rot: {(debugInfo.actualRotation * 180 / Math.PI).toFixed(1)}°
              </div>
              <div style={{ fontSize: "11px", opacity: "0.7", marginTop: "4px" }}>
                Shape Rot: {(debugInfo.shapeRotation * 180 / Math.PI).toFixed(1)}°
              </div>
              <div style={{ fontSize: "11px", opacity: "0.7" }}>Rot Speed: {debugInfo.rotationSpeed.toFixed(2)}</div>
              <div style={{ fontSize: "11px", opacity: "0.7" }}>Gen Rot: {(debugInfo.generationRotation * 180 / Math.PI).toFixed(1)}°</div>
              <div style={{ borderTop: "1px solid rgba(102, 204, 255, 0.2)", marginTop: "8px", paddingTop: "8px", fontWeight: "bold", color: "#88ff88" }}>
                Oscillator Values
              </div>
              <div style={{ fontSize: "11px", opacity: hueOscEnabled ? 1 : 0.4 }}>Hue: {debugInfo.oscHue.toFixed(1)}°</div>
              <div style={{ fontSize: "11px", opacity: radiusOscEnabled ? 1 : 0.4 }}>Radius: {debugInfo.oscRadius.toFixed(2)}</div>
              <div style={{ fontSize: "11px", opacity: spacingOscEnabled ? 1 : 0.4 }}>Spacing: {debugInfo.oscSpacing.toFixed(2)}</div>
              <div style={{ fontSize: "11px", opacity: segmentsOscEnabled ? 1 : 0.4 }}>Segments: {debugInfo.oscSegments}</div>
              <div style={{ fontSize: "11px", opacity: cameraRotationOscEnabled ? 1 : 0.4 }}>Cam Rot: {(debugInfo.oscCameraRotation * 180 / Math.PI).toFixed(1)}°</div>
              <div style={{ fontSize: "11px", opacity: rotationSpeedOscEnabled ? 1 : 0.4 }}>Rot Speed: {debugInfo.oscRotationSpeed.toFixed(2)}</div>
              <div style={{ fontSize: "11px", opacity: shapeRotationOscEnabled ? 1 : 0.4 }}>Shape Rot: {(debugInfo.oscShapeRotation * 180 / Math.PI).toFixed(1)}°</div>
              <div style={{ fontSize: "11px", opacity: tubeThicknessOscEnabled ? 1 : 0.4 }}>Tube Thick: {debugInfo.oscTubeThickness.toFixed(3)}</div>
              <div style={{ fontSize: "11px", opacity: saturationOscEnabled ? 1 : 0.4 }}>Saturation: {debugInfo.oscSaturation.toFixed(2)}</div>
              <div style={{ fontSize: "11px", opacity: brightnessOscEnabled ? 1 : 0.4 }}>Brightness: {debugInfo.oscBrightness.toFixed(2)}</div>
            </div>
          )}
        </>
      )}

      {/* Toggle Controls Button - Always Visible */}
      <button
        onClick={() => setShowControls(!showControls)}
        style={{
          position: "absolute",
          top: "10px",
          left: showControls ? "290px" : "10px",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: "14px",
          fontFamily: "monospace",
          transition: "left 0.3s ease",
        }}
        title={showControls ? "Hide Controls (for recording)" : "Show Controls"}
      >
        {showControls ? "◀ Hide" : "▶ Show"}
      </button>

      {showControls && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "280px",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "20px",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #444" }}>
            <a href="/" style={{ fontSize: "12px", color: "#66ccff", textDecoration: "none" }}>← Gallery</a>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <h2 style={{ margin: "0", fontSize: "18px", color: "#fff" }}>
                3D Tunnel
              </h2>
              <button
                onClick={resetAllSettings}
                style={{
                  background: "#444",
                  color: "#fff",
                  border: "1px solid #666",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#555"}
                onMouseOut={(e) => e.currentTarget.style.background = "#444"}
                title="Reset all settings to defaults"
              >
                Reset All
              </button>
            </div>
          </div>

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
              Speed: {speed.toFixed(1)}
            </label>
            <input
              id="speed"
              type="range"
              min="0.1"
              max="200"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="numRings"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Number of Rings: {numRings}
            </label>
            <input
              id="numRings"
              type="range"
              min="10"
              max="3000"
              step="1"
              value={numRings}
              onChange={(e) => setNumRings(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="colorPattern"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Color Pattern
            </label>
            <select
              id="colorPattern"
              value={colorPattern}
              onChange={(e) => setColorPattern(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "4px"
              }}
            >
              <option value="none">None</option>
              <option value="every-5-white">Every 5 White</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="cameraRotation"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Camera Rotation: {(cameraRotation * 180 / Math.PI).toFixed(0)}°
            </label>
            <input
              id="cameraRotation"
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.01"
              value={cameraRotation}
              onChange={(e) => setCameraRotation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationRadius"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Radius: {generationRadius.toFixed(1)}
            </label>
            <input
              id="generationRadius"
              type="range"
              min="2"
              max="1000"
              step="0.1"
              value={generationRadius}
              onChange={(e) => setGenerationRadius(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationSegments"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Segments: {generationSegments}
            </label>
            <input
              id="generationSegments"
              type="range"
              min="3"
              max="64"
              step="1"
              value={generationSegments}
              onChange={(e) => setGenerationSegments(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationSpacing"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Spacing: {generationSpacing.toFixed(1)}
            </label>
            <input
              id="generationSpacing"
              type="range"
              min="0.5"
              max="5"
              step="0.01"
              value={generationSpacing}
              onChange={(e) => setGenerationSpacing(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationHue"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Hue: {generationHue}°
            </label>
            <input
              id="generationHue"
              type="range"
              min="0"
              max="360"
              step="0.1"
              value={generationHue}
              onChange={(e) => setGenerationHue(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationSaturation"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Saturation: {generationSaturation.toFixed(2)}
            </label>
            <input
              id="generationSaturation"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={generationSaturation}
              onChange={(e) => setGenerationSaturation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="generationBrightness"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Brightness: {generationBrightness.toFixed(2)}
            </label>
            <input
              id="generationBrightness"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={generationBrightness}
              onChange={(e) => setGenerationBrightness(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="shapeRotation"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Shape Rotation: {(shapeRotation * 180 / Math.PI).toFixed(0)}°
            </label>
            <input
              id="shapeRotation"
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.01"
              value={shapeRotation}
              onChange={(e) => setShapeRotation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="tubeThickness"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Tube Thickness: {tubeThickness.toFixed(2)}
            </label>
            <input
              id="tubeThickness"
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={tubeThickness}
              onChange={(e) => setTubeThickness(Number(e.target.value))}
              style={{ width: "100%" }}
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
              Shape Rotation Speed: {rotationSpeed.toFixed(2)}
            </label>
            <input
              id="rotationSpeed"
              type="range"
              min="-10"
              max="10"
              step="0.01"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Burst Section */}
          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #444" }}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#ff6644", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Burst {burstEnabled ? "✓" : ""}
            </h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px" }}>
                <input type="checkbox" checked={burstEnabled} onChange={(e) => setBurstEnabled(e.target.checked)} />
                {" "}Enable Burst
              </label>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#ccc" }}>
                Interval: {burstInterval.toFixed(1)}s
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={burstInterval}
                onChange={(e) => setBurstInterval(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#ccc" }}>
                Magnitude: {burstMagnitude.toFixed(2)}x
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={burstMagnitude}
                onChange={(e) => setBurstMagnitude(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#ccc" }}>
                Decay Speed: {burstDecay.toFixed(1)}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={burstDecay}
                onChange={(e) => setBurstDecay(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                Higher = snappier burst
              </div>
            </div>
          </div>

          {/* Oscillators Section */}
          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: "0", fontSize: "14px", color: "#66ccff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Oscillators
              </h3>
              <button
                onClick={clearAllOscillators}
                style={{
                  background: "#ff4444",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#ff6666"}
                onMouseOut={(e) => e.currentTarget.style.background = "#ff4444"}
              >
                Clear All
              </button>
            </div>

            {/* Hue Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Hue Oscillator {hueOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={hueOscEnabled} onChange={(e) => setHueOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={hueOscFunction} onChange={(e) => setHueOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {hueOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {hueOscMin}
                  <input type="range" min="0" max="360" step="0.01" value={hueOscMin} onChange={(e) => setHueOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {hueOscMax}
                  <input type="range" min="0" max="360" step="0.01" value={hueOscMax} onChange={(e) => setHueOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Radius Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Radius Oscillator {radiusOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={radiusOscEnabled} onChange={(e) => setRadiusOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={radiusOscFunction} onChange={(e) => setRadiusOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {radiusOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={radiusOscSpeed} onChange={(e) => setRadiusOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {radiusOscMin.toFixed(1)}
                  <input type="range" min="2" max="1000" step="0.01" value={radiusOscMin} onChange={(e) => setRadiusOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {radiusOscMax.toFixed(1)}
                  <input type="range" min="2" max="1000" step="0.01" value={radiusOscMax} onChange={(e) => setRadiusOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Spacing Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Spacing Oscillator {spacingOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={spacingOscEnabled} onChange={(e) => setSpacingOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={spacingOscFunction} onChange={(e) => setSpacingOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {spacingOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={spacingOscSpeed} onChange={(e) => setSpacingOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {spacingOscMin.toFixed(1)}
                  <input type="range" min="0.5" max="5" step="0.01" value={spacingOscMin} onChange={(e) => setSpacingOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {spacingOscMax.toFixed(1)}
                  <input type="range" min="0.5" max="5" step="0.01" value={spacingOscMax} onChange={(e) => setSpacingOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Segments Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Segments Oscillator {segmentsOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={segmentsOscEnabled} onChange={(e) => setSegmentsOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={segmentsOscFunction} onChange={(e) => setSegmentsOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {segmentsOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={segmentsOscSpeed} onChange={(e) => setSegmentsOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {segmentsOscMin}
                  <input type="range" min="3" max="64" step="0.01" value={segmentsOscMin} onChange={(e) => setSegmentsOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {segmentsOscMax}
                  <input type="range" min="3" max="64" step="0.01" value={segmentsOscMax} onChange={(e) => setSegmentsOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Camera Rotation Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Camera Rotation Oscillator {cameraRotationOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={cameraRotationOscEnabled} onChange={(e) => setCameraRotationOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={cameraRotationOscFunction} onChange={(e) => setCameraRotationOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {cameraRotationOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={cameraRotationOscSpeed} onChange={(e) => setCameraRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {(cameraRotationOscMin * 180 / Math.PI).toFixed(0)}°
                  <input type="range" min="0" max={Math.PI * 2} step="0.01" value={cameraRotationOscMin} onChange={(e) => setCameraRotationOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {(cameraRotationOscMax * 180 / Math.PI).toFixed(0)}°
                  <input type="range" min="0" max={Math.PI * 2} step="0.01" value={cameraRotationOscMax} onChange={(e) => setCameraRotationOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Shape Rotation Speed Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Shape Rotation Speed Oscillator {rotationSpeedOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={rotationSpeedOscEnabled} onChange={(e) => setRotationSpeedOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={rotationSpeedOscFunction} onChange={(e) => setRotationSpeedOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {rotationSpeedOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={rotationSpeedOscSpeed} onChange={(e) => setRotationSpeedOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {rotationSpeedOscMin.toFixed(2)}
                  <input type="range" min="-50" max="50" step="0.01" value={rotationSpeedOscMin} onChange={(e) => setRotationSpeedOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {rotationSpeedOscMax.toFixed(2)}
                  <input type="range" min="-50" max="50" step="0.01" value={rotationSpeedOscMax} onChange={(e) => setRotationSpeedOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Shape Rotation Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Shape Rotation Oscillator {shapeRotationOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={shapeRotationOscEnabled} onChange={(e) => setShapeRotationOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={shapeRotationOscFunction} onChange={(e) => setShapeRotationOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {shapeRotationOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={shapeRotationOscSpeed} onChange={(e) => setShapeRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {(shapeRotationOscMin * 180 / Math.PI).toFixed(0)}°
                  <input type="range" min="0" max={Math.PI * 2} step="0.01" value={shapeRotationOscMin} onChange={(e) => setShapeRotationOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {(shapeRotationOscMax * 180 / Math.PI).toFixed(0)}°
                  <input type="range" min="0" max={Math.PI * 2} step="0.01" value={shapeRotationOscMax} onChange={(e) => setShapeRotationOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Tube Thickness Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Tube Thickness Oscillator {tubeThicknessOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={tubeThicknessOscEnabled} onChange={(e) => setTubeThicknessOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={tubeThicknessOscFunction} onChange={(e) => setTubeThicknessOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {tubeThicknessOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={tubeThicknessOscSpeed} onChange={(e) => setTubeThicknessOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {tubeThicknessOscMin.toFixed(2)}
                  <input type="range" min="0.05" max="1" step="0.01" value={tubeThicknessOscMin} onChange={(e) => setTubeThicknessOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {tubeThicknessOscMax.toFixed(2)}
                  <input type="range" min="0.05" max="1" step="0.01" value={tubeThicknessOscMax} onChange={(e) => setTubeThicknessOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Saturation Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Saturation Oscillator {saturationOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={saturationOscEnabled} onChange={(e) => setSaturationOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={saturationOscFunction} onChange={(e) => setSaturationOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {saturationOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={saturationOscSpeed} onChange={(e) => setSaturationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {saturationOscMin.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={saturationOscMin} onChange={(e) => setSaturationOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {saturationOscMax.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={saturationOscMax} onChange={(e) => setSaturationOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Brightness Oscillator */}
            <details style={{ marginBottom: "15px" }}>
              <summary style={{ cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" }}>
                Brightness Oscillator {brightnessOscEnabled ? "✓" : ""}
              </summary>
              <div style={{ padding: "10px 0 0 10px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  <input type="checkbox" checked={brightnessOscEnabled} onChange={(e) => setBrightnessOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Function:
                  <select value={brightnessOscFunction} onChange={(e) => setBrightnessOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" }}>
                    <optgroup label="Basic">
                      <option value="sin">Sin</option>
                      <option value="cos">Cos</option>
                      <option value="triangle">Triangle</option>
                      <option value="sawtooth">Sawtooth</option>
                      <option value="square">Square</option>
                      <option value="pulse">Pulse</option>
                    </optgroup>
                    <optgroup label="Smooth">
                      <option value="smoothstep">Smooth Step</option>
                      <option value="breath">Breath</option>
                      <option value="circular">Circular</option>
                    </optgroup>
                    <optgroup label="Dynamic">
                      <option value="bounce">Bounce</option>
                      <option value="elastic">Elastic</option>
                      <option value="wobble">Wobble</option>
                    </optgroup>
                    <optgroup label="Mathematical">
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                      <option value="spiral">Spiral</option>
                    </optgroup>
                    <optgroup label="Complex">
                      <option value="double-sin">Double Sin</option>
                      <option value="triple-sin">Triple Sin</option>
                      <option value="heart">Heart</option>
                      <option value="chaos">Chaos</option>
                    </optgroup>
                    <optgroup label="Geometric">
                      <option value="zigzag">Zigzag</option>
                      <option value="steps">Steps</option>
                    </optgroup>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {brightnessOscSpeed.toFixed(2)}
                  <input type="range" min="0.001" max="5" step="0.001" value={brightnessOscSpeed} onChange={(e) => setBrightnessOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {brightnessOscMin.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={brightnessOscMin} onChange={(e) => setBrightnessOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {brightnessOscMax.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={brightnessOscMax} onChange={(e) => setBrightnessOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
