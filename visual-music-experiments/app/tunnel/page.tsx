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

export default function Tunnel3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(2);
  const [cameraRotation, setCameraRotation] = useState(0);
  const [numRings, setNumRings] = useState(50);
  const [colorPattern, setColorPattern] = useState<string>("none");

  // Generation constants - determine how new rings are created
  const [generationHue, setGenerationHue] = useState(180);
  const [generationRadius, setGenerationRadius] = useState(5);
  const [generationSpacing, setGenerationSpacing] = useState(2);
  const [generationSegments, setGenerationSegments] = useState(3);
  const [tubeThickness, setTubeThickness] = useState(0.2);
  const [shapeRotation, setShapeRotation] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(0);

  // Oscillators for generation constants
  const [hueOscEnabled, setHueOscEnabled] = useState(false);
  const [hueOscFunction, setHueOscFunction] = useState<WaveFunction>("sin");
  const [hueOscSpeed, setHueOscSpeed] = useState(1);
  const [hueOscMin, setHueOscMin] = useState(0);
  const [hueOscMax, setHueOscMax] = useState(360);

  const [radiusOscEnabled, setRadiusOscEnabled] = useState(false);
  const [radiusOscFunction, setRadiusOscFunction] = useState<WaveFunction>("sin");
  const [radiusOscSpeed, setRadiusOscSpeed] = useState(1);
  const [radiusOscMin, setRadiusOscMin] = useState(2);
  const [radiusOscMax, setRadiusOscMax] = useState(1000);

  const [spacingOscEnabled, setSpacingOscEnabled] = useState(false);
  const [spacingOscFunction, setSpacingOscFunction] = useState<WaveFunction>("sin");
  const [spacingOscSpeed, setSpacingOscSpeed] = useState(1);
  const [spacingOscMin, setSpacingOscMin] = useState(0.5);
  const [spacingOscMax, setSpacingOscMax] = useState(5);

  const [segmentsOscEnabled, setSegmentsOscEnabled] = useState(false);
  const [segmentsOscFunction, setSegmentsOscFunction] = useState<WaveFunction>("sin");
  const [segmentsOscSpeed, setSegmentsOscSpeed] = useState(1);
  const [segmentsOscMin, setSegmentsOscMin] = useState(3);
  const [segmentsOscMax, setSegmentsOscMax] = useState(64);

  const [cameraRotationOscEnabled, setCameraRotationOscEnabled] = useState(false);
  const [cameraRotationOscFunction, setCameraRotationOscFunction] = useState<WaveFunction>("sin");
  const [cameraRotationOscSpeed, setCameraRotationOscSpeed] = useState(1);
  const [cameraRotationOscMin, setCameraRotationOscMin] = useState(0);
  const [cameraRotationOscMax, setCameraRotationOscMax] = useState(Math.PI * 2);

  const [rotationSpeedOscEnabled, setRotationSpeedOscEnabled] = useState(false);
  const [rotationSpeedOscFunction, setRotationSpeedOscFunction] = useState<WaveFunction>("sin");
  const [rotationSpeedOscSpeed, setRotationSpeedOscSpeed] = useState(1);
  const [rotationSpeedOscMin, setRotationSpeedOscMin] = useState(-10);
  const [rotationSpeedOscMax, setRotationSpeedOscMax] = useState(10);

  const [shapeRotationOscEnabled, setShapeRotationOscEnabled] = useState(false);
  const [shapeRotationOscFunction, setShapeRotationOscFunction] = useState<WaveFunction>("sin");
  const [shapeRotationOscSpeed, setShapeRotationOscSpeed] = useState(1);
  const [shapeRotationOscMin, setShapeRotationOscMin] = useState(0);
  const [shapeRotationOscMax, setShapeRotationOscMax] = useState(Math.PI * 2);

  const [tubeThicknessOscEnabled, setTubeThicknessOscEnabled] = useState(false);
  const [tubeThicknessOscFunction, setTubeThicknessOscFunction] = useState<WaveFunction>("sin");
  const [tubeThicknessOscSpeed, setTubeThicknessOscSpeed] = useState(1);
  const [tubeThicknessOscMin, setTubeThicknessOscMin] = useState(0.05);
  const [tubeThicknessOscMax, setTubeThicknessOscMax] = useState(1);

  // Burst parameters
  const [burstEnabled, setBurstEnabled] = useState(false);
  const [burstInterval, setBurstInterval] = useState(2); // seconds between bursts
  const [burstMagnitude, setBurstMagnitude] = useState(1.5); // scale multiplier
  const [burstDecay, setBurstDecay] = useState(20); // decay rate (higher = faster decay)

  const [showControls, setShowControls] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const pausedRef = useRef(false);

  // Debug values
  const [debugTime, setDebugTime] = useState(0);
  const [debugRingZ, setDebugRingZ] = useState(0);
  const [debugHue, setDebugHue] = useState(0);

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
    if (!containerRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Helper function to apply color pattern override
    const applyColorPattern = (material: THREE.MeshBasicMaterial, birthIndex: number, baseHue: number) => {
      const pattern = colorPatternRef.current;

      if (pattern === "every-5-white" && birthIndex % 5 === 0) {
        material.color.setRGB(1, 1, 1); // White
      } else {
        material.color.setHSL(baseHue / 360, 0.8, 0.5);
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
      ring.rotation.z = shapeRotationRef.current + rotationSpeedRef.current;

      // Apply color with pattern consideration (will be set after userData is defined)
      const birthIndex = i;

      // Bake ring properties from generation constants
      ring.userData = {
        radius: generationRadiusRef.current,
        segments: generationSegmentsRef.current,
        hue: hue,
        spacing: generationSpacingRef.current,
        shapeRotation: shapeRotationRef.current,
        tubeThickness: tubeThicknessRef.current,
        birthIndex: birthIndex,
      };

      // Apply color with pattern override if applicable
      applyColorPattern(ring.material as THREE.MeshBasicMaterial, birthIndex, hue);

      scene.add(ring);
      rings.push(ring);
    }

    let time = 0;
    let frameCount = 0;
    let lastBurstTime = 0;

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
            }
          });
        } else {
          // Reset to original radius when burst is disabled
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
            }
          });
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

            // Find the furthest back ring (after all movement is done)
            const minZ = Math.min(...rings.map(r => r.position.z));
            // Place this ring using oscillated spacing
            ring.position.z = minZ - currentSpacing;

            // Regenerate with oscillated generation constants
            ring.geometry.dispose();
            ring.geometry = new THREE.TorusGeometry(
              currentRadius,
              currentTubeThickness,
              16,
              currentSegments
            );

            // Apply shape rotation (base rotation + rotation speed offset)
            ring.rotation.z = currentShapeRotation + currentRotationSpeed;

            // Bake oscillated generation constants into ring
            ring.userData = {
              radius: currentRadius,
              segments: currentSegments,
              hue: currentHue,
              spacing: currentSpacing,
              shapeRotation: currentShapeRotation,
              tubeThickness: currentTubeThickness,
              birthIndex: ring.userData.birthIndex,
            };

            // Apply color with pattern override if applicable
            applyColorPattern(ring.material as THREE.MeshBasicMaterial, ring.userData.birthIndex, currentHue);
          }

          // Update debug values every 5 frames
          if (i === 0 && frameCount % 5 === 0) {
            setDebugTime(time);
            setDebugRingZ(ring.position.z);
            setDebugHue(ring.userData.hue);
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

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Debug display - top right */}
      {!isPreview && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
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
          <div>Time: {debugTime.toFixed(2)}</div>
          <div>Ring Z: {debugRingZ.toFixed(2)}</div>
          <div>Hue: {debugHue.toFixed(0)}°</div>
        </div>
      )}

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
            <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>
              3D Tunnel
            </h2>
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
              max="1000"
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
            <h3 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#66ccff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Oscillators
            </h3>

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
                  <input type="range" min="0.001" max="5" step="0.01" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {hueOscMin}
                  <input type="range" min="0" max="360" step="1" value={hueOscMin} onChange={(e) => setHueOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {hueOscMax}
                  <input type="range" min="0" max="360" step="1" value={hueOscMax} onChange={(e) => setHueOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={radiusOscSpeed} onChange={(e) => setRadiusOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {radiusOscMin.toFixed(1)}
                  <input type="range" min="2" max="1000" step="0.1" value={radiusOscMin} onChange={(e) => setRadiusOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {radiusOscMax.toFixed(1)}
                  <input type="range" min="2" max="1000" step="0.1" value={radiusOscMax} onChange={(e) => setRadiusOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={spacingOscSpeed} onChange={(e) => setSpacingOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {spacingOscMin.toFixed(1)}
                  <input type="range" min="0.5" max="5" step="0.1" value={spacingOscMin} onChange={(e) => setSpacingOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {spacingOscMax.toFixed(1)}
                  <input type="range" min="0.5" max="5" step="0.1" value={spacingOscMax} onChange={(e) => setSpacingOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={segmentsOscSpeed} onChange={(e) => setSegmentsOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {segmentsOscMin}
                  <input type="range" min="3" max="64" step="1" value={segmentsOscMin} onChange={(e) => setSegmentsOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {segmentsOscMax}
                  <input type="range" min="3" max="64" step="1" value={segmentsOscMax} onChange={(e) => setSegmentsOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={cameraRotationOscSpeed} onChange={(e) => setCameraRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={rotationSpeedOscSpeed} onChange={(e) => setRotationSpeedOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {rotationSpeedOscMin.toFixed(2)}
                  <input type="range" min="-50" max="50" step="0.1" value={rotationSpeedOscMin} onChange={(e) => setRotationSpeedOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {rotationSpeedOscMax.toFixed(2)}
                  <input type="range" min="-50" max="50" step="0.1" value={rotationSpeedOscMax} onChange={(e) => setRotationSpeedOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={shapeRotationOscSpeed} onChange={(e) => setShapeRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <input type="range" min="0.001" max="5" step="0.01" value={tubeThicknessOscSpeed} onChange={(e) => setTubeThicknessOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
          </div>
        </div>
      )}
    </div>
  );
}
