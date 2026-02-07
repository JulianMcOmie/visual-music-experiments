"use client";

import { useEffect, useRef, useState } from "react";
import { generateTiling, drawTile, type TilingState } from "./penrose-core";

type WaveFunction = "sin" | "cos" | "triangle" | "sawtooth" | "custom";
type DelayFunction = "linear" | "quadratic" | "sqrt" | "exponential" | "inverse";
type DelayMode = "distance" | "angle" | "spiral" | "radial";

const waveFunctions: Record<Exclude<WaveFunction, "custom">, (x: number) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  triangle: (x) => Math.abs((x / Math.PI) % 2 - 1) * 2 - 1,
  sawtooth: (x) => (2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5))),
};

// Helper function to compute custom wave value
function computeCustomWave(
  t: number,
  sinWeight: number,
  sinFreq: number,
  cosWeight: number,
  cosFreq: number
): number {
  const sinComponent = sinWeight * Math.sin(t * sinFreq);
  const cosComponent = cosWeight * Math.cos(t * cosFreq);
  const rawValue = sinComponent + cosComponent;

  // Normalize to -1 to 1 range
  const maxAmp = Math.abs(sinWeight) + Math.abs(cosWeight);
  if (maxAmp === 0) return 0;

  return Math.max(-1, Math.min(1, rawValue / maxAmp));
}

const delayFunctions: Record<DelayFunction, (x: number, max: number, power?: number) => number> = {
  linear: (x, max, power = 1) => Math.pow(x, power),
  quadratic: (x, max, power = 1) => Math.pow((x / max) * x, power), // Accelerating delay
  sqrt: (x, max, power = 1) => Math.pow(Math.sqrt(x) * Math.sqrt(max), power), // Decelerating delay
  exponential: (x, max, power = 1) => Math.pow((Math.exp(x / max) - 1) * (max / (Math.E - 1)), power), // Exponential growth
  inverse: (x, max, power = 1) => Math.pow(max - x, power), // Reverse: center has most delay
};

// Calculate delay value based on tile position
function calculateDelayValue(
  tile: { x: number; y: number; generation: number },
  mode: DelayMode,
  maxGeneration: number,
  angleOffset: number = 0,
  modeParam: number = 1
): number {
  switch (mode) {
    case "distance":
      // Based on distance from center (radial)
      return tile.generation;

    case "angle":
      // Based on angle around center (creates rotating sweep)
      // angleOffset rotates the pattern
      let angle = Math.atan2(tile.y, tile.x) + angleOffset;
      let normalized = (angle + Math.PI) / (2 * Math.PI);
      normalized = ((normalized % 1) + 1) % 1;
      return normalized * maxGeneration;

    case "spiral":
      // Combination of distance and angle (creates spiral pattern)
      // modeParam controls spiral tightness (how much angle contributes)
      let spiralAngle = Math.atan2(tile.y, tile.x) + angleOffset;
      let normalizedAngle = (spiralAngle + Math.PI) / (2 * Math.PI);
      normalizedAngle = ((normalizedAngle % 1) + 1) % 1;
      return tile.generation + (normalizedAngle * maxGeneration * modeParam);

    case "radial":
      // Distance × angle (creates radial sectors with varying delay)
      // modeParam controls the power/intensity of the radial effect
      let radialAngle = Math.atan2(tile.y, tile.x) + angleOffset;
      let normalizedRadial = (radialAngle + Math.PI) / (2 * Math.PI);
      normalizedRadial = ((normalizedRadial % 1) + 1) % 1;
      return tile.generation * Math.pow(normalizedRadial, modeParam);

    default:
      return tile.generation;
  }
}

interface ColorPalette {
  name: string;
  kiteHue: (baseHue: number) => number;
  dartHue: (baseHue: number) => number;
  kiteSat: number;
  dartSat: number;
  kiteLight: number;
  dartLight: number;
  hueRange?: { min: number; max: number }; // Optional hue constraint
}

const colorPalettes: Record<string, ColorPalette> = {
  complementary: {
    name: "Complementary",
    kiteHue: (h) => h,
    dartHue: (h) => (h + 180) % 360,
    kiteSat: 75,
    dartSat: 70,
    kiteLight: 55,
    dartLight: 50,
  },
  analogous: {
    name: "Analogous",
    kiteHue: (h) => h,
    dartHue: (h) => (h + 30) % 360,
    kiteSat: 70,
    dartSat: 70,
    kiteLight: 55,
    dartLight: 50,
  },
  triadic: {
    name: "Triadic",
    kiteHue: (h) => h,
    dartHue: (h) => (h + 120) % 360,
    kiteSat: 75,
    dartSat: 75,
    kiteLight: 55,
    dartLight: 55,
  },
  monochrome: {
    name: "Monochrome",
    kiteHue: (h) => h,
    dartHue: (h) => h,
    kiteSat: 70,
    dartSat: 40,
    kiteLight: 60,
    dartLight: 40,
  },
  vibrant: {
    name: "Vibrant",
    kiteHue: (h) => h,
    dartHue: (h) => (h + 60) % 360,
    kiteSat: 90,
    dartSat: 85,
    kiteLight: 60,
    dartLight: 55,
  },
  pastel: {
    name: "Pastel",
    kiteHue: (h) => h,
    dartHue: (h) => (h + 180) % 360,
    kiteSat: 40,
    dartSat: 35,
    kiteLight: 75,
    dartLight: 70,
  },
  blues: {
    name: "Blues Only",
    kiteHue: (h) => h,
    dartHue: (h) => h + 20,
    kiteSat: 75,
    dartSat: 70,
    kiteLight: 55,
    dartLight: 50,
    hueRange: { min: 180, max: 240 },
  },
  reds: {
    name: "Reds Only",
    kiteHue: (h) => h,
    dartHue: (h) => h + 20,
    kiteSat: 80,
    dartSat: 75,
    kiteLight: 55,
    dartLight: 50,
    hueRange: { min: 340, max: 20 },
  },
  greens: {
    name: "Greens Only",
    kiteHue: (h) => h,
    dartHue: (h) => h + 20,
    kiteSat: 70,
    dartSat: 65,
    kiteLight: 55,
    dartLight: 50,
    hueRange: { min: 90, max: 150 },
  },
  warm: {
    name: "Warm Colors",
    kiteHue: (h) => h,
    dartHue: (h) => h + 30,
    kiteSat: 80,
    dartSat: 75,
    kiteLight: 60,
    dartLight: 55,
    hueRange: { min: 0, max: 60 },
  },
  cool: {
    name: "Cool Colors",
    kiteHue: (h) => h,
    dartHue: (h) => h + 30,
    kiteSat: 70,
    dartSat: 65,
    kiteLight: 55,
    dartLight: 50,
    hueRange: { min: 180, max: 270 },
  },
  purples: {
    name: "Purples Only",
    kiteHue: (h) => h,
    dartHue: (h) => h + 20,
    kiteSat: 75,
    dartSat: 70,
    kiteLight: 55,
    dartLight: 50,
    hueRange: { min: 270, max: 320 },
  },
};

function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export default function PenroseTiling() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [masterOscEnabled, setMasterOscEnabled] = useState(true);
  const isPausedRef = useRef(false);
  const [layers, setLayers] = useState(7);
  const [rotation, setRotation] = useState(0);
  const [hue, setHue] = useState(200);
  const [scale, setScale] = useState(0.75); // Start more zoomed out
  const [layerTimeDelay, setLayerTimeDelay] = useState(0.3);
  const [delayFunction, setDelayFunction] = useState<DelayFunction>("linear");
  const [delayMode, setDelayMode] = useState<DelayMode>("distance");
  const [colorPalette, setColorPalette] = useState<string>("analogous");

  // Individual tile rotation (rotation of each shape on its own axis)
  const [tileRotation, setTileRotation] = useState(0);
  const [tileRotationOscEnabled, setTileRotationOscEnabled] = useState(false);
  const [tileRotationOscFunction, setTileRotationOscFunction] = useState<WaveFunction>("sin");
  const [tileRotationOscSpeed, setTileRotationOscSpeed] = useState(0.5);
  const [tileRotationOscMin, setTileRotationOscMin] = useState(0);
  const [tileRotationOscMax, setTileRotationOscMax] = useState(Math.PI * 2);
  const [tileRotationOscCustomSinWeight, setTileRotationOscCustomSinWeight] = useState(0.5);
  const [tileRotationOscCustomSinFreq, setTileRotationOscCustomSinFreq] = useState(1);
  const [tileRotationOscCustomCosWeight, setTileRotationOscCustomCosWeight] = useState(0.5);
  const [tileRotationOscCustomCosFreq, setTileRotationOscCustomCosFreq] = useState(1);

  // Tile spread (how much tiles are spread apart from center)
  const [tileSpread, setTileSpread] = useState(1);
  const [tileSpreadOscEnabled, setTileSpreadOscEnabled] = useState(false);
  const [tileSpreadOscFunction, setTileSpreadOscFunction] = useState<WaveFunction>("sin");
  const [tileSpreadOscSpeed, setTileSpreadOscSpeed] = useState(0.5);
  const [tileSpreadOscMin, setTileSpreadOscMin] = useState(1); // matches tileSpread default
  const [tileSpreadOscMax, setTileSpreadOscMax] = useState(1.5);
  const [tileSpreadOscCustomSinWeight, setTileSpreadOscCustomSinWeight] = useState(0.5);
  const [tileSpreadOscCustomSinFreq, setTileSpreadOscCustomSinFreq] = useState(1);
  const [tileSpreadOscCustomCosWeight, setTileSpreadOscCustomCosWeight] = useState(0.5);
  const [tileSpreadOscCustomCosFreq, setTileSpreadOscCustomCosFreq] = useState(1);

  const [rotationOscEnabled, setRotationOscEnabled] = useState(false);
  const [rotationOscFunction, setRotationOscFunction] = useState<WaveFunction>("sin");
  const [rotationOscSpeed, setRotationOscSpeed] = useState(0.5);
  const [rotationOscMin, setRotationOscMin] = useState(0);
  const [rotationOscMax, setRotationOscMax] = useState(Math.PI * 2);
  const [rotationOscCustomSinWeight, setRotationOscCustomSinWeight] = useState(0.5);
  const [rotationOscCustomSinFreq, setRotationOscCustomSinFreq] = useState(1);
  const [rotationOscCustomCosWeight, setRotationOscCustomCosWeight] = useState(0.5);
  const [rotationOscCustomCosFreq, setRotationOscCustomCosFreq] = useState(1);

  const [hueOscEnabled, setHueOscEnabled] = useState(false);
  const [hueOscFunction, setHueOscFunction] = useState<WaveFunction>("sin");
  const [hueOscSpeed, setHueOscSpeed] = useState(1);
  const [hueOscMin, setHueOscMin] = useState(200); // matches hue default
  const [hueOscMax, setHueOscMax] = useState(360);
  const [hueOscCustomSinWeight, setHueOscCustomSinWeight] = useState(0.5);
  const [hueOscCustomSinFreq, setHueOscCustomSinFreq] = useState(1);
  const [hueOscCustomCosWeight, setHueOscCustomCosWeight] = useState(0.5);
  const [hueOscCustomCosFreq, setHueOscCustomCosFreq] = useState(1);

  const [layerOscEnabled, setLayerOscEnabled] = useState(false);
  const [layerOscFunction, setLayerOscFunction] = useState<WaveFunction>("sin");
  const [layerOscSpeed, setLayerOscSpeed] = useState(0.5);
  const [layerOscMin, setLayerOscMin] = useState(7); // matches layers default
  const [layerOscMax, setLayerOscMax] = useState(10);
  const [layerOscCustomSinWeight, setLayerOscCustomSinWeight] = useState(0.5);
  const [layerOscCustomSinFreq, setLayerOscCustomSinFreq] = useState(1);
  const [layerOscCustomCosWeight, setLayerOscCustomCosWeight] = useState(0.5);
  const [layerOscCustomCosFreq, setLayerOscCustomCosFreq] = useState(1);

  const [timeDelayOscEnabled, setTimeDelayOscEnabled] = useState(false);
  const [timeDelayOscFunction, setTimeDelayOscFunction] = useState<WaveFunction>("sin");
  const [timeDelayOscSpeed, setTimeDelayOscSpeed] = useState(0.5);
  const [timeDelayOscMin, setTimeDelayOscMin] = useState(0.3); // matches layerTimeDelay default
  const [timeDelayOscMax, setTimeDelayOscMax] = useState(2);
  const [timeDelayOscCustomSinWeight, setTimeDelayOscCustomSinWeight] = useState(0.5);
  const [timeDelayOscCustomSinFreq, setTimeDelayOscCustomSinFreq] = useState(1);
  const [timeDelayOscCustomCosWeight, setTimeDelayOscCustomCosWeight] = useState(0.5);
  const [timeDelayOscCustomCosFreq, setTimeDelayOscCustomCosFreq] = useState(1);

  // Angle offset parameter (rotates the angular component)
  const [angleOffset, setAngleOffset] = useState(0);
  const [angleOffsetOscEnabled, setAngleOffsetOscEnabled] = useState(false);
  const [angleOffsetOscFunction, setAngleOffsetOscFunction] = useState<WaveFunction>("sin");
  const [angleOffsetOscSpeed, setAngleOffsetOscSpeed] = useState(0.5);
  const [angleOffsetOscMin, setAngleOffsetOscMin] = useState(0);
  const [angleOffsetOscMax, setAngleOffsetOscMax] = useState(Math.PI * 2);
  const [angleOffsetOscCustomSinWeight, setAngleOffsetOscCustomSinWeight] = useState(0.5);
  const [angleOffsetOscCustomSinFreq, setAngleOffsetOscCustomSinFreq] = useState(1);
  const [angleOffsetOscCustomCosWeight, setAngleOffsetOscCustomCosWeight] = useState(0.5);
  const [angleOffsetOscCustomCosFreq, setAngleOffsetOscCustomCosFreq] = useState(1);

  // Delay mode parameter (mode-specific control)
  const [delayModeParam, setDelayModeParam] = useState(1.25);
  const [delayModeParamOscEnabled, setDelayModeParamOscEnabled] = useState(false);
  const [delayModeParamOscFunction, setDelayModeParamOscFunction] = useState<WaveFunction>("sin");
  const [delayModeParamOscSpeed, setDelayModeParamOscSpeed] = useState(0.5);
  const [delayModeParamOscMin, setDelayModeParamOscMin] = useState(1.25); // matches delayModeParam default
  const [delayModeParamOscMax, setDelayModeParamOscMax] = useState(2);
  const [delayModeParamOscCustomSinWeight, setDelayModeParamOscCustomSinWeight] = useState(0.5);
  const [delayModeParamOscCustomSinFreq, setDelayModeParamOscCustomSinFreq] = useState(1);
  const [delayModeParamOscCustomCosWeight, setDelayModeParamOscCustomCosWeight] = useState(0.5);
  const [delayModeParamOscCustomCosFreq, setDelayModeParamOscCustomCosFreq] = useState(1);

  // Delay function power parameter
  const [delayFunctionPower, setDelayFunctionPower] = useState(1);
  const [delayFunctionPowerOscEnabled, setDelayFunctionPowerOscEnabled] = useState(false);
  const [delayFunctionPowerOscFunction, setDelayFunctionPowerOscFunction] = useState<WaveFunction>("sin");
  const [delayFunctionPowerOscSpeed, setDelayFunctionPowerOscSpeed] = useState(0.5);
  const [delayFunctionPowerOscMin, setDelayFunctionPowerOscMin] = useState(1); // matches delayFunctionPower default
  const [delayFunctionPowerOscMax, setDelayFunctionPowerOscMax] = useState(2);
  const [delayFunctionPowerOscCustomSinWeight, setDelayFunctionPowerOscCustomSinWeight] = useState(0.5);
  const [delayFunctionPowerOscCustomSinFreq, setDelayFunctionPowerOscCustomSinFreq] = useState(1);
  const [delayFunctionPowerOscCustomCosWeight, setDelayFunctionPowerOscCustomCosWeight] = useState(0.5);
  const [delayFunctionPowerOscCustomCosFreq, setDelayFunctionPowerOscCustomCosFreq] = useState(1);

  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);
  const tilingRef = useRef<TilingState | null>(null);
  const pausedTimeRef = useRef<number | null>(null);
  const resumeStartTimeRef = useRef<number | null>(null);
  const transitionTimeRef = useRef<number>(0); // Separate timer for transition progress
  // Store per-tile visual states at the start of resume transition (frozen state)
  const resumeTileStatesRef = useRef<Map<number, {
    spread: number;
    globalRotation: number;
    individualRotation: number;
    hue: number;
    scale: number;
  }> | null>(null);
  // Store per-tile target states for smooth interpolation (calculated once at resume)
  const resumeTargetStatesRef = useRef<Map<number, {
    spread: number;
    globalRotation: number;
    individualRotation: number;
    hue: number;
    scale: number;
  }> | null>(null);
  // Store structural settings that affect tile calculations
  const frozenStructuralSettingsRef = useRef<{
    layers: number;
    delayMode: DelayMode;
    delayFunction: DelayFunction;
  } | null>(null);
  const frozenValuesRef = useRef<{
    rotation: number;
    hue: number;
    layers: number;
    scale: number;
    layerTimeDelay: number;
    angleOffset: number;
    delayModeParam: number;
    delayFunctionPower: number;
    tileRotation: number;
    tileSpread: number;
    colorPalette: string;
    delayFunction: DelayFunction;
    delayMode: DelayMode;
    // Oscillator enabled states
    rotationOscEnabled: boolean;
    hueOscEnabled: boolean;
    layerOscEnabled: boolean;
    timeDelayOscEnabled: boolean;
    angleOffsetOscEnabled: boolean;
    delayModeParamOscEnabled: boolean;
    delayFunctionPowerOscEnabled: boolean;
    tileRotationOscEnabled: boolean;
    tileSpreadOscEnabled: boolean;
  } | null>(null);
  const TRANSITION_DURATION = 5.0; // seconds

  // Cache tilings for different layer counts to avoid regenerating
  const tilingCacheRef = useRef<Map<number, TilingState>>(new Map());

  const getTiling = (numLayers: number): TilingState => {
    if (!tilingCacheRef.current.has(numLayers)) {
      tilingCacheRef.current.set(numLayers, generateTiling(numLayers, 100));
    }
    return tilingCacheRef.current.get(numLayers)!;
  };

  const toggleAllOscillators = () => {
    if (!isPausedRef.current) {
      // Pausing - stop time and capture visual state
      isPausedRef.current = true;
      // Frozen tile states will be captured on next frame
      resumeTileStatesRef.current = null;
      resumeTargetStatesRef.current = null;
      setMasterOscEnabled(false);
    } else {
      // Resuming - start transition
      setTimeout(() => {
        isPausedRef.current = false;
        resumeStartTimeRef.current = timeRef.current;
        transitionTimeRef.current = 0; // Reset transition timer
        resumeTargetStatesRef.current = null; // Will be populated on first transition frame
        setMasterOscEnabled(true);
      }, 16);
    }
  };

  // Clear cache when layers setting changes manually
  useEffect(() => {
    tilingCacheRef.current.clear();
  }, [layers]);

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

    const animate = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = timeRef.current;

      let currentRotation = rotation;
      if (rotationOscEnabled) {
        let normalizedWave;
        if (rotationOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * rotationOscSpeed,
            rotationOscCustomSinWeight,
            rotationOscCustomSinFreq,
            rotationOscCustomCosWeight,
            rotationOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[rotationOscFunction];
          normalizedWave = (wave(time * rotationOscSpeed) + 1) / 2;
        }
        currentRotation = rotationOscMin + normalizedWave * (rotationOscMax - rotationOscMin);
      }

      // Get palette first to check for hue range (for oscillator calculation)
      const palette = colorPalettes[colorPalette];

      let currentHue = hue;
      if (hueOscEnabled) {
        let normalizedWave;
        if (hueOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * hueOscSpeed,
            hueOscCustomSinWeight,
            hueOscCustomSinFreq,
            hueOscCustomCosWeight,
            hueOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[hueOscFunction];
          normalizedWave = (wave(time * hueOscSpeed) + 1) / 2;
        }

        // If palette has hue range, oscillate within that range
        if (palette.hueRange) {
          const { min, max } = palette.hueRange;
          if (min > max) {
            // Wrap-around case (e.g., reds: 340-20)
            const range = (360 - min) + max;
            currentHue = min + normalizedWave * range;
            if (currentHue >= 360) currentHue -= 360;
          } else {
            currentHue = min + normalizedWave * (max - min);
          }
        } else {
          currentHue = hueOscMin + normalizedWave * (hueOscMax - hueOscMin);
        }
      } else if (palette.hueRange) {
        // Static hue constrained to palette range
        const { min, max } = palette.hueRange;
        currentHue = min;
      }

      let currentLayers = layers;
      if (layerOscEnabled) {
        let normalizedWave;
        if (layerOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * layerOscSpeed,
            layerOscCustomSinWeight,
            layerOscCustomSinFreq,
            layerOscCustomCosWeight,
            layerOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[layerOscFunction];
          normalizedWave = (wave(time * layerOscSpeed) + 1) / 2;
        }
        currentLayers = Math.round(layerOscMin + normalizedWave * (layerOscMax - layerOscMin));
      }

      let currentTimeDelay = layerTimeDelay;
      if (timeDelayOscEnabled) {
        let normalizedWave;
        if (timeDelayOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * timeDelayOscSpeed,
            timeDelayOscCustomSinWeight,
            timeDelayOscCustomSinFreq,
            timeDelayOscCustomCosWeight,
            timeDelayOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[timeDelayOscFunction];
          normalizedWave = (wave(time * timeDelayOscSpeed) + 1) / 2;
        }
        currentTimeDelay = timeDelayOscMin + normalizedWave * (timeDelayOscMax - timeDelayOscMin);
      }

      let currentAngleOffset = angleOffset;
      if (angleOffsetOscEnabled) {
        let normalizedWave;
        if (angleOffsetOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * angleOffsetOscSpeed,
            angleOffsetOscCustomSinWeight,
            angleOffsetOscCustomSinFreq,
            angleOffsetOscCustomCosWeight,
            angleOffsetOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[angleOffsetOscFunction];
          normalizedWave = (wave(time * angleOffsetOscSpeed) + 1) / 2;
        }
        currentAngleOffset = angleOffsetOscMin + normalizedWave * (angleOffsetOscMax - angleOffsetOscMin);
      }

      let currentDelayModeParam = delayModeParam;
      if (delayModeParamOscEnabled) {
        let normalizedWave;
        if (delayModeParamOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * delayModeParamOscSpeed,
            delayModeParamOscCustomSinWeight,
            delayModeParamOscCustomSinFreq,
            delayModeParamOscCustomCosWeight,
            delayModeParamOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[delayModeParamOscFunction];
          normalizedWave = (wave(time * delayModeParamOscSpeed) + 1) / 2;
        }
        currentDelayModeParam = delayModeParamOscMin + normalizedWave * (delayModeParamOscMax - delayModeParamOscMin);
      }

      let currentDelayFunctionPower = delayFunctionPower;
      if (delayFunctionPowerOscEnabled) {
        let normalizedWave;
        if (delayFunctionPowerOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * delayFunctionPowerOscSpeed,
            delayFunctionPowerOscCustomSinWeight,
            delayFunctionPowerOscCustomSinFreq,
            delayFunctionPowerOscCustomCosWeight,
            delayFunctionPowerOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[delayFunctionPowerOscFunction];
          normalizedWave = (wave(time * delayFunctionPowerOscSpeed) + 1) / 2;
        }
        currentDelayFunctionPower = delayFunctionPowerOscMin + normalizedWave * (delayFunctionPowerOscMax - delayFunctionPowerOscMin);
      }

      let currentTileRotation = tileRotation;
      if (tileRotationOscEnabled) {
        let normalizedWave;
        if (tileRotationOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * tileRotationOscSpeed,
            tileRotationOscCustomSinWeight,
            tileRotationOscCustomSinFreq,
            tileRotationOscCustomCosWeight,
            tileRotationOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[tileRotationOscFunction];
          normalizedWave = (wave(time * tileRotationOscSpeed) + 1) / 2;
        }
        currentTileRotation = tileRotationOscMin + normalizedWave * (tileRotationOscMax - tileRotationOscMin);
      }

      let currentTileSpread = tileSpread;
      if (tileSpreadOscEnabled) {
        let normalizedWave;
        if (tileSpreadOscFunction === "custom") {
          const rawWave = computeCustomWave(
            time * tileSpreadOscSpeed,
            tileSpreadOscCustomSinWeight,
            tileSpreadOscCustomSinFreq,
            tileSpreadOscCustomCosWeight,
            tileSpreadOscCustomCosFreq
          );
          normalizedWave = (rawWave + 1) / 2;
        } else {
          const wave = waveFunctions[tileSpreadOscFunction];
          normalizedWave = (wave(time * tileSpreadOscSpeed) + 1) / 2;
        }
        currentTileSpread = tileSpreadOscMin + normalizedWave * (tileSpreadOscMax - tileSpreadOscMin);
      }

      // Check if transitioning
      const isTransitioning = resumeStartTimeRef.current !== null;

      // Freeze structural settings when paused to prevent teleporting
      if (isPausedRef.current && frozenStructuralSettingsRef.current === null) {
        frozenStructuralSettingsRef.current = {
          layers: currentLayers,
          delayMode: delayMode,
          delayFunction: delayFunction,
        };
      }

      // Use frozen layers during pause AND transition to keep same tile structure
      // Use frozen delay mode/function ONLY during pause (transition uses new settings as targets)
      const activeDelayMode = isPausedRef.current && frozenStructuralSettingsRef.current
        ? frozenStructuralSettingsRef.current.delayMode
        : delayMode;
      const activeDelayFunction = isPausedRef.current && frozenStructuralSettingsRef.current
        ? frozenStructuralSettingsRef.current.delayFunction
        : delayFunction;
      const activeLayers = (isPausedRef.current || isTransitioning) && frozenStructuralSettingsRef.current
        ? frozenStructuralSettingsRef.current.layers
        : currentLayers;

      // Clear frozen structural settings when transition completes
      if (!isPausedRef.current && resumeStartTimeRef.current === null) {
        frozenStructuralSettingsRef.current = null;
      }

      // Get current palette and scale
      const currentPalette = colorPalettes[colorPalette];
      const actualScale = scale * 4.0;
      const { tiles, size} = getTiling(activeLayers);

      // Find max generation for delay function normalization
      const maxGeneration = Math.max(...tiles.map(t => t.generation), 1);

      // Handle pause/resume states
      const isPaused = isPausedRef.current;
      let transitionProgress = 0;

      if (isTransitioning) {
        transitionProgress = Math.min(transitionTimeRef.current / TRANSITION_DURATION, 1.0);

        // Check if transition is complete
        if (transitionProgress >= 1.0) {
          resumeStartTimeRef.current = null;
          resumeTileStatesRef.current = null;
          resumeTargetStatesRef.current = null;
        }
      }

      // Capture frozen state when first paused
      if (isPaused && resumeTileStatesRef.current === null) {
        resumeTileStatesRef.current = new Map();
      }

      // Draw each tile with individual transformations for per-tile rotation
      for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
        const tile = tiles[tileIndex];
        // Calculate delay value based on selected mode (distance, angle, spiral, or radial)
        const delayValue = calculateDelayValue(tile, activeDelayMode, maxGeneration, currentAngleOffset, currentDelayModeParam);
        // Apply delay function to the calculated delay value
        const transformedGeneration = delayFunctions[activeDelayFunction](delayValue, maxGeneration, currentDelayFunctionPower);
        const generationOffset = transformedGeneration * currentTimeDelay;
        const tileTime = time - generationOffset;

        // Calculate global rotation for this tile
        let globalRotation = currentRotation;
        if (rotationOscEnabled) {
          let normalizedWave;
          if (rotationOscFunction === "custom") {
            const rawWave = computeCustomWave(
              tileTime * rotationOscSpeed,
              rotationOscCustomSinWeight,
              rotationOscCustomSinFreq,
              rotationOscCustomCosWeight,
              rotationOscCustomCosFreq
            );
            normalizedWave = (rawWave + 1) / 2;
          } else {
            const wave = waveFunctions[rotationOscFunction];
            normalizedWave = (wave(tileTime * rotationOscSpeed) + 1) / 2;
          }
          globalRotation = rotationOscMin + normalizedWave * (rotationOscMax - rotationOscMin);
        }

        // Calculate individual tile rotation (rotation on its own axis)
        let individualRotation = currentTileRotation;
        if (tileRotationOscEnabled) {
          let normalizedWave;
          if (tileRotationOscFunction === "custom") {
            const rawWave = computeCustomWave(
              tileTime * tileRotationOscSpeed,
              tileRotationOscCustomSinWeight,
              tileRotationOscCustomSinFreq,
              tileRotationOscCustomCosWeight,
              tileRotationOscCustomCosFreq
            );
            normalizedWave = (rawWave + 1) / 2;
          } else {
            const wave = waveFunctions[tileRotationOscFunction];
            normalizedWave = (wave(tileTime * tileRotationOscSpeed) + 1) / 2;
          }
          individualRotation = tileRotationOscMin + normalizedWave * (tileRotationOscMax - tileRotationOscMin);
        }

        // Calculate tile spread for this tile
        let tileLevelSpread = currentTileSpread;
        if (tileSpreadOscEnabled) {
          let normalizedWave;
          if (tileSpreadOscFunction === "custom") {
            const rawWave = computeCustomWave(
              tileTime * tileSpreadOscSpeed,
              tileSpreadOscCustomSinWeight,
              tileSpreadOscCustomSinFreq,
              tileSpreadOscCustomCosWeight,
              tileSpreadOscCustomCosFreq
            );
            normalizedWave = (rawWave + 1) / 2;
          } else {
            const wave = waveFunctions[tileSpreadOscFunction];
            normalizedWave = (wave(tileTime * tileSpreadOscSpeed) + 1) / 2;
          }
          tileLevelSpread = tileSpreadOscMin + normalizedWave * (tileSpreadOscMax - tileSpreadOscMin);
        }

        // Calculate hue for this tile
        let tileHue = currentHue;
        if (hueOscEnabled) {
          let normalizedWave;
          if (hueOscFunction === "custom") {
            const rawWave = computeCustomWave(
              tileTime * hueOscSpeed,
              hueOscCustomSinWeight,
              hueOscCustomSinFreq,
              hueOscCustomCosWeight,
              hueOscCustomCosFreq
            );
            normalizedWave = (rawWave + 1) / 2;
          } else {
            const wave = waveFunctions[hueOscFunction];
            normalizedWave = (wave(tileTime * hueOscSpeed) + 1) / 2;
          }

          // If palette has hue range, oscillate within that range
          if (currentPalette.hueRange) {
            const { min, max } = currentPalette.hueRange;
            if (min > max) {
              // Wrap-around case (e.g., reds: 340-20)
              const range = (360 - min) + max;
              tileHue = min + normalizedWave * range;
              if (tileHue >= 360) tileHue -= 360;
            } else {
              tileHue = min + normalizedWave * (max - min);
            }
          } else {
            tileHue = hueOscMin + normalizedWave * (hueOscMax - hueOscMin);
          }
        } else if (currentPalette.hueRange) {
          // Static hue constrained to palette range
          const { min, max } = currentPalette.hueRange;
          tileHue = min;
        }

        // Freeze visual state while paused, then interpolate on resume
        if (resumeTileStatesRef.current !== null) {
          // Save current calculated state when first pausing
          if (!resumeTileStatesRef.current.has(tileIndex)) {
            resumeTileStatesRef.current.set(tileIndex, {
              spread: tileLevelSpread,
              globalRotation: globalRotation,
              individualRotation: individualRotation,
              hue: tileHue,
              scale: actualScale,
            });
          }

          const savedState = resumeTileStatesRef.current.get(tileIndex)!;

          if (isPaused) {
            // While paused: use frozen values (ignore any setting changes)
            tileLevelSpread = savedState.spread;
            globalRotation = savedState.globalRotation;
            individualRotation = savedState.individualRotation;
            tileHue = savedState.hue;
          } else if (isTransitioning) {
            // Save target states on first frame of transition
            if (resumeTargetStatesRef.current === null) {
              resumeTargetStatesRef.current = new Map();
            }
            if (!resumeTargetStatesRef.current.has(tileIndex)) {
              resumeTargetStatesRef.current.set(tileIndex, {
                spread: tileLevelSpread,
                globalRotation: globalRotation,
                individualRotation: individualRotation,
                hue: tileHue,
                scale: actualScale,
              });
            }

            const targetState = resumeTargetStatesRef.current.get(tileIndex)!;
            const easedProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress); // smoothstep

            // Interpolate spread from frozen to fixed target
            tileLevelSpread = savedState.spread + (targetState.spread - savedState.spread) * easedProgress;

            // Interpolate rotations using shortest path (normalize angle difference)
            let globalRotDiff = targetState.globalRotation - savedState.globalRotation;
            while (globalRotDiff > Math.PI) globalRotDiff -= 2 * Math.PI;
            while (globalRotDiff < -Math.PI) globalRotDiff += 2 * Math.PI;
            globalRotation = savedState.globalRotation + globalRotDiff * easedProgress;

            let individualRotDiff = targetState.individualRotation - savedState.individualRotation;
            while (individualRotDiff > Math.PI) individualRotDiff -= 2 * Math.PI;
            while (individualRotDiff < -Math.PI) individualRotDiff += 2 * Math.PI;
            individualRotation = savedState.individualRotation + individualRotDiff * easedProgress;

            // Interpolate hue (wrapping around 360)
            let hueDiff = targetState.hue - savedState.hue;
            while (hueDiff > 180) hueDiff -= 360;
            while (hueDiff < -180) hueDiff += 360;
            tileHue = savedState.hue + hueDiff * easedProgress;
          }
        }

        // Apply palette colors
        const baseHue = tile.type === 0 ? currentPalette.kiteHue(tileHue) : currentPalette.dartHue(tileHue);
        const saturation = tile.type === 0 ? currentPalette.kiteSat : currentPalette.dartSat;
        const lightness = tile.type === 0 ? currentPalette.kiteLight : currentPalette.dartLight;

        const fillColor = hslToHex(baseHue, saturation, lightness);
        const strokeColor = hslToHex(baseHue, 60, 25);

        // Apply tile spread to position
        const spreadTileX = tile.x * tileLevelSpread;
        const spreadTileY = tile.y * tileLevelSpread;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(globalRotation);
        ctx.scale(actualScale, actualScale);

        // Move to tile position with spread applied
        ctx.translate(spreadTileX, spreadTileY);
        // Apply individual tile rotation
        ctx.rotate(individualRotation);
        // Move back to draw tile at origin
        ctx.translate(-tile.x, -tile.y);

        drawTile(ctx, tile, size, fillColor, strokeColor);

        ctx.restore();
      }

      // Draw transition timer in bottom right
      if (isTransitioning && !isPaused) {
        const remainingTime = TRANSITION_DURATION * (1 - transitionProgress);
        ctx.save();
        ctx.resetTransform(); // Reset any transformations
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.font = 'bold 24px monospace';
        ctx.lineWidth = 4;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const text = `Transition: ${remainingTime.toFixed(1)}s`;
        const x = window.innerWidth - 20;
        const y = window.innerHeight - 20;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      // Increment transition timer during transition
      if (isTransitioning) {
        transitionTimeRef.current += 0.016;
      }

      // Only increment time when not paused AND not transitioning
      if (!isPausedRef.current && !isTransitioning) {
        timeRef.current += 0.016;
      }
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
    layers, rotation, hue, scale, layerTimeDelay, delayFunction, delayMode, colorPalette,
    rotationOscEnabled, rotationOscFunction, rotationOscSpeed, rotationOscMin, rotationOscMax,
    rotationOscCustomSinWeight, rotationOscCustomSinFreq, rotationOscCustomCosWeight, rotationOscCustomCosFreq,
    hueOscEnabled, hueOscFunction, hueOscSpeed, hueOscMin, hueOscMax,
    hueOscCustomSinWeight, hueOscCustomSinFreq, hueOscCustomCosWeight, hueOscCustomCosFreq,
    layerOscEnabled, layerOscFunction, layerOscSpeed, layerOscMin, layerOscMax,
    layerOscCustomSinWeight, layerOscCustomSinFreq, layerOscCustomCosWeight, layerOscCustomCosFreq,
    timeDelayOscEnabled, timeDelayOscFunction, timeDelayOscSpeed, timeDelayOscMin, timeDelayOscMax,
    timeDelayOscCustomSinWeight, timeDelayOscCustomSinFreq, timeDelayOscCustomCosWeight, timeDelayOscCustomCosFreq,
    angleOffset, angleOffsetOscEnabled, angleOffsetOscFunction, angleOffsetOscSpeed, angleOffsetOscMin, angleOffsetOscMax,
    angleOffsetOscCustomSinWeight, angleOffsetOscCustomSinFreq, angleOffsetOscCustomCosWeight, angleOffsetOscCustomCosFreq,
    delayModeParam, delayModeParamOscEnabled, delayModeParamOscFunction, delayModeParamOscSpeed, delayModeParamOscMin, delayModeParamOscMax,
    delayModeParamOscCustomSinWeight, delayModeParamOscCustomSinFreq, delayModeParamOscCustomCosWeight, delayModeParamOscCustomCosFreq,
    delayFunctionPower, delayFunctionPowerOscEnabled, delayFunctionPowerOscFunction, delayFunctionPowerOscSpeed, delayFunctionPowerOscMin, delayFunctionPowerOscMax,
    delayFunctionPowerOscCustomSinWeight, delayFunctionPowerOscCustomSinFreq, delayFunctionPowerOscCustomCosWeight, delayFunctionPowerOscCustomCosFreq,
    tileRotation, tileRotationOscEnabled, tileRotationOscFunction, tileRotationOscSpeed, tileRotationOscMin, tileRotationOscMax,
    tileRotationOscCustomSinWeight, tileRotationOscCustomSinFreq, tileRotationOscCustomCosWeight, tileRotationOscCustomCosFreq,
    tileSpread, tileSpreadOscEnabled, tileSpreadOscFunction, tileSpreadOscSpeed, tileSpreadOscMin, tileSpreadOscMax,
    tileSpreadOscCustomSinWeight, tileSpreadOscCustomSinFreq, tileSpreadOscCustomCosWeight, tileSpreadOscCustomCosFreq
  ]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.7)",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "250px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #444" }}>
          <a href="/" style={{ fontSize: "12px", color: "#4488ff", textDecoration: "none" }}>← Gallery</a>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>
            Penrose Tiling
          </h2>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={toggleAllOscillators}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              background: masterOscEnabled ? "#4488ff" : "#333",
              border: "2px solid " + (masterOscEnabled ? "#6699ff" : "#555"),
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {masterOscEnabled ? "⏸ Pause All Oscillators" : "▶ Resume Oscillators"}
          </button>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "6px", textAlign: "center" }}>
            Temporarily disable/restore all oscillators
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Layers: {layers}
          </label>
          <input
            type="range"
            min="3"
            max="20"
            value={layers}
            onChange={(e) => setLayers(Number(e.target.value))}
            disabled={layerOscEnabled}
            style={{ width: "100%", cursor: layerOscEnabled ? "not-allowed" : "pointer", opacity: layerOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            More layers = more tiles outward
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Scale: {scale.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Rotation: {rotation.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.01"
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            disabled={rotationOscEnabled}
            style={{ width: "100%", cursor: rotationOscEnabled ? "not-allowed" : "pointer", opacity: rotationOscEnabled ? 0.5 : 1 }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Tile Rotation: {tileRotation.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.01"
            value={tileRotation}
            onChange={(e) => setTileRotation(Number(e.target.value))}
            disabled={tileRotationOscEnabled}
            style={{ width: "100%", cursor: tileRotationOscEnabled ? "not-allowed" : "pointer", opacity: tileRotationOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Rotates each shape on its own axis
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Tile Spread: {tileSpread.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            value={tileSpread}
            onChange={(e) => setTileSpread(Number(e.target.value))}
            disabled={tileSpreadOscEnabled}
            style={{ width: "100%", cursor: tileSpreadOscEnabled ? "not-allowed" : "pointer", opacity: tileSpreadOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Spreads tiles apart from center
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Color Palette
          </label>
          <select
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", cursor: "pointer" }}
          >
            {Object.entries(colorPalettes).map(([key, palette]) => (
              <option key={key} value={key}>{palette.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Hue: {hue.toFixed(0)}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            disabled={hueOscEnabled}
            style={{ width: "100%", cursor: hueOscEnabled ? "not-allowed" : "pointer", opacity: hueOscEnabled ? 0.5 : 1 }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Layer Time Delay: {layerTimeDelay.toFixed(2)}s
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="0.1"
            value={layerTimeDelay}
            onChange={(e) => setLayerTimeDelay(Number(e.target.value))}
            disabled={timeDelayOscEnabled}
            style={{ width: "100%", cursor: timeDelayOscEnabled ? "not-allowed" : "pointer", opacity: timeDelayOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Time offset between layer oscillations
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Delay Curve
          </label>
          <select
            value={delayFunction}
            onChange={(e) => setDelayFunction(e.target.value as DelayFunction)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", cursor: "pointer" }}
          >
            <option value="linear">Linear (uniform)</option>
            <option value="quadratic">Quadratic (accelerating)</option>
            <option value="sqrt">Square Root (decelerating)</option>
            <option value="exponential">Exponential (rapid growth)</option>
            <option value="inverse">Inverse (center delayed)</option>
          </select>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            How delay grows with distance
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Delay Curve Power: {delayFunctionPower.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={delayFunctionPower}
            onChange={(e) => setDelayFunctionPower(Number(e.target.value))}
            disabled={delayFunctionPowerOscEnabled}
            style={{ width: "100%", cursor: delayFunctionPowerOscEnabled ? "not-allowed" : "pointer", opacity: delayFunctionPowerOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Power applied to delay curve output
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Delay Mode
          </label>
          <select
            value={delayMode}
            onChange={(e) => setDelayMode(e.target.value as DelayMode)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", cursor: "pointer" }}
          >
            <option value="distance">Distance (radial rings)</option>
            <option value="angle">Angle (rotating sweep)</option>
            <option value="spiral">Spiral (distance + angle)</option>
            <option value="radial">Radial (sectored)</option>
          </select>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            How delay is calculated across pattern
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Angle Offset: {angleOffset.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.1"
            value={angleOffset}
            onChange={(e) => setAngleOffset(Number(e.target.value))}
            disabled={angleOffsetOscEnabled}
            style={{ width: "100%", cursor: angleOffsetOscEnabled ? "not-allowed" : "pointer", opacity: angleOffsetOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Rotates angular component for angle/spiral/radial modes
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" }}>
            Mode Parameter: {delayModeParam.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={delayModeParam}
            onChange={(e) => setDelayModeParam(Number(e.target.value))}
            disabled={delayModeParamOscEnabled}
            style={{ width: "100%", cursor: delayModeParamOscEnabled ? "not-allowed" : "pointer", opacity: delayModeParamOscEnabled ? 0.5 : 1 }}
          />
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Spiral: tightness | Radial: sector power
          </div>
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={layerOscEnabled}
              onChange={(e) => setLayerOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Layer Oscillation
          </label>
          {layerOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={layerOscFunction}
                  onChange={(e) => setLayerOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {layerOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {layerOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={layerOscCustomSinWeight} onChange={(e) => setLayerOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {layerOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={layerOscCustomSinFreq} onChange={(e) => setLayerOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {layerOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={layerOscCustomCosWeight} onChange={(e) => setLayerOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {layerOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={layerOscCustomCosFreq} onChange={(e) => setLayerOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {layerOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={layerOscSpeed} onChange={(e) => setLayerOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min Layers: {layerOscMin}</label>
                <input type="range" min="3" max="15" value={layerOscMin} onChange={(e) => setLayerOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max Layers: {layerOscMax}</label>
                <input type="range" min="5" max="20" value={layerOscMax} onChange={(e) => setLayerOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={timeDelayOscEnabled}
              onChange={(e) => setTimeDelayOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Time Delay Oscillation
          </label>
          {timeDelayOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={timeDelayOscFunction}
                  onChange={(e) => setTimeDelayOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {timeDelayOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {timeDelayOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={timeDelayOscCustomSinWeight} onChange={(e) => setTimeDelayOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {timeDelayOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={timeDelayOscCustomSinFreq} onChange={(e) => setTimeDelayOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {timeDelayOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={timeDelayOscCustomCosWeight} onChange={(e) => setTimeDelayOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {timeDelayOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={timeDelayOscCustomCosFreq} onChange={(e) => setTimeDelayOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {timeDelayOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={timeDelayOscSpeed} onChange={(e) => setTimeDelayOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {timeDelayOscMin.toFixed(2)}s</label>
                <input type="range" min="0" max="20" step="0.1" value={timeDelayOscMin} onChange={(e) => setTimeDelayOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {timeDelayOscMax.toFixed(2)}s</label>
                <input type="range" min="0" max="20" step="0.1" value={timeDelayOscMax} onChange={(e) => setTimeDelayOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={angleOffsetOscEnabled}
              onChange={(e) => setAngleOffsetOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Angle Offset Oscillation
          </label>
          {angleOffsetOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={angleOffsetOscFunction}
                  onChange={(e) => setAngleOffsetOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {angleOffsetOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {angleOffsetOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={angleOffsetOscCustomSinWeight} onChange={(e) => setAngleOffsetOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {angleOffsetOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={angleOffsetOscCustomSinFreq} onChange={(e) => setAngleOffsetOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {angleOffsetOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={angleOffsetOscCustomCosWeight} onChange={(e) => setAngleOffsetOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {angleOffsetOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={angleOffsetOscCustomCosFreq} onChange={(e) => setAngleOffsetOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {angleOffsetOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={angleOffsetOscSpeed} onChange={(e) => setAngleOffsetOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {angleOffsetOscMin.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={angleOffsetOscMin} onChange={(e) => setAngleOffsetOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {angleOffsetOscMax.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={angleOffsetOscMax} onChange={(e) => setAngleOffsetOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={delayModeParamOscEnabled}
              onChange={(e) => setDelayModeParamOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Mode Parameter Oscillation
          </label>
          {delayModeParamOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={delayModeParamOscFunction}
                  onChange={(e) => setDelayModeParamOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {delayModeParamOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {delayModeParamOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={delayModeParamOscCustomSinWeight} onChange={(e) => setDelayModeParamOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {delayModeParamOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={delayModeParamOscCustomSinFreq} onChange={(e) => setDelayModeParamOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {delayModeParamOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={delayModeParamOscCustomCosWeight} onChange={(e) => setDelayModeParamOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {delayModeParamOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={delayModeParamOscCustomCosFreq} onChange={(e) => setDelayModeParamOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {delayModeParamOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={delayModeParamOscSpeed} onChange={(e) => setDelayModeParamOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {delayModeParamOscMin.toFixed(2)}</label>
                <input type="range" min="0.1" max="2" step="0.1" value={delayModeParamOscMin} onChange={(e) => setDelayModeParamOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {delayModeParamOscMax.toFixed(2)}</label>
                <input type="range" min="0.1" max="2" step="0.1" value={delayModeParamOscMax} onChange={(e) => setDelayModeParamOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={delayFunctionPowerOscEnabled}
              onChange={(e) => setDelayFunctionPowerOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Delay Curve Power Oscillation
          </label>
          {delayFunctionPowerOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={delayFunctionPowerOscFunction}
                  onChange={(e) => setDelayFunctionPowerOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {delayFunctionPowerOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {delayFunctionPowerOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={delayFunctionPowerOscCustomSinWeight} onChange={(e) => setDelayFunctionPowerOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {delayFunctionPowerOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={delayFunctionPowerOscCustomSinFreq} onChange={(e) => setDelayFunctionPowerOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {delayFunctionPowerOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={delayFunctionPowerOscCustomCosWeight} onChange={(e) => setDelayFunctionPowerOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {delayFunctionPowerOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={delayFunctionPowerOscCustomCosFreq} onChange={(e) => setDelayFunctionPowerOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {delayFunctionPowerOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={delayFunctionPowerOscSpeed} onChange={(e) => setDelayFunctionPowerOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {delayFunctionPowerOscMin.toFixed(2)}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={delayFunctionPowerOscMin} onChange={(e) => setDelayFunctionPowerOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {delayFunctionPowerOscMax.toFixed(2)}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={delayFunctionPowerOscMax} onChange={(e) => setDelayFunctionPowerOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={tileRotationOscEnabled}
              onChange={(e) => setTileRotationOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Tile Rotation Oscillation
          </label>
          {tileRotationOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={tileRotationOscFunction}
                  onChange={(e) => setTileRotationOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {tileRotationOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {tileRotationOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={tileRotationOscCustomSinWeight} onChange={(e) => setTileRotationOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {tileRotationOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={tileRotationOscCustomSinFreq} onChange={(e) => setTileRotationOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {tileRotationOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={tileRotationOscCustomCosWeight} onChange={(e) => setTileRotationOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {tileRotationOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={tileRotationOscCustomCosFreq} onChange={(e) => setTileRotationOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {tileRotationOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={tileRotationOscSpeed} onChange={(e) => setTileRotationOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {tileRotationOscMin.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={tileRotationOscMin} onChange={(e) => setTileRotationOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {tileRotationOscMax.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={tileRotationOscMax} onChange={(e) => setTileRotationOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={tileSpreadOscEnabled}
              onChange={(e) => setTileSpreadOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Tile Spread Oscillation
          </label>
          {tileSpreadOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={tileSpreadOscFunction}
                  onChange={(e) => setTileSpreadOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {tileSpreadOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {tileSpreadOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={tileSpreadOscCustomSinWeight} onChange={(e) => setTileSpreadOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {tileSpreadOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={tileSpreadOscCustomSinFreq} onChange={(e) => setTileSpreadOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {tileSpreadOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={tileSpreadOscCustomCosWeight} onChange={(e) => setTileSpreadOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {tileSpreadOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={tileSpreadOscCustomCosFreq} onChange={(e) => setTileSpreadOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {tileSpreadOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={tileSpreadOscSpeed} onChange={(e) => setTileSpreadOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {tileSpreadOscMin.toFixed(2)}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={tileSpreadOscMin} onChange={(e) => setTileSpreadOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {tileSpreadOscMax.toFixed(2)}</label>
                <input type="range" min="0.5" max="2" step="0.1" value={tileSpreadOscMax} onChange={(e) => setTileSpreadOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={rotationOscEnabled}
              onChange={(e) => setRotationOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Rotation Oscillation
          </label>
          {rotationOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={rotationOscFunction}
                  onChange={(e) => setRotationOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {rotationOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {rotationOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={rotationOscCustomSinWeight} onChange={(e) => setRotationOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {rotationOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={rotationOscCustomSinFreq} onChange={(e) => setRotationOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {rotationOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={rotationOscCustomCosWeight} onChange={(e) => setRotationOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {rotationOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={rotationOscCustomCosFreq} onChange={(e) => setRotationOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {rotationOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={rotationOscSpeed} onChange={(e) => setRotationOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min: {rotationOscMin.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={rotationOscMin} onChange={(e) => setRotationOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max: {rotationOscMax.toFixed(2)}</label>
                <input type="range" min="0" max={Math.PI * 2} step="0.1" value={rotationOscMax} onChange={(e) => setRotationOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #444", paddingTop: "20px", marginTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={hueOscEnabled}
              onChange={(e) => setHueOscEnabled(e.target.checked)}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            Enable Hue Oscillation
          </label>
          {hueOscEnabled && (
            <div style={{ marginTop: "12px", paddingLeft: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Function</label>
                <select
                  value={hueOscFunction}
                  onChange={(e) => setHueOscFunction(e.target.value as WaveFunction)}
                  style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
                >
                  <option value="sin">Sine</option>
                  <option value="cos">Cosine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {hueOscFunction === "custom" && (
                <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid #444" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Weight: {hueOscCustomSinWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={hueOscCustomSinWeight} onChange={(e) => setHueOscCustomSinWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Sin Freq: {hueOscCustomSinFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={hueOscCustomSinFreq} onChange={(e) => setHueOscCustomSinFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Weight: {hueOscCustomCosWeight.toFixed(2)}</label>
                    <input type="range" min="-2" max="2" step="0.1" value={hueOscCustomCosWeight} onChange={(e) => setHueOscCustomCosWeight(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", color: "#999" }}>Cos Freq: {hueOscCustomCosFreq.toFixed(2)}</label>
                    <input type="range" min="0.1" max="4" step="0.1" value={hueOscCustomCosFreq} onChange={(e) => setHueOscCustomCosFreq(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Speed: {hueOscSpeed.toFixed(2)}</label>
                <input type="range" min="0.1" max="5" step="0.1" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Min Hue: {hueOscMin}°</label>
                <input type="range" min="0" max="360" value={hueOscMin} onChange={(e) => setHueOscMin(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#aaa" }}>Max Hue: {hueOscMax}°</label>
                <input type="range" min="0" max="360" value={hueOscMax} onChange={(e) => setHueOscMax(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
