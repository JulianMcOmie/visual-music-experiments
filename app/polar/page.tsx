"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type WaveFunction = "cos" | "sin" | "abs-sin" | "square" | "sawtooth" | "triangle";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  cos: (x) => Math.cos(x),
  sin: (x) => Math.sin(x),
  "abs-sin": (x) => Math.abs(Math.sin(x)),
  square: (x) => (Math.sin(x) >= 0 ? 1 : -1),
  sawtooth: (x) => 2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5)),
  triangle: (x) => 2 * Math.abs(2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5))) - 1,
};

type PolarFunction = "rose" | "spiral" | "cardioid" | "lemniscate" | "limacon" | "circle";
type ColorPalette = "analogous" | "complementary" | "triadic" | "warm" | "cool" | "sunset" | "ocean" | "forest" | "monochrome";

export default function PolarVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Polar function parameters
  const [functionType, setFunctionType] = useState<PolarFunction>("rose");
  const [scale, setScale] = useState(5);
  const [innerRadius, setInnerRadius] = useState(3);
  const [petals, setPetals] = useState(4);
  const [colorPalette, setColorPalette] = useState<ColorPalette>("analogous");
  const [baseHue, setBaseHue] = useState(200);
  const [rotation, setRotation] = useState(0);
  const [thickness, setThickness] = useState(0.05);
  const [segments, setSegments] = useState(100);
  const [numShapes, setNumShapes] = useState(1);
  const [numLayers, setNumLayers] = useState(2);
  const [zLayers, setZLayers] = useState(1);
  const [layerSpacing, setLayerSpacing] = useState(0.5);

  // Visual parameters
  const [hueShift, setHueShift] = useState(0);
  const [hueSpeed, setHueSpeed] = useState(50);
  const [timeDelay, setTimeDelay] = useState(0.1);

  // Oscillation
  const [scaleOscEnabled, setScaleOscEnabled] = useState(false);
  const [scaleOscFunction, setScaleOscFunction] = useState<WaveFunction>("sin");
  const [scaleOscSpeed, setScaleOscSpeed] = useState(0.8);
  const [scaleOscMin, setScaleOscMin] = useState(1);
  const [scaleOscMax, setScaleOscMax] = useState(10);


  const [petalsOscEnabled, setPetalsOscEnabled] = useState(false);
  const [petalsOscFunction, setPetalsOscFunction] = useState<WaveFunction>("triangle");
  const [petalsOscSpeed, setPetalsOscSpeed] = useState(0.5);
  const [petalsOscMin, setPetalsOscMin] = useState(2);
  const [petalsOscMax, setPetalsOscMax] = useState(8);

  const [rotationOscEnabled, setRotationOscEnabled] = useState(false);
  const [rotationOscFunction, setRotationOscFunction] = useState<WaveFunction>("triangle");
  const [rotationOscSpeed, setRotationOscSpeed] = useState(1.7);
  const [rotationOscMin, setRotationOscMin] = useState(0);
  const [rotationOscMax, setRotationOscMax] = useState(Math.PI * 2);


  const [shapesOscEnabled, setShapesOscEnabled] = useState(false);
  const [shapesOscFunction, setShapesOscFunction] = useState<WaveFunction>("sin");
  const [shapesOscSpeed, setShapesOscSpeed] = useState(0.6);
  const [shapesOscMin, setShapesOscMin] = useState(1);
  const [shapesOscMax, setShapesOscMax] = useState(16);

  const [layersOscEnabled, setLayersOscEnabled] = useState(false);
  const [layersOscFunction, setLayersOscFunction] = useState<WaveFunction>("sin");
  const [layersOscSpeed, setLayersOscSpeed] = useState(1);
  const [layersOscMin, setLayersOscMin] = useState(2);
  const [layersOscMax, setLayersOscMax] = useState(8);

  const [zLayersOscEnabled, setZLayersOscEnabled] = useState(false);
  const [zLayersOscFunction, setZLayersOscFunction] = useState<WaveFunction>("abs-sin");
  const [zLayersOscSpeed, setZLayersOscSpeed] = useState(1.5);
  const [zLayersOscMin, setZLayersOscMin] = useState(5);
  const [zLayersOscMax, setZLayersOscMax] = useState(50);

  const [spacingOscEnabled, setSpacingOscEnabled] = useState(false);
  const [spacingOscFunction, setSpacingOscFunction] = useState<WaveFunction>("triangle");
  const [spacingOscSpeed, setSpacingOscSpeed] = useState(1.1);
  const [spacingOscMin, setSpacingOscMin] = useState(0.1);
  const [spacingOscMax, setSpacingOscMax] = useState(2);

  const [timeDelayOscEnabled, setTimeDelayOscEnabled] = useState(false);
  const [timeDelayOscFunction, setTimeDelayOscFunction] = useState<WaveFunction>("cos");
  const [timeDelayOscSpeed, setTimeDelayOscSpeed] = useState(0.7);
  const [timeDelayOscMin, setTimeDelayOscMin] = useState(0.01);
  const [timeDelayOscMax, setTimeDelayOscMax] = useState(0.02);


  const [showControls, setShowControls] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const pausedRef = useRef(false);
  const resumeRef = useRef<(() => void) | null>(null);
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
      if (e.data === "play") { pausedRef.current = false; resumeRef.current?.(); }
      if (e.data === "pause") { pausedRef.current = true; }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

  // Refs for animation
  const scaleRef = useRef(scale);
  const innerRadiusRef = useRef(innerRadius);
  const petalsRef = useRef(petals);
  const rotationRef = useRef(rotation);
  const thicknessRef = useRef(thickness);
  const segmentsRef = useRef(segments);
  const numShapesRef = useRef(numShapes);
  const numLayersRef = useRef(numLayers);
  const hueShiftRef = useRef(hueShift);
  const hueSpeedRef = useRef(hueSpeed);
  const zLayersRef = useRef(zLayers);
  const layerSpacingRef = useRef(layerSpacing);
  const timeDelayRef = useRef(timeDelay);
  const baseHueRef = useRef(baseHue);

  const scaleOscEnabledRef = useRef(scaleOscEnabled);
  const scaleOscFunctionRef = useRef(scaleOscFunction);
  const scaleOscSpeedRef = useRef(scaleOscSpeed);
  const scaleOscMinRef = useRef(scaleOscMin);
  const scaleOscMaxRef = useRef(scaleOscMax);


  const petalsOscEnabledRef = useRef(petalsOscEnabled);
  const petalsOscFunctionRef = useRef(petalsOscFunction);
  const petalsOscSpeedRef = useRef(petalsOscSpeed);
  const petalsOscMinRef = useRef(petalsOscMin);
  const petalsOscMaxRef = useRef(petalsOscMax);

  const rotationOscEnabledRef = useRef(rotationOscEnabled);
  const rotationOscFunctionRef = useRef(rotationOscFunction);
  const rotationOscSpeedRef = useRef(rotationOscSpeed);
  const rotationOscMinRef = useRef(rotationOscMin);
  const rotationOscMaxRef = useRef(rotationOscMax);


  const shapesOscEnabledRef = useRef(shapesOscEnabled);
  const shapesOscFunctionRef = useRef(shapesOscFunction);
  const shapesOscSpeedRef = useRef(shapesOscSpeed);
  const shapesOscMinRef = useRef(shapesOscMin);
  const shapesOscMaxRef = useRef(shapesOscMax);

  const layersOscEnabledRef = useRef(layersOscEnabled);
  const layersOscFunctionRef = useRef(layersOscFunction);
  const layersOscSpeedRef = useRef(layersOscSpeed);
  const layersOscMinRef = useRef(layersOscMin);
  const layersOscMaxRef = useRef(layersOscMax);

  const zLayersOscEnabledRef = useRef(zLayersOscEnabled);
  const zLayersOscFunctionRef = useRef(zLayersOscFunction);
  const zLayersOscSpeedRef = useRef(zLayersOscSpeed);
  const zLayersOscMinRef = useRef(zLayersOscMin);
  const zLayersOscMaxRef = useRef(zLayersOscMax);

  const spacingOscEnabledRef = useRef(spacingOscEnabled);
  const spacingOscFunctionRef = useRef(spacingOscFunction);
  const spacingOscSpeedRef = useRef(spacingOscSpeed);
  const spacingOscMinRef = useRef(spacingOscMin);
  const spacingOscMaxRef = useRef(spacingOscMax);

  const timeDelayOscEnabledRef = useRef(timeDelayOscEnabled);
  const timeDelayOscFunctionRef = useRef(timeDelayOscFunction);
  const timeDelayOscSpeedRef = useRef(timeDelayOscSpeed);
  const timeDelayOscMinRef = useRef(timeDelayOscMin);
  const timeDelayOscMaxRef = useRef(timeDelayOscMax);

  const colorPaletteRef = useRef(colorPalette);

  // Update refs
  useEffect(() => { if (!scaleOscEnabled) scaleRef.current = scale; }, [scale, scaleOscEnabled]);
  useEffect(() => { innerRadiusRef.current = innerRadius; }, [innerRadius]);
  useEffect(() => { if (!petalsOscEnabled) petalsRef.current = petals; }, [petals, petalsOscEnabled]);
  useEffect(() => { if (!rotationOscEnabled) rotationRef.current = rotation; }, [rotation, rotationOscEnabled]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { if (!shapesOscEnabled) numShapesRef.current = numShapes; }, [numShapes, shapesOscEnabled]);
  useEffect(() => { if (!layersOscEnabled) numLayersRef.current = numLayers; }, [numLayers, layersOscEnabled]);
  useEffect(() => { hueShiftRef.current = hueShift; }, [hueShift]);
  useEffect(() => { hueSpeedRef.current = hueSpeed; }, [hueSpeed]);
  useEffect(() => { if (!zLayersOscEnabled) zLayersRef.current = zLayers; }, [zLayers, zLayersOscEnabled]);
  useEffect(() => { if (!spacingOscEnabled) layerSpacingRef.current = layerSpacing; }, [layerSpacing, spacingOscEnabled]);
  useEffect(() => { if (!timeDelayOscEnabled) timeDelayRef.current = timeDelay; }, [timeDelay, timeDelayOscEnabled]);
  useEffect(() => { baseHueRef.current = baseHue; }, [baseHue]);

  useEffect(() => { scaleOscEnabledRef.current = scaleOscEnabled; }, [scaleOscEnabled]);
  useEffect(() => { scaleOscFunctionRef.current = scaleOscFunction; }, [scaleOscFunction]);
  useEffect(() => { scaleOscSpeedRef.current = scaleOscSpeed; }, [scaleOscSpeed]);
  useEffect(() => { scaleOscMinRef.current = scaleOscMin; }, [scaleOscMin]);
  useEffect(() => { scaleOscMaxRef.current = scaleOscMax; }, [scaleOscMax]);


  useEffect(() => { petalsOscEnabledRef.current = petalsOscEnabled; }, [petalsOscEnabled]);
  useEffect(() => { petalsOscFunctionRef.current = petalsOscFunction; }, [petalsOscFunction]);
  useEffect(() => { petalsOscSpeedRef.current = petalsOscSpeed; }, [petalsOscSpeed]);
  useEffect(() => { petalsOscMinRef.current = petalsOscMin; }, [petalsOscMin]);
  useEffect(() => { petalsOscMaxRef.current = petalsOscMax; }, [petalsOscMax]);

  useEffect(() => { rotationOscEnabledRef.current = rotationOscEnabled; }, [rotationOscEnabled]);
  useEffect(() => { rotationOscFunctionRef.current = rotationOscFunction; }, [rotationOscFunction]);
  useEffect(() => { rotationOscSpeedRef.current = rotationOscSpeed; }, [rotationOscSpeed]);
  useEffect(() => { rotationOscMinRef.current = rotationOscMin; }, [rotationOscMin]);
  useEffect(() => { rotationOscMaxRef.current = rotationOscMax; }, [rotationOscMax]);


  useEffect(() => { shapesOscEnabledRef.current = shapesOscEnabled; }, [shapesOscEnabled]);
  useEffect(() => { shapesOscFunctionRef.current = shapesOscFunction; }, [shapesOscFunction]);
  useEffect(() => { shapesOscSpeedRef.current = shapesOscSpeed; }, [shapesOscSpeed]);
  useEffect(() => { shapesOscMinRef.current = shapesOscMin; }, [shapesOscMin]);
  useEffect(() => { shapesOscMaxRef.current = shapesOscMax; }, [shapesOscMax]);

  useEffect(() => { layersOscEnabledRef.current = layersOscEnabled; }, [layersOscEnabled]);
  useEffect(() => { layersOscFunctionRef.current = layersOscFunction; }, [layersOscFunction]);
  useEffect(() => { layersOscSpeedRef.current = layersOscSpeed; }, [layersOscSpeed]);
  useEffect(() => { layersOscMinRef.current = layersOscMin; }, [layersOscMin]);
  useEffect(() => { layersOscMaxRef.current = layersOscMax; }, [layersOscMax]);

  useEffect(() => { zLayersOscEnabledRef.current = zLayersOscEnabled; }, [zLayersOscEnabled]);
  useEffect(() => { zLayersOscFunctionRef.current = zLayersOscFunction; }, [zLayersOscFunction]);
  useEffect(() => { zLayersOscSpeedRef.current = zLayersOscSpeed; }, [zLayersOscSpeed]);
  useEffect(() => { zLayersOscMinRef.current = zLayersOscMin; }, [zLayersOscMin]);
  useEffect(() => { zLayersOscMaxRef.current = zLayersOscMax; }, [zLayersOscMax]);

  useEffect(() => { spacingOscEnabledRef.current = spacingOscEnabled; }, [spacingOscEnabled]);
  useEffect(() => { spacingOscFunctionRef.current = spacingOscFunction; }, [spacingOscFunction]);
  useEffect(() => { spacingOscSpeedRef.current = spacingOscSpeed; }, [spacingOscSpeed]);
  useEffect(() => { spacingOscMinRef.current = spacingOscMin; }, [spacingOscMin]);
  useEffect(() => { spacingOscMaxRef.current = spacingOscMax; }, [spacingOscMax]);

  useEffect(() => { timeDelayOscEnabledRef.current = timeDelayOscEnabled; }, [timeDelayOscEnabled]);
  useEffect(() => { timeDelayOscFunctionRef.current = timeDelayOscFunction; }, [timeDelayOscFunction]);
  useEffect(() => { timeDelayOscSpeedRef.current = timeDelayOscSpeed; }, [timeDelayOscSpeed]);
  useEffect(() => { timeDelayOscMinRef.current = timeDelayOscMin; }, [timeDelayOscMin]);
  useEffect(() => { timeDelayOscMaxRef.current = timeDelayOscMax; }, [timeDelayOscMax]);

  useEffect(() => { colorPaletteRef.current = colorPalette; }, [colorPalette]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Camera will be updated in the animate loop based on layer count

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Color palette function - based on color theory
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

    // Polar function calculator
    const getPolarRadius = (theta: number, type: PolarFunction, a: number, b: number, n: number): number => {
      switch (type) {
        case "rose":
          return a * (1 + 0.8 * Math.cos(n * theta));
        case "spiral":
          return a * theta / (2 * Math.PI);
        case "cardioid":
          return a * (1 + Math.cos(theta));
        case "lemniscate":
          const val = Math.cos(2 * theta);
          return val >= 0 ? a * Math.sqrt(val) : 0;
        case "limacon":
          return a + b * Math.cos(theta);
        case "circle":
        default:
          return a;
      }
    };

    // Create curves for each layer
    let curves: THREE.Mesh[] = [];

    const updateCurves = (currentTime: number) => {
      // Remove old curves
      curves.forEach(curve => {
        scene.remove(curve);
        curve.geometry.dispose();
        (curve.material as THREE.Material).dispose();
      });
      curves = [];

      // Apply oscillations for current parameters
      let currentZLayers = zLayersRef.current;
      let currentNumShapes = numShapesRef.current;
      let currentNumLayers = numLayersRef.current;
      let currentSpacing = layerSpacingRef.current;
      let currentTimeDelay = timeDelayRef.current;

      // Calculate oscillation value for shapes (used for opacity fading)
      let shapesOscillationValue = 0;
      if (shapesOscEnabledRef.current) {
        const wave = waveFunctions[shapesOscFunctionRef.current];
        const normalizedWave = (wave(currentTime * shapesOscSpeedRef.current) + 1) / 2;
        shapesOscillationValue = shapesOscMinRef.current + normalizedWave * (shapesOscMaxRef.current - shapesOscMinRef.current);
        currentNumShapes = shapesOscMaxRef.current; // Always draw max shapes for smooth transitions
      }

      // Calculate oscillation value for concentric layers (used for opacity fading)
      let layersOscillationValue = 0;
      if (layersOscEnabledRef.current) {
        const wave = waveFunctions[layersOscFunctionRef.current];
        const normalizedWave = (wave(currentTime * layersOscSpeedRef.current) + 1) / 2;
        layersOscillationValue = layersOscMinRef.current + normalizedWave * (layersOscMaxRef.current - layersOscMinRef.current);
        currentNumLayers = layersOscMaxRef.current; // Always draw max layers for smooth transitions
      }

      if (zLayersOscEnabledRef.current) {
        const wave = waveFunctions[zLayersOscFunctionRef.current];
        const normalizedWave = (wave(currentTime * zLayersOscSpeedRef.current) + 1) / 2;
        currentZLayers = Math.round(zLayersOscMinRef.current + normalizedWave * (zLayersOscMaxRef.current - zLayersOscMinRef.current));
      }

      if (spacingOscEnabledRef.current) {
        const wave = waveFunctions[spacingOscFunctionRef.current];
        const normalizedWave = (wave(currentTime * spacingOscSpeedRef.current) + 1) / 2;
        currentSpacing = spacingOscMinRef.current + normalizedWave * (spacingOscMaxRef.current - spacingOscMinRef.current);
      }

      if (timeDelayOscEnabledRef.current) {
        const wave = waveFunctions[timeDelayOscFunctionRef.current];
        const normalizedWave = (wave(currentTime * timeDelayOscSpeedRef.current) + 1) / 2;
        currentTimeDelay = timeDelayOscMinRef.current + normalizedWave * (timeDelayOscMaxRef.current - timeDelayOscMinRef.current);
      }

      // Interpolate camera position based on Z layer count
      // 1 layer = front view, max layers (50) = angled view
      const maxZLayers = 50;
      const linearInterpolation = Math.min((currentZLayers - 1) / (maxZLayers - 1), 1);

      // Apply smooth ease-in-out cubic interpolation
      const layerInterpolation = linearInterpolation < 0.5
        ? 4 * linearInterpolation * linearInterpolation * linearInterpolation
        : 1 - Math.pow(-2 * linearInterpolation + 2, 3) / 2;

      // Front view position and target
      const frontPos = new THREE.Vector3(0, 0, 25);
      const frontLookAt = new THREE.Vector3(0, 0, -10);

      // Angled view position and target
      const angledPos = new THREE.Vector3(15, 10, 15);
      const angledLookAt = new THREE.Vector3(0, 0, -5);

      // Interpolate camera position and lookAt target
      camera.position.lerpVectors(frontPos, angledPos, layerInterpolation);
      const lookAtTarget = new THREE.Vector3().lerpVectors(frontLookAt, angledLookAt, layerInterpolation);
      camera.lookAt(lookAtTarget);

      // Create curves for each 3D Z-layer
      for (let zLayer = 0; zLayer < currentZLayers; zLayer++) {
        const timeOffset = currentTime - (zLayer * currentTimeDelay);

        // Calculate parameters for this time step
        let zLayerScale = scaleRef.current;
        let zLayerInnerRadius = innerRadiusRef.current;
        let zLayerPetals = petalsRef.current;
        let zLayerRotation = rotationRef.current;
        let zLayerThickness = thicknessRef.current;

        if (scaleOscEnabledRef.current) {
          const wave = waveFunctions[scaleOscFunctionRef.current];
          const normalizedWave = (wave(timeOffset * scaleOscSpeedRef.current) + 1) / 2;
          zLayerScale = scaleOscMinRef.current + normalizedWave * (scaleOscMaxRef.current - scaleOscMinRef.current);
        }

        if (petalsOscEnabledRef.current) {
          const wave = waveFunctions[petalsOscFunctionRef.current];
          const normalizedWave = (wave(timeOffset * petalsOscSpeedRef.current) + 1) / 2;
          zLayerPetals = petalsOscMinRef.current + normalizedWave * (petalsOscMaxRef.current - petalsOscMinRef.current);
        }

        if (rotationOscEnabledRef.current) {
          const wave = waveFunctions[rotationOscFunctionRef.current];
          const normalizedWave = (wave(timeOffset * rotationOscSpeedRef.current) + 1) / 2;
          zLayerRotation = rotationOscMinRef.current + normalizedWave * (rotationOscMaxRef.current - rotationOscMinRef.current);
        }

        // Draw multiple shapes (rotated copies)
        for (let shapeIndex = 0; shapeIndex < currentNumShapes; shapeIndex++) {
          // Calculate opacity for smooth fade in/out during shape count oscillation
          let shapeOpacity = 1.0;
          if (shapesOscEnabledRef.current) {
            const shapeThreshold = shapeIndex + 1;
            if (shapesOscillationValue < shapeThreshold) {
              const fadeValue = Math.max(0, shapesOscillationValue - shapeIndex);
              shapeOpacity = Math.pow(fadeValue, 0.3); // Power < 1 makes fade quicker
            }
          }

          // Skip shapes that are fully transparent
          if (shapeOpacity <= 0.01) continue;

          // Divide rotation by the curve's symmetry order so shapes fill one
          // symmetry sector and tile naturally. Avoids LCM-based petal jumps.
          // Rose: n-fold (petals), lemniscate: 2-fold, others: 1-fold.
          const symmetryOrder = functionType === 'rose' ? Math.max(1, Math.round(zLayerPetals)) :
                                functionType === 'lemniscate' ? 2 : 1;
          const shapeAngle = (shapeIndex / (currentNumShapes * symmetryOrder)) * Math.PI * 2;

          // Draw multiple concentric layers for this shape
          const maxLayers = Math.ceil(currentNumLayers);
          for (let layerIndex = 0; layerIndex < maxLayers; layerIndex++) {
            // Calculate layer opacity for smooth transitions
            let layerOpacity = shapeOpacity;
            if (layersOscEnabledRef.current) {
              const layerThreshold = layerIndex + 1;
              if (layersOscillationValue < layerThreshold) {
                const fadeValue = Math.max(0, layersOscillationValue - layerIndex);
                layerOpacity *= Math.pow(fadeValue, 0.3);
              }
            }

            if (layerOpacity <= 0.01) continue;

            // Calculate this layer's radius (spread evenly from base to max)
            const layerProgress = maxLayers > 1 ? layerIndex / (maxLayers - 1) : 0;
            const layerBaseScale = zLayerScale * (0.5 + layerProgress * 1.5);

            // Generate points for this curve
            const points: THREE.Vector3[] = [];
            const numSegments = segmentsRef.current;

            for (let i = 0; i <= numSegments; i++) {
              const theta = (i / numSegments) * Math.PI * 2;
              const r = getPolarRadius(theta, functionType, layerBaseScale, zLayerInnerRadius, zLayerPetals);

              const x = r * Math.cos(theta + zLayerRotation + shapeAngle);
              const y = r * Math.sin(theta + zLayerRotation + shapeAngle);
              const z = -zLayer * currentSpacing; // Stack along Z axis
              points.push(new THREE.Vector3(x, y, z));
            }

            const curvePath = new THREE.CatmullRomCurve3(points, true);
            const tubeGeometry = new THREE.TubeGeometry(curvePath, numSegments * 2, zLayerThickness, 16, true);

            // Get color from palette
            const paletteFunc = colorPalettes[colorPaletteRef.current];
            const combinedIndex = zLayer * currentNumShapes * maxLayers + shapeIndex * maxLayers + layerIndex;
            const totalCurves = currentZLayers * currentNumShapes * maxLayers;
            let hue = paletteFunc(baseHueRef.current, combinedIndex, totalCurves);

            // Apply hue shift and speed
            hue += (timeOffset * hueSpeedRef.current + hueShiftRef.current);
            hue = hue % 360; // Wrap around

            // Vary saturation and lightness by layer for more distinction
            const saturation = 0.7 + (layerIndex % 3) * 0.1; // Alternate between 0.7, 0.8, 0.9
            const lightness = 0.5 + (Math.sin(layerIndex * 0.5) * 0.15); // Oscillate lightness
            const color = new THREE.Color().setHSL(hue / 360, saturation, lightness);

            const material = new THREE.MeshStandardMaterial({
              color: color,
              metalness: 0.3,
              roughness: 0.4,
              vertexColors: false,
              transparent: layerOpacity < 1.0,
              opacity: layerOpacity,
            });

            const curve = new THREE.Mesh(tubeGeometry, material);
            curves.push(curve);
            scene.add(curve);
          }
        }
      }
    };

    // Animation
    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.016;

      // Note: layers, spacing, and timeDelay oscillations are calculated in updateCurves()
      // since they apply globally to all curves in a frame
      // Other oscillations (a, b, n, rotation, thickness) are also calculated in updateCurves()
      // per-layer based on each layer's time offset

      // Update all curves with their respective time offsets
      updateCurves(time);

      renderer.render(scene, camera);
      if (!pausedRef.current) animationId = requestAnimationFrame(animate);
    };

    resumeRef.current = animate;
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      containerRef.current?.removeChild(renderer.domElement);
      curves.forEach(curve => {
        curve.geometry.dispose();
        (curve.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [functionType]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Controls */}
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
          display: showControls ? "block" : "none",
        }}
      >
        <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #444" }}>
          <a href="/" style={{ fontSize: "12px", color: "#aa66ff", textDecoration: "none" }}>← Gallery</a>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>
            3D Polar Functions
          </h2>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Function Type
          </label>
          <select
            value={functionType}
            onChange={(e) => setFunctionType(e.target.value as PolarFunction)}
            style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
          >
            <option value="rose">Rose (r = a·cos(nθ))</option>
            <option value="spiral">Spiral (r = aθ)</option>
            <option value="cardioid">Cardioid (r = a(1+cos(θ)))</option>
            <option value="lemniscate">Lemniscate (r² = a²cos(2θ))</option>
            <option value="limacon">Limaçon (r = a + b·cos(θ))</option>
            <option value="circle">Circle (r = a)</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Scale: {scale.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.5"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Inner Radius: {innerRadius.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.5"
            value={innerRadius}
            onChange={(e) => setInnerRadius(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Petals/Frequency: {petals}
          </label>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={petals}
            onChange={(e) => setPetals(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Rotation: {rotation.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.1"
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Thickness: {thickness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Segments: {segments}
          </label>
          <input
            type="range"
            min="50"
            max="800"
            step="50"
            value={segments}
            onChange={(e) => setSegments(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Number of Shapes: {numShapes}
          </label>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={numShapes}
            onChange={(e) => setNumShapes(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Concentric Layers: {numLayers}
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={numLayers}
            onChange={(e) => setNumLayers(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            3D Layers: {zLayers}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={zLayers}
            onChange={(e) => setZLayers(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Layer Spacing: {layerSpacing.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={layerSpacing}
            onChange={(e) => setLayerSpacing(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Color Palette
          </label>
          <select
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
            style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444" }}
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

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
            Time Delay: {timeDelay.toFixed(3)}s
          </label>
          <input
            type="range"
            min="0.01"
            max="0.5"
            step="0.01"
            value={timeDelay}
            onChange={(e) => setTimeDelay(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <h3 style={{ margin: "20px 0 10px 0", fontSize: "16px", color: "#fff", borderTop: "1px solid #444", paddingTop: "15px" }}>
          Oscillations
        </h3>

        {/* Scale Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Scale Oscillation {scaleOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={scaleOscEnabled} onChange={(e) => setScaleOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={scaleOscFunction} onChange={(e) => setScaleOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {scaleOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={scaleOscSpeed} onChange={(e) => setScaleOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {scaleOscMin.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.5" value={scaleOscMin} onChange={(e) => setScaleOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {scaleOscMax.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.5" value={scaleOscMax} onChange={(e) => setScaleOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Petals Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Petals/Frequency Oscillation {petalsOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={petalsOscEnabled} onChange={(e) => setPetalsOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={petalsOscFunction} onChange={(e) => setPetalsOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {petalsOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={petalsOscSpeed} onChange={(e) => setPetalsOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {petalsOscMin}</label>
            <input type="range" min="1" max="15" step="1" value={petalsOscMin} onChange={(e) => setPetalsOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {petalsOscMax}</label>
            <input type="range" min="1" max="15" step="1" value={petalsOscMax} onChange={(e) => setPetalsOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Rotation Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Rotation Oscillation {rotationOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={rotationOscEnabled} onChange={(e) => setRotationOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={rotationOscFunction} onChange={(e) => setRotationOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {rotationOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={rotationOscSpeed} onChange={(e) => setRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {rotationOscMin.toFixed(2)}</label>
            <input type="range" min="0" max={Math.PI * 2} step="0.1" value={rotationOscMin} onChange={(e) => setRotationOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {rotationOscMax.toFixed(2)}</label>
            <input type="range" min="0" max={Math.PI * 2} step="0.1" value={rotationOscMax} onChange={(e) => setRotationOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Shape Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Shape Oscillation {shapesOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={shapesOscEnabled} onChange={(e) => setShapesOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={shapesOscFunction} onChange={(e) => setShapesOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {shapesOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={shapesOscSpeed} onChange={(e) => setShapesOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {shapesOscMin}</label>
            <input type="range" min="1" max="16" step="1" value={shapesOscMin} onChange={(e) => setShapesOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {shapesOscMax}</label>
            <input type="range" min="1" max="16" step="1" value={shapesOscMax} onChange={(e) => setShapesOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Concentric Layers Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Concentric Layers Oscillation {layersOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={layersOscEnabled} onChange={(e) => setLayersOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={layersOscFunction} onChange={(e) => setLayersOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {layersOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={layersOscSpeed} onChange={(e) => setLayersOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {layersOscMin}</label>
            <input type="range" min="1" max="8" step="1" value={layersOscMin} onChange={(e) => setLayersOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {layersOscMax}</label>
            <input type="range" min="1" max="8" step="1" value={layersOscMax} onChange={(e) => setLayersOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* 3D Layers Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            3D Layers Oscillation {zLayersOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={zLayersOscEnabled} onChange={(e) => setZLayersOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={zLayersOscFunction} onChange={(e) => setZLayersOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {zLayersOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={zLayersOscSpeed} onChange={(e) => setZLayersOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {zLayersOscMin}</label>
            <input type="range" min="1" max="50" step="1" value={zLayersOscMin} onChange={(e) => setZLayersOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {zLayersOscMax}</label>
            <input type="range" min="1" max="50" step="1" value={zLayersOscMax} onChange={(e) => setZLayersOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Spacing Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Spacing Oscillation {spacingOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={spacingOscEnabled} onChange={(e) => setSpacingOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={spacingOscFunction} onChange={(e) => setSpacingOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {spacingOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={spacingOscSpeed} onChange={(e) => setSpacingOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {spacingOscMin.toFixed(2)}</label>
            <input type="range" min="0.1" max="3" step="0.1" value={spacingOscMin} onChange={(e) => setSpacingOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {spacingOscMax.toFixed(2)}</label>
            <input type="range" min="0.1" max="3" step="0.1" value={spacingOscMax} onChange={(e) => setSpacingOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Time Delay Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Time Delay Oscillation {timeDelayOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={timeDelayOscEnabled} onChange={(e) => setTimeDelayOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={timeDelayOscFunction} onChange={(e) => setTimeDelayOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {timeDelayOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={timeDelayOscSpeed} onChange={(e) => setTimeDelayOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {timeDelayOscMin.toFixed(3)}</label>
            <input type="range" min="0.01" max="1" step="0.01" value={timeDelayOscMin} onChange={(e) => setTimeDelayOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {timeDelayOscMax.toFixed(3)}</label>
            <input type="range" min="0.01" max="1" step="0.01" value={timeDelayOscMax} onChange={(e) => setTimeDelayOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>
      </div>

      {/* Toggle button */}
      {!isPreview && (
      <button
        onClick={() => setShowControls(!showControls)}
        style={{
          position: "absolute",
          top: showControls ? "calc(90vh + 10px)" : "20px",
          left: "20px",
          background: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "10px 15px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        {showControls ? "Hide Controls" : "Show Controls"}
      </button>
      )}
    </div>
  );
}
