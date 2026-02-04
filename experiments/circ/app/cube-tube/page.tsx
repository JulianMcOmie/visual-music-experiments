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

export default function CubeTube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(0.5);
  const [tubeRadius, setTubeRadius] = useState(9.5);
  const [cubesPerRing, setCubesPerRing] = useState(24); // Reduced from 32 for performance
  const [cubeSize, setCubeSize] = useState(0.5);
  const [rotationSpeed, setRotationSpeed] = useState(0.3);
  const [ringSpacing, setRingSpacing] = useState(3);
  const [hueShift, setHueShift] = useState(0);
  const [lookAhead, setLookAhead] = useState(10);
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

  // Use refs for all parameters to update smoothly without recreating the scene
  const speedRef = useRef(speed);
  const rotationSpeedRef = useRef(rotationSpeed);
  const hueShiftRef = useRef(hueShift);
  const tubeRadiusRef = useRef(tubeRadius);
  const cubesPerRingRef = useRef(cubesPerRing);
  const cubeSizeRef = useRef(cubeSize);
  const ringSpacingRef = useRef(ringSpacing);
  const lookAheadRef = useRef(lookAhead);

  // Oscillation state
  const [speedOscEnabled, setSpeedOscEnabled] = useState(false);
  const [speedOscFunction, setSpeedOscFunction] = useState<WaveFunction>("sin");
  const [speedOscSpeed, setSpeedOscSpeed] = useState(1);
  const [speedOscMin, setSpeedOscMin] = useState(1);
  const [speedOscMax, setSpeedOscMax] = useState(20);

  const [rotationOscEnabled, setRotationOscEnabled] = useState(false);
  const [rotationOscFunction, setRotationOscFunction] = useState<WaveFunction>("sin");
  const [rotationOscSpeed, setRotationOscSpeed] = useState(1);
  const [rotationOscMin, setRotationOscMin] = useState(-10);
  const [rotationOscMax, setRotationOscMax] = useState(10);

  const [radiusOscEnabled, setRadiusOscEnabled] = useState(false);
  const [radiusOscFunction, setRadiusOscFunction] = useState<WaveFunction>("sin");
  const [radiusOscSpeed, setRadiusOscSpeed] = useState(1);
  const [radiusOscMin, setRadiusOscMin] = useState(30);
  const [radiusOscMax, setRadiusOscMax] = useState(120);

  const [cubesOscEnabled, setCubesOscEnabled] = useState(false);
  const [cubesOscFunction, setCubesOscFunction] = useState<WaveFunction>("sin");
  const [cubesOscSpeed, setCubesOscSpeed] = useState(1);
  const [cubesOscMin, setCubesOscMin] = useState(6);
  const [cubesOscMax, setCubesOscMax] = useState(200);

  const [sizeOscEnabled, setSizeOscEnabled] = useState(false);
  const [sizeOscFunction, setSizeOscFunction] = useState<WaveFunction>("sin");
  const [sizeOscSpeed, setSizeOscSpeed] = useState(1);
  const [sizeOscMin, setSizeOscMin] = useState(5);
  const [sizeOscMax, setSizeOscMax] = useState(25);

  const [spacingOscEnabled, setSpacingOscEnabled] = useState(false);
  const [spacingOscFunction, setSpacingOscFunction] = useState<WaveFunction>("sin");
  const [spacingOscSpeed, setSpacingOscSpeed] = useState(1);
  const [spacingOscMin, setSpacingOscMin] = useState(10);
  const [spacingOscMax, setSpacingOscMax] = useState(50);

  const [hueOscEnabled, setHueOscEnabled] = useState(false);
  const [hueOscFunction, setHueOscFunction] = useState<WaveFunction>("sin");
  const [hueOscSpeed, setHueOscSpeed] = useState(1);

  // Tube direction (drift in X/Y)
  const [tubeDriftX, setTubeDriftX] = useState(0);
  const [tubeDriftY, setTubeDriftY] = useState(0);

  // Display values (updated from refs for real-time display)
  const [displayDriftX, setDisplayDriftX] = useState(0);
  const [displayDriftY, setDisplayDriftY] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  const [driftXOscEnabled, setDriftXOscEnabled] = useState(false);
  const [driftXOscFunction, setDriftXOscFunction] = useState<WaveFunction>("sin");
  const [driftXOscSpeed, setDriftXOscSpeed] = useState(1);
  const [driftXOscMin, setDriftXOscMin] = useState(-1);
  const [driftXOscMax, setDriftXOscMax] = useState(1);

  const [driftYOscEnabled, setDriftYOscEnabled] = useState(false);
  const [driftYOscFunction, setDriftYOscFunction] = useState<WaveFunction>("sin");
  const [driftYOscSpeed, setDriftYOscSpeed] = useState(1);
  const [driftYOscMin, setDriftYOscMin] = useState(-1);
  const [driftYOscMax, setDriftYOscMax] = useState(1);

  // Create refs for oscillation parameters
  const speedOscEnabledRef = useRef(speedOscEnabled);
  const speedOscFunctionRef = useRef(speedOscFunction);
  const speedOscSpeedRef = useRef(speedOscSpeed);
  const speedOscMinRef = useRef(speedOscMin);
  const speedOscMaxRef = useRef(speedOscMax);

  const rotationOscEnabledRef = useRef(rotationOscEnabled);
  const rotationOscFunctionRef = useRef(rotationOscFunction);
  const rotationOscSpeedRef = useRef(rotationOscSpeed);
  const rotationOscMinRef = useRef(rotationOscMin);
  const rotationOscMaxRef = useRef(rotationOscMax);

  const radiusOscEnabledRef = useRef(radiusOscEnabled);
  const radiusOscFunctionRef = useRef(radiusOscFunction);
  const radiusOscSpeedRef = useRef(radiusOscSpeed);
  const radiusOscMinRef = useRef(radiusOscMin);
  const radiusOscMaxRef = useRef(radiusOscMax);

  const cubesOscEnabledRef = useRef(cubesOscEnabled);
  const cubesOscFunctionRef = useRef(cubesOscFunction);
  const cubesOscSpeedRef = useRef(cubesOscSpeed);
  const cubesOscMinRef = useRef(cubesOscMin);
  const cubesOscMaxRef = useRef(cubesOscMax);

  const sizeOscEnabledRef = useRef(sizeOscEnabled);
  const sizeOscFunctionRef = useRef(sizeOscFunction);
  const sizeOscSpeedRef = useRef(sizeOscSpeed);
  const sizeOscMinRef = useRef(sizeOscMin);
  const sizeOscMaxRef = useRef(sizeOscMax);

  const spacingOscEnabledRef = useRef(spacingOscEnabled);
  const spacingOscFunctionRef = useRef(spacingOscFunction);
  const spacingOscSpeedRef = useRef(spacingOscSpeed);
  const spacingOscMinRef = useRef(spacingOscMin);
  const spacingOscMaxRef = useRef(spacingOscMax);

  const hueOscEnabledRef = useRef(hueOscEnabled);
  const hueOscFunctionRef = useRef(hueOscFunction);
  const hueOscSpeedRef = useRef(hueOscSpeed);

  const tubeDriftXRef = useRef(tubeDriftX);
  const tubeDriftYRef = useRef(tubeDriftY);

  const driftXOscEnabledRef = useRef(driftXOscEnabled);
  const driftXOscFunctionRef = useRef(driftXOscFunction);
  const driftXOscSpeedRef = useRef(driftXOscSpeed);
  const driftXOscMinRef = useRef(driftXOscMin);
  const driftXOscMaxRef = useRef(driftXOscMax);

  const driftYOscEnabledRef = useRef(driftYOscEnabled);
  const driftYOscFunctionRef = useRef(driftYOscFunction);
  const driftYOscSpeedRef = useRef(driftYOscSpeed);
  const driftYOscMinRef = useRef(driftYOscMin);
  const driftYOscMaxRef = useRef(driftYOscMax);

  // Update refs when state changes (only if not oscillating)
  useEffect(() => { if (!speedOscEnabled) speedRef.current = speed; }, [speed, speedOscEnabled]);
  useEffect(() => { if (!rotationOscEnabled) rotationSpeedRef.current = rotationSpeed; }, [rotationSpeed, rotationOscEnabled]);
  useEffect(() => { if (!hueOscEnabled) hueShiftRef.current = hueShift; }, [hueShift, hueOscEnabled]);
  useEffect(() => { if (!radiusOscEnabled) tubeRadiusRef.current = tubeRadius; }, [tubeRadius, radiusOscEnabled]);
  useEffect(() => { if (!cubesOscEnabled) cubesPerRingRef.current = cubesPerRing; }, [cubesPerRing, cubesOscEnabled]);
  useEffect(() => { if (!sizeOscEnabled) cubeSizeRef.current = cubeSize; }, [cubeSize, sizeOscEnabled]);
  useEffect(() => { if (!spacingOscEnabled) ringSpacingRef.current = ringSpacing; }, [ringSpacing, spacingOscEnabled]);
  useEffect(() => { lookAheadRef.current = lookAhead; }, [lookAhead]);

  // Update oscillation parameter refs
  useEffect(() => { speedOscEnabledRef.current = speedOscEnabled; }, [speedOscEnabled]);
  useEffect(() => { speedOscFunctionRef.current = speedOscFunction; }, [speedOscFunction]);
  useEffect(() => { speedOscSpeedRef.current = speedOscSpeed; }, [speedOscSpeed]);
  useEffect(() => { speedOscMinRef.current = speedOscMin; }, [speedOscMin]);
  useEffect(() => { speedOscMaxRef.current = speedOscMax; }, [speedOscMax]);

  useEffect(() => { rotationOscEnabledRef.current = rotationOscEnabled; }, [rotationOscEnabled]);
  useEffect(() => { rotationOscFunctionRef.current = rotationOscFunction; }, [rotationOscFunction]);
  useEffect(() => { rotationOscSpeedRef.current = rotationOscSpeed; }, [rotationOscSpeed]);
  useEffect(() => { rotationOscMinRef.current = rotationOscMin; }, [rotationOscMin]);
  useEffect(() => { rotationOscMaxRef.current = rotationOscMax; }, [rotationOscMax]);

  useEffect(() => { radiusOscEnabledRef.current = radiusOscEnabled; }, [radiusOscEnabled]);
  useEffect(() => { radiusOscFunctionRef.current = radiusOscFunction; }, [radiusOscFunction]);
  useEffect(() => { radiusOscSpeedRef.current = radiusOscSpeed; }, [radiusOscSpeed]);
  useEffect(() => { radiusOscMinRef.current = radiusOscMin; }, [radiusOscMin]);
  useEffect(() => { radiusOscMaxRef.current = radiusOscMax; }, [radiusOscMax]);

  useEffect(() => { cubesOscEnabledRef.current = cubesOscEnabled; }, [cubesOscEnabled]);
  useEffect(() => { cubesOscFunctionRef.current = cubesOscFunction; }, [cubesOscFunction]);
  useEffect(() => { cubesOscSpeedRef.current = cubesOscSpeed; }, [cubesOscSpeed]);
  useEffect(() => { cubesOscMinRef.current = cubesOscMin; }, [cubesOscMin]);
  useEffect(() => { cubesOscMaxRef.current = cubesOscMax; }, [cubesOscMax]);

  useEffect(() => { sizeOscEnabledRef.current = sizeOscEnabled; }, [sizeOscEnabled]);
  useEffect(() => { sizeOscFunctionRef.current = sizeOscFunction; }, [sizeOscFunction]);
  useEffect(() => { sizeOscSpeedRef.current = sizeOscSpeed; }, [sizeOscSpeed]);
  useEffect(() => { sizeOscMinRef.current = sizeOscMin; }, [sizeOscMin]);
  useEffect(() => { sizeOscMaxRef.current = sizeOscMax; }, [sizeOscMax]);

  useEffect(() => { spacingOscEnabledRef.current = spacingOscEnabled; }, [spacingOscEnabled]);
  useEffect(() => { spacingOscFunctionRef.current = spacingOscFunction; }, [spacingOscFunction]);
  useEffect(() => { spacingOscSpeedRef.current = spacingOscSpeed; }, [spacingOscSpeed]);
  useEffect(() => { spacingOscMinRef.current = spacingOscMin; }, [spacingOscMin]);
  useEffect(() => { spacingOscMaxRef.current = spacingOscMax; }, [spacingOscMax]);

  useEffect(() => { hueOscEnabledRef.current = hueOscEnabled; }, [hueOscEnabled]);
  useEffect(() => { hueOscFunctionRef.current = hueOscFunction; }, [hueOscFunction]);
  useEffect(() => { hueOscSpeedRef.current = hueOscSpeed; }, [hueOscSpeed]);

  useEffect(() => { if (!driftXOscEnabled) tubeDriftXRef.current = tubeDriftX; }, [tubeDriftX, driftXOscEnabled]);
  useEffect(() => { if (!driftYOscEnabled) tubeDriftYRef.current = tubeDriftY; }, [tubeDriftY, driftYOscEnabled]);

  useEffect(() => { driftXOscEnabledRef.current = driftXOscEnabled; }, [driftXOscEnabled]);
  useEffect(() => { driftXOscFunctionRef.current = driftXOscFunction; }, [driftXOscFunction]);
  useEffect(() => { driftXOscSpeedRef.current = driftXOscSpeed; }, [driftXOscSpeed]);
  useEffect(() => { driftXOscMinRef.current = driftXOscMin; }, [driftXOscMin]);
  useEffect(() => { driftXOscMaxRef.current = driftXOscMax; }, [driftXOscMax]);

  useEffect(() => { driftYOscEnabledRef.current = driftYOscEnabled; }, [driftYOscEnabled]);
  useEffect(() => { driftYOscFunctionRef.current = driftYOscFunction; }, [driftYOscFunction]);
  useEffect(() => { driftYOscSpeedRef.current = driftYOscSpeed; }, [driftYOscSpeed]);
  useEffect(() => { driftYOscMinRef.current = driftYOscMin; }, [driftYOscMin]);
  useEffect(() => { driftYOscMaxRef.current = driftYOscMax; }, [driftYOscMax]);

  useEffect(() => {
    if (!containerRef.current) return;

    // ========================================
    // CORE LINE - Built incrementally, never changes once created
    // ========================================

    // Line is built incrementally and stored permanently
    const lineHistory: {
      points: Array<{ t: number; position: THREE.Vector3; direction: THREE.Vector3 }>;
      maxT: number;
    } = {
      points: [
        { t: 0, position: new THREE.Vector3(0, 0, 0), direction: new THREE.Vector3(0, 0, 1) }
      ],
      maxT: 0
    };

    // Extend the line at the tip using current drift values
    // This is the ONLY place where drift affects the line
    const extendLine = (targetT: number) => {
      const stepSize = 0.5;
      let currentT = lineHistory.maxT;

      // Start from the last point
      const lastPoint = lineHistory.points[lineHistory.points.length - 1];
      let currentPos = lastPoint.position.clone();
      let currentDir = lastPoint.direction.clone();

      while (currentT < targetT) {
        currentT += stepSize;

        // Current drift values control the turn rate
        const turnX = tubeDriftXRef.current; // Left/right
        const turnY = tubeDriftYRef.current; // Up/down

        // Apply turning to direction - using proper rotation
        const turnScale = 0.05; // Much higher for visible curvature across full range

        // Calculate rotation angles
        const yaw = turnX * turnScale * stepSize;
        const pitch = turnY * turnScale * stepSize;

        // Apply yaw rotation (around Y axis) - left/right turning
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        let newDirX = currentDir.x * cosYaw + currentDir.z * sinYaw;
        let newDirY = currentDir.y;
        let newDirZ = -currentDir.x * sinYaw + currentDir.z * cosYaw;

        // Apply pitch rotation (around X axis) - up/down turning
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);
        const finalDirY = newDirY * cosPitch - newDirZ * sinPitch;
        const finalDirZ = newDirY * sinPitch + newDirZ * cosPitch;

        currentDir = new THREE.Vector3(newDirX, finalDirY, finalDirZ).normalize();

        // Move forward in this direction
        currentPos = currentPos.clone().add(currentDir.clone().multiplyScalar(stepSize));

        // Store this point PERMANENTLY
        lineHistory.points.push({
          t: currentT,
          position: currentPos.clone(),
          direction: currentDir.clone()
        });
      }

      lineHistory.maxT = targetT;
    };

    // Get position on line (reads from stored history)
    const lineFunction = (t: number): THREE.Vector3 => {
      // Extend line if needed
      if (t > lineHistory.maxT) {
        extendLine(t + 10);
      }

      // Find surrounding points and interpolate
      if (t <= lineHistory.points[0].t) return lineHistory.points[0].position.clone();

      for (let i = 0; i < lineHistory.points.length - 1; i++) {
        const p1 = lineHistory.points[i];
        const p2 = lineHistory.points[i + 1];

        if (t >= p1.t && t <= p2.t) {
          const alpha = (t - p1.t) / (p2.t - p1.t);
          return p1.position.clone().lerp(p2.position, alpha);
        }
      }

      return lineHistory.points[lineHistory.points.length - 1].position.clone();
    };

    // Get direction on line (reads from stored history)
    const lineDirection = (t: number): THREE.Vector3 => {
      for (let i = 0; i < lineHistory.points.length - 1; i++) {
        const p1 = lineHistory.points[i];
        const p2 = lineHistory.points[i + 1];

        if (t >= p1.t && t <= p2.t) {
          const alpha = (t - p1.t) / (p2.t - p1.t);
          return p1.direction.clone().lerp(p2.direction, alpha).normalize();
        }
      }

      return new THREE.Vector3(0, 0, 1);
    };

    // Get perpendicular plane basis vectors at point t (for ring orientation)
    const getPlaneVectors = (t: number): { right: THREE.Vector3; up: THREE.Vector3 } => {
      // Get the line direction (tangent) at this point
      const forward = lineDirection(t);

      // Create perpendicular plane to the forward direction
      // Choose a reference vector that's not parallel to forward
      const worldUp = new THREE.Vector3(0, 1, 0);
      const worldRight = new THREE.Vector3(1, 0, 0);

      // Pick reference based on which is more perpendicular to forward
      const reference = Math.abs(forward.dot(worldUp)) < 0.9 ? worldUp : worldRight;

      // Calculate right vector (perpendicular to both forward and reference)
      const right = new THREE.Vector3().crossVectors(reference, forward).normalize();

      // Calculate up vector (perpendicular to both forward and right)
      const up = new THREE.Vector3().crossVectors(forward, right).normalize();

      return { right, up };
    };

    // Scene setup
    const scene = new THREE.Scene();
    // Fog disabled for better visibility
    // scene.fog = new THREE.Fog(0x000510, 1, 80);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Set initial camera position
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 30);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000510); // Black background
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 150);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);

    // ========================================
    // VISUALIZE PATH LINE
    // ========================================

    // Extend initial line so there's something to see
    extendLine(100);

    const pathLineLength = 40; // Show line ahead and behind camera
    const pathLineBehind = 10; // Show some behind
    const pathLineSegments = 80;

    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i < pathLineSegments; i++) {
      // Show line from behind camera to ahead
      const t = 20 + (i / pathLineSegments) * (pathLineLength + pathLineBehind);
      pathPoints.push(lineFunction(t));
    }


    // Create curve from points
    const curve = new THREE.CatmullRomCurve3(pathPoints);

    // Green tube removed per user request
    // const pathGeometry = new THREE.TubeGeometry(curve, 80, 2, 12, false);
    // const pathMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x00ff00
    // });
    // const pathLine = new THREE.Mesh(pathGeometry, pathMaterial);
    // scene.add(pathLine);


    // Add debug sphere ahead of camera to mark the tip
    const sphereGeometry = new THREE.SphereGeometry(3, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      fog: false,
      depthTest: false
    });
    const debugSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    debugSphere.renderOrder = 1000;
    scene.add(debugSphere);


    // ========================================
    // CREATE RINGS AHEAD OF STARTING CAMERA POSITION
    // ========================================

    const maxCubesPerRing = 32;
    const numRings = 40; // Reduced from 80 for better performance
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

    interface CubeData {
      mesh: THREE.Mesh;
      ringIndex: number;
      positionIndex: number;
    }

    const cubes: CubeData[] = [];

    // Camera will start at t=0, so place rings ahead at t > 0
    for (let ring = 0; ring < numRings; ring++) {
      const ringT = (ring + 1) * ringSpacingRef.current; // Start from spacing, not 0

      for (let i = 0; i < maxCubesPerRing; i++) {
        const hue = ((ring * 20 + i * 10 + hueShiftRef.current) % 360) / 360;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);

        const material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.5,
          roughness: 0.3,
          emissive: color,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 1,
        });

        const cube = new THREE.Mesh(cubeGeometry, material);
        cube.scale.setScalar(cubeSizeRef.current);
        cube.visible = i < cubesPerRingRef.current;

        // Each cube stores its position along the path (t parameter)
        cube.userData.currentAngle = (i / maxCubesPerRing) * Math.PI * 2;
        cube.userData.pathT = ringT;

        scene.add(cube);
        cubes.push({ mesh: cube, ringIndex: ring, positionIndex: i });
      }
    }

    // Animation
    let animationId: number;
    let time = 0;
    let cameraTParam = 0; // Camera's position along the path

    const animate = () => {
      time += 0.016;

      // Update display values every frame for immediate feedback
      setDisplayDriftX(tubeDriftXRef.current);
      setDisplayDriftY(tubeDriftYRef.current);
      setDisplayTime(time);

      // Calculate oscillated values
      if (speedOscEnabledRef.current) {
        const wave = waveFunctions[speedOscFunctionRef.current];
        const normalizedWave = (wave(time * speedOscSpeedRef.current) + 1) / 2;
        speedRef.current = speedOscMinRef.current + normalizedWave * (speedOscMaxRef.current - speedOscMinRef.current);
      }

      if (rotationOscEnabledRef.current) {
        const wave = waveFunctions[rotationOscFunctionRef.current];
        const normalizedWave = (wave(time * rotationOscSpeedRef.current) + 1) / 2;
        rotationSpeedRef.current = rotationOscMinRef.current + normalizedWave * (rotationOscMaxRef.current - rotationOscMinRef.current);
      }

      if (radiusOscEnabledRef.current) {
        const wave = waveFunctions[radiusOscFunctionRef.current];
        const normalizedWave = (wave(time * radiusOscSpeedRef.current) + 1) / 2;
        tubeRadiusRef.current = radiusOscMinRef.current + normalizedWave * (radiusOscMaxRef.current - radiusOscMinRef.current);
      }

      if (cubesOscEnabledRef.current) {
        const wave = waveFunctions[cubesOscFunctionRef.current];
        const normalizedWave = (wave(time * cubesOscSpeedRef.current) + 1) / 2;
        cubesPerRingRef.current = cubesOscMinRef.current + normalizedWave * (cubesOscMaxRef.current - cubesOscMinRef.current);
      }

      if (sizeOscEnabledRef.current) {
        const wave = waveFunctions[sizeOscFunctionRef.current];
        const normalizedWave = (wave(time * sizeOscSpeedRef.current) + 1) / 2;
        cubeSizeRef.current = sizeOscMinRef.current + normalizedWave * (sizeOscMaxRef.current - sizeOscMinRef.current);
      }

      if (spacingOscEnabledRef.current) {
        const wave = waveFunctions[spacingOscFunctionRef.current];
        const normalizedWave = (wave(time * spacingOscSpeedRef.current) + 1) / 2;
        ringSpacingRef.current = spacingOscMinRef.current + normalizedWave * (spacingOscMaxRef.current - spacingOscMinRef.current);
      }

      if (hueOscEnabledRef.current) {
        const wave = waveFunctions[hueOscFunctionRef.current];
        hueShiftRef.current = hueShift + wave(time * hueOscSpeedRef.current) * 180;
      }

      if (driftXOscEnabledRef.current) {
        const wave = waveFunctions[driftXOscFunctionRef.current];
        const normalizedWave = (wave(time * driftXOscSpeedRef.current) + 1) / 2;
        tubeDriftXRef.current = driftXOscMinRef.current + normalizedWave * (driftXOscMaxRef.current - driftXOscMinRef.current);
      }

      if (driftYOscEnabledRef.current) {
        const wave = waveFunctions[driftYOscFunctionRef.current];
        const normalizedWave = (wave(time * driftYOscSpeedRef.current) + 1) / 2;
        tubeDriftYRef.current = driftYOscMinRef.current + normalizedWave * (driftYOscMaxRef.current - driftYOscMinRef.current);
      }

      // ========================================
      // UPDATE CAMERA - Positioned at the tip (front) of the line
      // ========================================

      // Move along the line
      cameraTParam += speedRef.current;

      // Extend line far enough for visualization
      const visualNeed = pathLineLength + 20; // Need line extended 20 units past camera for tip
      const targetExtension = cameraTParam + visualNeed;
      if (targetExtension > lineHistory.maxT) {
        extendLine(targetExtension);
      }

      // Position camera ON the line
      const cameraPos = lineFunction(cameraTParam);
      camera.position.copy(cameraPos);

      // Camera looks forward along the line direction
      const cameraDirection = lineDirection(cameraTParam);
      const lookAtPoint = cameraPos.clone().add(cameraDirection.multiplyScalar(lookAheadRef.current));
      camera.lookAt(lookAtPoint);

      // ========================================
      // WRAP RINGS: Maintain rings from camera to tip
      // ========================================

      // Group cubes by ring
      const ringMap = new Map<number, typeof cubes>();
      cubes.forEach((cubeData) => {
        if (!ringMap.has(cubeData.ringIndex)) {
          ringMap.set(cubeData.ringIndex, []);
        }
        ringMap.get(cubeData.ringIndex)!.push(cubeData);
      });

      // Tip is 5 rings ahead of camera (matches line extension)
      const wrapTipT = cameraTParam + (5 * ringSpacingRef.current);

      // Find the frontmost ring
      let frontT = wrapTipT;
      ringMap.forEach((ringCubes) => {
        const ringT = ringCubes[0].mesh.userData.pathT;
        if (ringT > frontT) {
          frontT = ringT;
        }
      });

      // Wrap rings that fell behind camera to near the tip
      ringMap.forEach((ringCubes) => {
        const firstCube = ringCubes[0].mesh;
        const ringT = firstCube.userData.pathT;

        // If ring is behind camera, wrap it to the front
        if (ringT < cameraTParam) {
          const newT = frontT + ringSpacingRef.current;
          frontT = newT;

          // Update all cubes in this ring
          ringCubes.forEach(({ mesh }) => {
            mesh.userData.pathT = newT;
          });
        }
      });

      // ========================================
      // UPDATE LINE VISUALIZATION - Disabled (green tube removed)
      // ========================================

      // Update debug sphere to camera position (at the tip)
      debugSphere.position.copy(camera.position);


      // ========================================
      // UPDATE RINGS - Positioned on tangent planes along the line
      // ========================================

      cubes.forEach(({ mesh: cube, ringIndex, positionIndex }) => {
        const material = cube.material as THREE.MeshStandardMaterial;

        // 1. Find point on line for this ring
        const ringT = cube.userData.pathT;

        // Cull cubes that are too far behind camera
        if (ringT < cameraTParam - 10) {
          cube.visible = false;
          return;
        }

        const ringCenter = lineFunction(ringT);

        // 2. Get tangent plane at this point (perpendicular to line direction)
        const planeVectors = getPlaneVectors(ringT);

        // Store previous opacity to detect new cubes
        const wasVisible = material.opacity > 0.5;

        // Fade in/out based on cubesPerRing
        const shouldBeVisible = positionIndex < cubesPerRingRef.current;
        const targetOpacity = shouldBeVisible ? 1 : 0;
        material.opacity += (targetOpacity - material.opacity) * 0.3;

        if (material.opacity < 0.01) {
          cube.visible = false;
          return;
        }
        cube.visible = true;

        const isNewlyAppearing = !wasVisible && shouldBeVisible;
        const isFadingOut = !shouldBeVisible && material.opacity > 0.01;

        // Get or update angle
        const targetAngle = (positionIndex / cubesPerRingRef.current) * Math.PI * 2;
        if (cube.userData.currentAngle === undefined) {
          cube.userData.currentAngle = targetAngle;
        }

        if (!isFadingOut) {
          if (isNewlyAppearing) {
            cube.userData.currentAngle = targetAngle;
          } else {
            let angleDiff = targetAngle - cube.userData.currentAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            cube.userData.currentAngle += angleDiff * 0.1;
          }
        }

        // 3. Position cube in a circle on the tangent plane
        const radius = tubeRadiusRef.current;
        const angle = cube.userData.currentAngle;

        // Calculate offset in the plane
        const offsetRight = Math.cos(angle) * radius;
        const offsetUp = Math.sin(angle) * radius;

        // Final position = ring center + offset in tangent plane
        cube.position.copy(ringCenter)
          .add(planeVectors.right.clone().multiplyScalar(offsetRight))
          .add(planeVectors.up.clone().multiplyScalar(offsetUp));

        // Update scale
        const targetScale = cubeSizeRef.current;
        cube.scale.x += (targetScale - cube.scale.x) * 0.1;
        cube.scale.y += (targetScale - cube.scale.y) * 0.1;
        cube.scale.z += (targetScale - cube.scale.z) * 0.1;

        // Rotate cubes
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Apply rotation to individual cube
        cube.rotation.z += rotationSpeedRef.current * 0.005;

        // Update color
        const angleInDegrees = (cube.userData.currentAngle * 180 / Math.PI);
        const hue = ((ringT * 2 + angleInDegrees + hueShiftRef.current + time * 50) % 360) / 360;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        material.color = color;
        material.emissive = color;
      });

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

      // Dispose of resources
      cubes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });


      renderer.dispose();
    };
  }, []); // Empty dependency array - scene is created once, all updates happen via refs

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Direction value display - top right */}
      {!isPreview && <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(0, 0, 0, 0.8)",
          padding: "15px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#fff",
          fontFamily: "monospace",
        }}
      >
        <div style={{ marginBottom: "5px", fontSize: "11px", opacity: 0.7 }}>
          Time: {displayTime.toFixed(1)}s | X-Osc: {driftXOscEnabled ? "ON" : "OFF"}
        </div>
        <div style={{ marginBottom: "8px" }}>
          <strong>X:</strong> {displayDriftX.toFixed(2)}
        </div>
        <div>
          <strong>Y:</strong> {displayDriftY.toFixed(2)}
        </div>
      </div>}

      {/* Controls - left side */}
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
        <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#fff" }}>
          3D Cube Tube
        </h2>

        <details open style={{ marginBottom: "20px" }}>
          <summary style={{ fontSize: "16px", color: "#fff", cursor: "pointer", marginBottom: "15px", fontWeight: "bold" }}>
            Base Parameters
          </summary>
          <div style={{ paddingLeft: "10px" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Speed: {speed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Tube Rotation: {rotationSpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Tube Radius: {tubeRadius.toFixed(1)}
              </label>
              <input
                type="range"
                min="3"
                max="15"
                step="0.5"
                value={tubeRadius}
                onChange={(e) => setTubeRadius(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Cubes Per Ring: {cubesPerRing}
              </label>
              <input
                type="range"
                min="4"
                max="32"
                step="1"
                value={cubesPerRing}
                onChange={(e) => setCubesPerRing(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Cube Size: {cubeSize.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={cubeSize}
                onChange={(e) => setCubeSize(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Ring Spacing: {ringSpacing.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={ringSpacing}
                onChange={(e) => setRingSpacing(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Color Shift: {hueShift}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={hueShift}
                onChange={(e) => setHueShift(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" }}>
                Look Ahead: {lookAhead.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="0.5"
                value={lookAhead}
                onChange={(e) => setLookAhead(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>
          </div>
        </details>

        <h3 style={{ margin: "30px 0 15px 0", fontSize: "16px", color: "#fff", borderTop: "1px solid #444", paddingTop: "20px" }}>
          Oscillations
        </h3>

        {/* Speed Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Speed Oscillation {speedOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={speedOscEnabled} onChange={(e) => setSpeedOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={speedOscFunction} onChange={(e) => setSpeedOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {speedOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={speedOscSpeed} onChange={(e) => setSpeedOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {speedOscMin.toFixed(2)}</label>
            <input type="range" min="0" max="30" step="0.5" value={speedOscMin} onChange={(e) => setSpeedOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {speedOscMax.toFixed(2)}</label>
            <input type="range" min="0" max="30" step="0.5" value={speedOscMax} onChange={(e) => setSpeedOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
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
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {rotationOscMin.toFixed(1)}</label>
            <input type="range" min="-20" max="20" step="1" value={rotationOscMin} onChange={(e) => setRotationOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {rotationOscMax.toFixed(1)}</label>
            <input type="range" min="-20" max="20" step="1" value={rotationOscMax} onChange={(e) => setRotationOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Tube Radius Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Tube Radius Oscillation {radiusOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={radiusOscEnabled} onChange={(e) => setRadiusOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={radiusOscFunction} onChange={(e) => setRadiusOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {radiusOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={radiusOscSpeed} onChange={(e) => setRadiusOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {radiusOscMin.toFixed(0)}</label>
            <input type="range" min="10" max="150" step="5" value={radiusOscMin} onChange={(e) => setRadiusOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {radiusOscMax.toFixed(0)}</label>
            <input type="range" min="10" max="150" step="5" value={radiusOscMax} onChange={(e) => setRadiusOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Cubes Per Ring Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Cubes Per Ring Oscillation {cubesOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={cubesOscEnabled} onChange={(e) => setCubesOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={cubesOscFunction} onChange={(e) => setCubesOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {cubesOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={cubesOscSpeed} onChange={(e) => setCubesOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {cubesOscMin}</label>
            <input type="range" min="4" max="320" step="4" value={cubesOscMin} onChange={(e) => setCubesOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {cubesOscMax}</label>
            <input type="range" min="4" max="320" step="4" value={cubesOscMax} onChange={(e) => setCubesOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Cube Size Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Cube Size Oscillation {sizeOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={sizeOscEnabled} onChange={(e) => setSizeOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={sizeOscFunction} onChange={(e) => setSizeOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {sizeOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={sizeOscSpeed} onChange={(e) => setSizeOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {sizeOscMin.toFixed(0)}</label>
            <input type="range" min="1" max="30" step="1" value={sizeOscMin} onChange={(e) => setSizeOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {sizeOscMax.toFixed(0)}</label>
            <input type="range" min="1" max="30" step="1" value={sizeOscMax} onChange={(e) => setSizeOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Ring Spacing Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Ring Spacing Oscillation {spacingOscEnabled ? "✓" : ""}
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
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min: {spacingOscMin.toFixed(0)}</label>
            <input type="range" min="5" max="80" step="5" value={spacingOscMin} onChange={(e) => setSpacingOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max: {spacingOscMax.toFixed(0)}</label>
            <input type="range" min="5" max="80" step="5" value={spacingOscMax} onChange={(e) => setSpacingOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Hue Shift Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Color Oscillation {hueOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={hueOscEnabled} onChange={(e) => setHueOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={hueOscFunction} onChange={(e) => setHueOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {hueOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Tube Drift X Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            X Direction (Left/Right) {driftXOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={driftXOscEnabled} onChange={(e) => setDriftXOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={driftXOscFunction} onChange={(e) => setDriftXOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {driftXOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={driftXOscSpeed} onChange={(e) => setDriftXOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min (← Left): {driftXOscMin.toFixed(1)}</label>
            <input type="range" min="-10" max="10" step="0.5" value={driftXOscMin} onChange={(e) => setDriftXOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max (Right →): {driftXOscMax.toFixed(1)}</label>
            <input type="range" min="-10" max="10" step="0.5" value={driftXOscMax} onChange={(e) => setDriftXOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        {/* Tube Drift Y Oscillation */}
        <details style={{ marginBottom: "15px" }}>
          <summary style={{ fontSize: "13px", color: "#fff", cursor: "pointer", marginBottom: "8px" }}>
            Y Direction (Up/Down) {driftYOscEnabled ? "✓" : ""}
          </summary>
          <div style={{ paddingLeft: "12px" }}>
            <label style={{ fontSize: "11px", color: "#fff", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <input type="checkbox" checked={driftYOscEnabled} onChange={(e) => setDriftYOscEnabled(e.target.checked)} />
              Enable
            </label>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Function</label>
            <select value={driftYOscFunction} onChange={(e) => setDriftYOscFunction(e.target.value as WaveFunction)} style={{ width: "100%", padding: "4px", borderRadius: "4px", background: "#222", color: "#fff", border: "1px solid #444", fontSize: "11px", marginBottom: "6px" }}>
              <option value="sin">Sine</option>
              <option value="cos">Cosine</option>
              <option value="abs-sin">Abs Sine</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="triangle">Triangle</option>
            </select>
            <label style={{ fontSize: "11px", color: "#aaa" }}>Speed: {driftYOscSpeed.toFixed(2)}</label>
            <input type="range" min="0.1" max="5" step="0.1" value={driftYOscSpeed} onChange={(e) => setDriftYOscSpeed(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Min (↓ Down): {driftYOscMin.toFixed(1)}</label>
            <input type="range" min="-10" max="10" step="0.5" value={driftYOscMin} onChange={(e) => setDriftYOscMin(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
            <label style={{ fontSize: "11px", color: "#aaa" }}>Max (Up ↑): {driftYOscMax.toFixed(1)}</label>
            <input type="range" min="-10" max="10" step="0.5" value={driftYOscMax} onChange={(e) => setDriftYOscMax(Number(e.target.value))} style={{ width: "100%", marginBottom: "6px" }} />
          </div>
        </details>

        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "20px" }}>
          <a href="/" style={{ color: "#4488ff" }}>← Gallery</a>
        </div>
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
