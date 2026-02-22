"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { createTilingWallGeometry } from "./tiling-geometry";

type WaveFunction = "cos" | "sin" | "abs-sin" | "square" | "sawtooth" | "triangle";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  cos: (x) => Math.cos(x),
  sin: (x) => Math.sin(x),
  "abs-sin": (x) => Math.abs(Math.sin(x)),
  square: (x) => (Math.sin(x) >= 0 ? 1 : -1),
  sawtooth: (x) => 2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5)),
  triangle: (x) => 2 * Math.abs(2 * ((x / (2 * Math.PI)) - Math.floor((x / (2 * Math.PI)) + 0.5))) - 1,
};

// Wave function index mapping
const waveToIndex: Record<WaveFunction, number> = {
  sin: 0, cos: 1, "abs-sin": 2, square: 3, sawtooth: 4, triangle: 5,
};

// HSL-to-RGB shader function + tile coloring with lighting
const vertexShader = /* glsl */ `
  #include <common>
  #include <lights_pars_begin>

  attribute vec3 color;
  attribute vec3 tileCentroid;
  uniform float uTileRotation;

  // Time delay uniforms
  uniform float uTime;
  uniform float uTimeDelay;
  uniform vec3 uFocalPoint;

  // Tile rotation oscillator uniforms
  uniform bool uTileRotOscEnabled;
  uniform int uTileRotOscFunction;
  uniform float uTileRotOscSpeed;
  uniform float uTileRotOscMin;
  uniform float uTileRotOscMax;
  uniform float uTileRotBase;

  // Hue oscillator uniforms
  uniform bool uHueOscEnabled;
  uniform int uHueOscFunction;
  uniform float uHueOscSpeed;
  uniform float uHueOscMin;
  uniform float uHueOscMax;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vTileHue;

  // GLSL wave functions: returns value in [-1, 1]
  float waveFunc(int fn, float x) {
    if (fn == 0) return sin(x);           // sin
    if (fn == 1) return cos(x);           // cos
    if (fn == 2) return abs(sin(x));      // abs-sin (0 to 1, remapped below)
    if (fn == 3) return sin(x) >= 0.0 ? 1.0 : -1.0; // square
    if (fn == 4) return 2.0 * fract(x / 6.28318) - 1.0; // sawtooth
    // triangle
    return 2.0 * abs(2.0 * fract(x / 6.28318) - 1.0) - 1.0;
  }

  // Normalized wave: returns value in [0, 1]
  float waveNorm(int fn, float x) {
    if (fn == 2) return abs(sin(x)); // abs-sin already 0..1
    return (waveFunc(fn, x) + 1.0) / 2.0;
  }

  // Rodrigues rotation: rotate v around unit axis k by angle a
  vec3 rotateAxis(vec3 v, vec3 k, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
  }

  void main() {
    vColor = color;

    // Per-tile distance from focal point for phase offset
    float dist = length(tileCentroid - uFocalPoint);
    float phaseOffset = dist * uTimeDelay;

    // Tile rotation: use shader oscillator or base value
    float tileRot = uTileRotBase;
    if (uTileRotOscEnabled) {
      float norm = waveNorm(uTileRotOscFunction, uTime * uTileRotOscSpeed - phaseOffset);
      tileRot = uTileRotOscMin + norm * (uTileRotOscMax - uTileRotOscMin);
    }

    // Hue oscillator: compute per-tile hue
    vTileHue = -1.0; // sentinel: no override
    if (uHueOscEnabled) {
      float norm = waveNorm(uHueOscFunction, uTime * uHueOscSpeed - phaseOffset);
      vTileHue = uHueOscMin + norm * (uHueOscMax - uHueOscMin);
    }

    // Rotate each tile's vertices around its centroid, along the surface normal
    vec3 pos = position;
    if (abs(tileRot) > 0.001) {
      vec3 offset = position - tileCentroid;
      vec3 axis = normalize(normal);
      pos = tileCentroid + rotateAxis(offset, axis, tileRot);
    }

    vec3 transformedNormal = normalMatrix * normal;
    vNormal = normalize(transformedNormal);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <packing>
  #include <lights_pars_begin>

  uniform float uHue;
  uniform float uSaturation;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vTileHue;

  // Standard HSL to RGB conversion
  vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = h * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    vec3 rgb;
    if (hp < 1.0) rgb = vec3(c, x, 0.0);
    else if (hp < 2.0) rgb = vec3(x, c, 0.0);
    else if (hp < 3.0) rgb = vec3(0.0, c, x);
    else if (hp < 4.0) rgb = vec3(0.0, x, c);
    else if (hp < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    float m = l - c * 0.5;
    return rgb + m;
  }

  void main() {
    // Decode tile identity from vertex colors
    float aspectFraction = vColor.r;
    float lightness = vColor.g;

    // Use per-tile hue from oscillator if active, otherwise uniform
    float baseHue = vTileHue >= 0.0 ? vTileHue : uHue;
    float hue = fract(baseHue + aspectFraction * 0.08);
    vec3 baseColor = hsl2rgb(hue, uSaturation, lightness);

    // Simple lighting using Three.js light data
    vec3 normal = normalize(vNormal);
    vec3 totalLight = vec3(0.0);

    // Ambient lights
    totalLight += ambientLightColor;

    // Hemisphere lights
    #if NUM_HEMI_LIGHTS > 0
      for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
        float dotNL = dot(normal, hemisphereLights[i].direction);
        float weight = 0.5 + 0.5 * dotNL;
        totalLight += mix(hemisphereLights[i].groundColor, hemisphereLights[i].skyColor, weight);
      }
    #endif

    // Point lights
    #if NUM_POINT_LIGHTS > 0
      for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3 lVector = pointLights[i].position - vViewPosition;
        float lDistance = length(lVector);
        vec3 lDir = normalize(lVector);

        float dotNL = max(dot(normal, lDir), 0.0);

        // Distance attenuation (physically based)
        float distanceFalloff = 1.0 / max(lDistance * lDistance, 0.01);
        if (pointLights[i].distance > 0.0) {
          float ratio = clamp(1.0 - pow(lDistance / pointLights[i].distance, 4.0), 0.0, 1.0);
          distanceFalloff *= ratio * ratio;
        }

        totalLight += pointLights[i].color * dotNL * distanceFalloff;
      }
    #endif

    vec3 finalColor = baseColor * totalLight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createTileMaterial(hue: number, saturation: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsLib.lights,
      uHue: { value: hue },
      uSaturation: { value: saturation },
      uTileRotation: { value: 0 },
      // Time delay
      uTime: { value: 0 },
      uTimeDelay: { value: 0 },
      uFocalPoint: { value: new THREE.Vector3(0, 110, -250) },
      // Tile rotation oscillator
      uTileRotOscEnabled: { value: false },
      uTileRotOscFunction: { value: 5 }, // triangle
      uTileRotOscSpeed: { value: 0.5 },
      uTileRotOscMin: { value: -Math.PI },
      uTileRotOscMax: { value: Math.PI },
      uTileRotBase: { value: 0 },
      // Hue oscillator
      uHueOscEnabled: { value: false },
      uHueOscFunction: { value: 0 }, // sin
      uHueOscSpeed: { value: 0.3 },
      uHueOscMin: { value: 0 },
      uHueOscMax: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    lights: true,
    side: THREE.DoubleSide,
  });
}

export default function ExpansiveRoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Expensive params (trigger geometry rebuild) — kept as state
  const [tilingType, setTilingType] = useState(3);
  const [roomRadius, setRoomRadius] = useState(260);
  const [roomHeight, setRoomHeight] = useState(220);
  const [tileScale, setTileScale] = useState(8);
  const [edgeCurvature, setEdgeCurvature] = useState(0.5);
  const [tileRotation, setTileRotation] = useState(0);
  const [roomDepth, setRoomDepth] = useState(500);

  // Cheap params (uniform-driven) — refs for instant updates, state for UI display
  const hueRef = useRef(0.58);
  const saturationRef = useRef(0.85);
  const brightnessRef = useRef(1.8);
  const [hueDisplay, setHueDisplay] = useState(0.58);
  const [saturationDisplay, setSaturationDisplay] = useState(0.85);
  const [brightnessDisplay, setBrightnessDisplay] = useState(1.8);

  // Oscillator state — hue (cheap)
  const [hueOscEnabled, setHueOscEnabled] = useState(false);
  const [hueOscFunction, setHueOscFunction] = useState<WaveFunction>("sin");
  const [hueOscSpeed, setHueOscSpeed] = useState(0.3);
  const [hueOscMin, setHueOscMin] = useState(0);
  const [hueOscMax, setHueOscMax] = useState(1);

  // Oscillator state — roomDepth (expensive)
  const [roomDepthOscEnabled, setRoomDepthOscEnabled] = useState(false);
  const [roomDepthOscFunction, setRoomDepthOscFunction] = useState<WaveFunction>("sin");
  const [roomDepthOscSpeed, setRoomDepthOscSpeed] = useState(0.3);
  const [roomDepthOscMin, setRoomDepthOscMin] = useState(100);
  const [roomDepthOscMax, setRoomDepthOscMax] = useState(2000);

  // Oscillator state — tileRotation (expensive)
  const [tileRotationOscEnabled, setTileRotationOscEnabled] = useState(false);
  const [tileRotationOscFunction, setTileRotationOscFunction] = useState<WaveFunction>("triangle");
  const [tileRotationOscSpeed, setTileRotationOscSpeed] = useState(0.5);
  const [tileRotationOscMin, setTileRotationOscMin] = useState(-Math.PI);
  const [tileRotationOscMax, setTileRotationOscMax] = useState(Math.PI);

  // Time delay for ripple effect
  const [timeDelay, setTimeDelay] = useState(0);
  const timeDelayRef = useRef(0);

  // Oscillator state — tileScale (expensive)
  const [tileScaleOscEnabled, setTileScaleOscEnabled] = useState(false);
  const [tileScaleOscFunction, setTileScaleOscFunction] = useState<WaveFunction>("sin");
  const [tileScaleOscSpeed, setTileScaleOscSpeed] = useState(0.4);
  const [tileScaleOscMin, setTileScaleOscMin] = useState(3);
  const [tileScaleOscMax, setTileScaleOscMax] = useState(15);

  // Oscillator state — roomHeight (expensive)
  const [roomHeightOscEnabled, setRoomHeightOscEnabled] = useState(false);
  const [roomHeightOscFunction, setRoomHeightOscFunction] = useState<WaveFunction>("sin");
  const [roomHeightOscSpeed, setRoomHeightOscSpeed] = useState(0.3);
  const [roomHeightOscMin, setRoomHeightOscMin] = useState(80);
  const [roomHeightOscMax, setRoomHeightOscMax] = useState(300);

  // Oscillator state — roomRadius (expensive)
  const [roomRadiusOscEnabled, setRoomRadiusOscEnabled] = useState(false);
  const [roomRadiusOscFunction, setRoomRadiusOscFunction] = useState<WaveFunction>("sin");
  const [roomRadiusOscSpeed, setRoomRadiusOscSpeed] = useState(0.3);
  const [roomRadiusOscMin, setRoomRadiusOscMin] = useState(80);
  const [roomRadiusOscMax, setRoomRadiusOscMax] = useState(350);

  // Oscillator state — tilingType (expensive)
  const [tilingTypeOscEnabled, setTilingTypeOscEnabled] = useState(false);
  const [tilingTypeOscFunction, setTilingTypeOscFunction] = useState<WaveFunction>("sawtooth");
  const [tilingTypeOscSpeed, setTilingTypeOscSpeed] = useState(0.2);
  const [tilingTypeOscMin, setTilingTypeOscMin] = useState(0);
  const [tilingTypeOscMax, setTilingTypeOscMax] = useState(80);

  // Oscillator refs (synced from state for animation loop access)
  const hueOscEnabledRef = useRef(false);
  const hueOscFunctionRef = useRef<WaveFunction>("sin");
  const hueOscSpeedRef = useRef(0.3);
  const hueOscMinRef = useRef(0);
  const hueOscMaxRef = useRef(1);

  const roomDepthOscEnabledRef = useRef(false);
  const roomDepthOscFunctionRef = useRef<WaveFunction>("sin");
  const roomDepthOscSpeedRef = useRef(0.3);
  const roomDepthOscMinRef = useRef(100);
  const roomDepthOscMaxRef = useRef(2000);

  const tileRotationOscEnabledRef = useRef(false);
  const tileRotationOscFunctionRef = useRef<WaveFunction>("triangle");
  const tileRotationOscSpeedRef = useRef(0.5);
  const tileRotationOscMinRef = useRef(-Math.PI);
  const tileRotationOscMaxRef = useRef(Math.PI);

  const tileScaleOscEnabledRef = useRef(false);
  const tileScaleOscFunctionRef = useRef<WaveFunction>("sin");
  const tileScaleOscSpeedRef = useRef(0.4);
  const tileScaleOscMinRef = useRef(3);
  const tileScaleOscMaxRef = useRef(15);

  const roomHeightOscEnabledRef = useRef(false);
  const roomHeightOscFunctionRef = useRef<WaveFunction>("sin");
  const roomHeightOscSpeedRef = useRef(0.3);
  const roomHeightOscMinRef = useRef(80);
  const roomHeightOscMaxRef = useRef(300);

  const roomRadiusOscEnabledRef = useRef(false);
  const roomRadiusOscFunctionRef = useRef<WaveFunction>("sin");
  const roomRadiusOscSpeedRef = useRef(0.3);
  const roomRadiusOscMinRef = useRef(80);
  const roomRadiusOscMaxRef = useRef(350);

  const tilingTypeOscEnabledRef = useRef(false);
  const tilingTypeOscFunctionRef = useRef<WaveFunction>("sawtooth");
  const tilingTypeOscSpeedRef = useRef(0.2);
  const tilingTypeOscMinRef = useRef(0);
  const tilingTypeOscMaxRef = useRef(80);

  // Sync time delay state → ref
  useEffect(() => { timeDelayRef.current = timeDelay; }, [timeDelay]);

  // Sync oscillator state → refs
  useEffect(() => { hueOscEnabledRef.current = hueOscEnabled; }, [hueOscEnabled]);
  useEffect(() => { hueOscFunctionRef.current = hueOscFunction; }, [hueOscFunction]);
  useEffect(() => { hueOscSpeedRef.current = hueOscSpeed; }, [hueOscSpeed]);
  useEffect(() => { hueOscMinRef.current = hueOscMin; }, [hueOscMin]);
  useEffect(() => { hueOscMaxRef.current = hueOscMax; }, [hueOscMax]);

  useEffect(() => { roomDepthOscEnabledRef.current = roomDepthOscEnabled; }, [roomDepthOscEnabled]);
  useEffect(() => { roomDepthOscFunctionRef.current = roomDepthOscFunction; }, [roomDepthOscFunction]);
  useEffect(() => { roomDepthOscSpeedRef.current = roomDepthOscSpeed; }, [roomDepthOscSpeed]);
  useEffect(() => { roomDepthOscMinRef.current = roomDepthOscMin; }, [roomDepthOscMin]);
  useEffect(() => { roomDepthOscMaxRef.current = roomDepthOscMax; }, [roomDepthOscMax]);

  useEffect(() => { tileRotationOscEnabledRef.current = tileRotationOscEnabled; }, [tileRotationOscEnabled]);
  useEffect(() => { tileRotationOscFunctionRef.current = tileRotationOscFunction; }, [tileRotationOscFunction]);
  useEffect(() => { tileRotationOscSpeedRef.current = tileRotationOscSpeed; }, [tileRotationOscSpeed]);
  useEffect(() => { tileRotationOscMinRef.current = tileRotationOscMin; }, [tileRotationOscMin]);
  useEffect(() => { tileRotationOscMaxRef.current = tileRotationOscMax; }, [tileRotationOscMax]);

  useEffect(() => { tileScaleOscEnabledRef.current = tileScaleOscEnabled; }, [tileScaleOscEnabled]);
  useEffect(() => { tileScaleOscFunctionRef.current = tileScaleOscFunction; }, [tileScaleOscFunction]);
  useEffect(() => { tileScaleOscSpeedRef.current = tileScaleOscSpeed; }, [tileScaleOscSpeed]);
  useEffect(() => { tileScaleOscMinRef.current = tileScaleOscMin; }, [tileScaleOscMin]);
  useEffect(() => { tileScaleOscMaxRef.current = tileScaleOscMax; }, [tileScaleOscMax]);

  useEffect(() => { roomHeightOscEnabledRef.current = roomHeightOscEnabled; }, [roomHeightOscEnabled]);
  useEffect(() => { roomHeightOscFunctionRef.current = roomHeightOscFunction; }, [roomHeightOscFunction]);
  useEffect(() => { roomHeightOscSpeedRef.current = roomHeightOscSpeed; }, [roomHeightOscSpeed]);
  useEffect(() => { roomHeightOscMinRef.current = roomHeightOscMin; }, [roomHeightOscMin]);
  useEffect(() => { roomHeightOscMaxRef.current = roomHeightOscMax; }, [roomHeightOscMax]);

  useEffect(() => { roomRadiusOscEnabledRef.current = roomRadiusOscEnabled; }, [roomRadiusOscEnabled]);
  useEffect(() => { roomRadiusOscFunctionRef.current = roomRadiusOscFunction; }, [roomRadiusOscFunction]);
  useEffect(() => { roomRadiusOscSpeedRef.current = roomRadiusOscSpeed; }, [roomRadiusOscSpeed]);
  useEffect(() => { roomRadiusOscMinRef.current = roomRadiusOscMin; }, [roomRadiusOscMin]);
  useEffect(() => { roomRadiusOscMaxRef.current = roomRadiusOscMax; }, [roomRadiusOscMax]);

  useEffect(() => { tilingTypeOscEnabledRef.current = tilingTypeOscEnabled; }, [tilingTypeOscEnabled]);
  useEffect(() => { tilingTypeOscFunctionRef.current = tilingTypeOscFunction; }, [tilingTypeOscFunction]);
  useEffect(() => { tilingTypeOscSpeedRef.current = tilingTypeOscSpeed; }, [tilingTypeOscSpeed]);
  useEffect(() => { tilingTypeOscMinRef.current = tilingTypeOscMin; }, [tilingTypeOscMin]);
  useEffect(() => { tilingTypeOscMaxRef.current = tilingTypeOscMax; }, [tilingTypeOscMax]);

  // Sync slider state → base refs (for when oscillators are off or user changes manually)
  useEffect(() => { tilingTypeBaseRef.current = tilingType; }, [tilingType]);
  useEffect(() => { roomRadiusBaseRef.current = roomRadius; }, [roomRadius]);
  useEffect(() => { roomHeightBaseRef.current = roomHeight; }, [roomHeight]);
  useEffect(() => { tileScaleBaseRef.current = tileScale; }, [tileScale]);
  useEffect(() => { edgeCurvatureBaseRef.current = edgeCurvature; }, [edgeCurvature]);
  useEffect(() => { tileRotationBaseRef.current = tileRotation; }, [tileRotation]);
  useEffect(() => { roomDepthBaseRef.current = roomDepth; }, [roomDepth]);

  // Base-value refs for expensive params (synced from slider state, used when oscillator is off)
  const tilingTypeBaseRef = useRef(3);
  const roomRadiusBaseRef = useRef(260);
  const roomHeightBaseRef = useRef(220);
  const tileScaleBaseRef = useRef(8);
  const edgeCurvatureBaseRef = useRef(0.5);
  const tileRotationBaseRef = useRef(0);
  const roomDepthBaseRef = useRef(500);

  // Last-rendered values (to detect when rebuild is actually needed)
  const lastRenderedRef = useRef({
    tilingType: 3, roomRadius: 260, roomHeight: 220,
    tileScale: 8, edgeCurvature: 0.5, roomDepth: 500,
  });

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const tiledMeshesRef = useRef<THREE.Mesh[]>([]);
  const lightsRef = useRef<THREE.Light[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastRebuildRef = useRef(0);
  const rebuildFnRef = useRef<((tiling: number, radius: number, height: number, scale: number, curvature: number, depth: number) => void) | null>(null);

  useEffect(() => {
    if (window.location.search.includes("preview")) {
      setIsPreview(true);
      setShowControls(false);
    }
  }, []);

  // Initialize Three.js scene (once)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = brightnessRef.current;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080818);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.5,
      5000,
    );
    camera.position.set(0, 70, 100);
    camera.lookAt(0, 70, -200);
    cameraRef.current = camera;

    const material = createTileMaterial(hueRef.current, saturationRef.current);
    materialRef.current = material;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Animation loop — reads cheap params from refs every frame
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const mat = materialRef.current;
      const r = rendererRef.current;
      if (!mat || !r) return;

      timeRef.current += 0.016;
      const t = timeRef.current;

      // Push time and delay uniforms to shader
      mat.uniforms.uTime.value = t;
      mat.uniforms.uTimeDelay.value = timeDelayRef.current;

      // Push hue oscillator params to shader
      mat.uniforms.uHueOscEnabled.value = hueOscEnabledRef.current;
      if (hueOscEnabledRef.current) {
        mat.uniforms.uHueOscFunction.value = waveToIndex[hueOscFunctionRef.current];
        mat.uniforms.uHueOscSpeed.value = hueOscSpeedRef.current;
        mat.uniforms.uHueOscMin.value = hueOscMinRef.current;
        mat.uniforms.uHueOscMax.value = hueOscMaxRef.current;
      }

      // Expensive oscillators — compute effective values, rebuild only when changed
      // Throttled to ~5 rebuilds/sec
      const now = performance.now();
      if (now - lastRebuildRef.current > 200) {
        const getOsc = (enabled: boolean, baseVal: number, fnRef: WaveFunction, speed: number, min: number, max: number, round: boolean) => {
          if (!enabled) return baseVal;
          const wave = waveFunctions[fnRef];
          const norm = (wave(t * speed) + 1) / 2;
          const val = min + norm * (max - min);
          return round ? Math.round(val) : val;
        };

        const effTilingType = getOsc(tilingTypeOscEnabledRef.current, tilingTypeBaseRef.current, tilingTypeOscFunctionRef.current, tilingTypeOscSpeedRef.current, tilingTypeOscMinRef.current, tilingTypeOscMaxRef.current, true);
        const effRoomRadius = getOsc(roomRadiusOscEnabledRef.current, roomRadiusBaseRef.current, roomRadiusOscFunctionRef.current, roomRadiusOscSpeedRef.current, roomRadiusOscMinRef.current, roomRadiusOscMaxRef.current, true);
        const effRoomHeight = getOsc(roomHeightOscEnabledRef.current, roomHeightBaseRef.current, roomHeightOscFunctionRef.current, roomHeightOscSpeedRef.current, roomHeightOscMinRef.current, roomHeightOscMaxRef.current, true);
        const effTileScale = getOsc(tileScaleOscEnabledRef.current, tileScaleBaseRef.current, tileScaleOscFunctionRef.current, tileScaleOscSpeedRef.current, tileScaleOscMinRef.current, tileScaleOscMaxRef.current, false);
        const effRoomDepth = getOsc(roomDepthOscEnabledRef.current, roomDepthBaseRef.current, roomDepthOscFunctionRef.current, roomDepthOscSpeedRef.current, roomDepthOscMinRef.current, roomDepthOscMaxRef.current, true);
        const effEdgeCurvature = edgeCurvatureBaseRef.current;

        const last = lastRenderedRef.current;
        if (effTilingType !== last.tilingType || effRoomRadius !== last.roomRadius ||
            effRoomHeight !== last.roomHeight || effTileScale !== last.tileScale ||
            effEdgeCurvature !== last.edgeCurvature ||
            effRoomDepth !== last.roomDepth) {
          rebuildFnRef.current?.(effTilingType, effRoomRadius, effRoomHeight, effTileScale, effEdgeCurvature, effRoomDepth);
          lastRebuildRef.current = now;
        }
      }

      // Push tile rotation oscillator params to shader
      mat.uniforms.uTileRotOscEnabled.value = tileRotationOscEnabledRef.current;
      mat.uniforms.uTileRotBase.value = tileRotationBaseRef.current;
      if (tileRotationOscEnabledRef.current) {
        mat.uniforms.uTileRotOscFunction.value = waveToIndex[tileRotationOscFunctionRef.current];
        mat.uniforms.uTileRotOscSpeed.value = tileRotationOscSpeedRef.current;
        mat.uniforms.uTileRotOscMin.value = tileRotationOscMinRef.current;
        mat.uniforms.uTileRotOscMax.value = tileRotationOscMaxRef.current;
      }

      mat.uniforms.uHue.value = hueRef.current;
      mat.uniforms.uSaturation.value = saturationRef.current;
      r.toneMappingExposure = brightnessRef.current;
      r.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      material.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    };
  }, []);

  // Rebuild geometry function — called from animation loop, reads explicit params
  const doRebuild = useCallback((
    pTilingType: number, pRoomRadius: number, pRoomHeight: number,
    pTileScale: number, pEdgeCurvature: number, pRoomDepth: number,
  ) => {
    const scene = sceneRef.current;
    const material = materialRef.current;
    if (!scene || !material) return;

    // Remove old tiled meshes
    for (const mesh of tiledMeshesRef.current) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    tiledMeshesRef.current = [];

    // Remove old lights
    for (const light of lightsRef.current) {
      scene.remove(light);
    }
    lightsRef.current = [];

    scene.fog = null;

    // Lighting
    const ambient = new THREE.AmbientLight(0x667799, 1.0);
    scene.add(ambient);
    lightsRef.current.push(ambient);

    const hemiLight = new THREE.HemisphereLight(0xbbccee, 0x445566, 0.8);
    scene.add(hemiLight);
    lightsRef.current.push(hemiLight);

    const maxDim = Math.max(pRoomRadius, pRoomDepth);
    const centralLight = new THREE.PointLight(0xffeedd, 3, maxDim * 3, 1.2);
    centralLight.position.set(0, pRoomHeight * 0.85, 0);
    scene.add(centralLight);
    lightsRef.current.push(centralLight);

    const numLightsZ = Math.max(3, Math.ceil(pRoomDepth / 200));
    for (let zi = 0; zi < numLightsZ; zi++) {
      const zPos = -pRoomDepth / 2 + (zi + 0.5) * (pRoomDepth / numLightsZ);
      for (let ai = 0; ai < 4; ai++) {
        const a = (ai / 4) * Math.PI * 2;
        const pl = new THREE.PointLight(0xddeeff, 1.5, maxDim * 2, 1.5);
        pl.position.set(Math.sin(a) * pRoomRadius * 0.5, pRoomHeight * 0.4, zPos + Math.cos(a) * pRoomRadius * 0.5);
        scene.add(pl);
        lightsRef.current.push(pl);
      }
    }

    const fillZPositions = [0, -pRoomDepth * 0.3, pRoomDepth * 0.3];
    for (const fz of fillZPositions) {
      const fl = new THREE.PointLight(0xccbbaa, 0.8, maxDim * 2, 1.8);
      fl.position.set(0, pRoomHeight * 0.15, fz);
      scene.add(fl);
      lightsRef.current.push(fl);
    }

    // Build rectangular hall
    const roomWidth = pRoomRadius * 2;
    const halfW = roomWidth / 2;
    const halfD = pRoomDepth / 2;

    const addSurface = (w: number, h: number, transform: THREE.Matrix4) => {
      const geo = createTilingWallGeometry(
        pTilingType, w, h, pTileScale, transform,
        pEdgeCurvature,
      );
      const mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);
      tiledMeshesRef.current.push(mesh);
    };

    // Floor
    const floorT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    addSurface(roomWidth, pRoomDepth, floorT);

    // Ceiling
    const ceilT = new THREE.Matrix4();
    ceilT.multiply(new THREE.Matrix4().makeTranslation(0, pRoomHeight, 0));
    ceilT.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    addSurface(roomWidth, pRoomDepth, ceilT);

    // Left wall
    const leftT = new THREE.Matrix4();
    leftT.multiply(new THREE.Matrix4().makeTranslation(-halfW, pRoomHeight / 2, 0));
    leftT.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    addSurface(pRoomDepth, pRoomHeight, leftT);

    // Right wall
    const rightT = new THREE.Matrix4();
    rightT.multiply(new THREE.Matrix4().makeTranslation(halfW, pRoomHeight / 2, 0));
    rightT.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
    addSurface(pRoomDepth, pRoomHeight, rightT);

    // Back wall
    const backT = new THREE.Matrix4();
    backT.multiply(new THREE.Matrix4().makeTranslation(0, pRoomHeight / 2, -halfD));
    addSurface(roomWidth, pRoomHeight, backT);

    // Front wall
    const frontT = new THREE.Matrix4();
    frontT.multiply(new THREE.Matrix4().makeTranslation(0, pRoomHeight / 2, halfD));
    frontT.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    addSurface(roomWidth, pRoomHeight, frontT);

    // Track what we rendered
    lastRenderedRef.current = {
      tilingType: pTilingType, roomRadius: pRoomRadius, roomHeight: pRoomHeight,
      tileScale: pTileScale, edgeCurvature: pEdgeCurvature, roomDepth: pRoomDepth,
    };

    // Update focal point to back wall center
    if (material.uniforms.uFocalPoint) {
      material.uniforms.uFocalPoint.value.set(0, pRoomHeight / 2, -pRoomDepth / 2);
    }
  }, []);

  // Store rebuild fn in a ref so the animation loop (stable useEffect) can call it
  rebuildFnRef.current = doRebuild;

  // Rebuild when slider state changes (manual user interaction)
  useEffect(() => {
    doRebuild(tilingType, roomRadius, roomHeight, tileScale, edgeCurvature, roomDepth);
  }, [tilingType, roomRadius, roomHeight, roomDepth, tileScale, edgeCurvature, doRebuild]);

  // Preview mode message handler
  useEffect(() => {
    if (!isPreview) return;
    const handler = (e: MessageEvent) => {
      // Static scene — support the protocol
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

  // Cheap param handlers — update ref + display state
  const onHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    hueRef.current = v;
    setHueDisplay(v);
  }, []);

  const onSaturationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    saturationRef.current = v;
    setSaturationDisplay(v);
  }, []);

  const onBrightnessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    brightnessRef.current = v;
    setBrightnessDisplay(v);
  }, []);

  const clearAllOscillators = useCallback(() => {
    setHueOscEnabled(false);
    setRoomDepthOscEnabled(false);
    setTileRotationOscEnabled(false);
    setTileScaleOscEnabled(false);
    setRoomHeightOscEnabled(false);
    setRoomRadiusOscEnabled(false);
    setTilingTypeOscEnabled(false);
  }, []);

  const blockStyle: React.CSSProperties = { marginBottom: "20px" };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: "8px", fontSize: "14px", color: "#fff" };
  const oscDetStyle: React.CSSProperties = { marginBottom: "15px" };
  const oscSumStyle: React.CSSProperties = { cursor: "pointer", padding: "8px 0", color: "#fff", fontSize: "13px" };
  const oscBodyStyle: React.CSSProperties = { padding: "10px 0 0 10px" };
  const oscLblStyle: React.CSSProperties = { display: "block", marginBottom: "8px", fontSize: "12px" };
  const oscCheckStyle: React.CSSProperties = { display: "block", marginBottom: "8px", fontSize: "12px" };
  const oscSelectStyle: React.CSSProperties = { marginLeft: "8px", background: "#222", color: "#fff", border: "1px solid #444", padding: "4px", borderRadius: "4px" };

  const waveOptions = (
    <>
      <option value="sin">Sin</option>
      <option value="cos">Cos</option>
      <option value="abs-sin">Abs Sin</option>
      <option value="square">Square</option>
      <option value="sawtooth">Sawtooth</option>
      <option value="triangle">Triangle</option>
    </>
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#080818",
      }}
    >
      {!isPreview && showControls && (
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
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #444" }}>
            <a href="/" style={{ fontSize: "12px", color: "#66ccff", textDecoration: "none" }}>
              &larr; Gallery
            </a>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>
                Expansive Room
              </h2>
            </div>
          </div>

          {/* === Parameter Sliders === */}

          <div style={blockStyle}>
            <label style={labelStyle}>Tiling Type: {tilingType}</label>
            <input type="range" min="0" max="80" step="1" value={tilingType} onChange={(e) => setTilingType(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Room Width: {roomRadius * 2}</label>
            <input type="range" min="50" max="400" step="10" value={roomRadius} onChange={(e) => setRoomRadius(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Room Height: {roomHeight}</label>
            <input type="range" min="50" max="400" step="10" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Room Depth: {roomDepth}</label>
            <input type="range" min="100" max="4000" step="50" value={roomDepth} onChange={(e) => setRoomDepth(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Hue: {hueDisplay.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.01" value={hueDisplay} onChange={onHueChange} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Tile Scale: {tileScale.toFixed(1)}</label>
            <input type="range" min="2" max="20" step="0.5" value={tileScale} onChange={(e) => setTileScale(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Edge Curvature: {edgeCurvature.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.05" value={edgeCurvature} onChange={(e) => setEdgeCurvature(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Tile Rotation: {Math.round(tileRotation * 180 / Math.PI)}&deg;</label>
            <input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={tileRotation} onChange={(e) => setTileRotation(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Brightness: {brightnessDisplay.toFixed(1)}</label>
            <input type="range" min="0.3" max="3" step="0.1" value={brightnessDisplay} onChange={onBrightnessChange} style={{ width: "100%" }} />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>Saturation: {saturationDisplay.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.05" value={saturationDisplay} onChange={onSaturationChange} style={{ width: "100%" }} />
          </div>

          {/* === Oscillators Section === */}
          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#66ccff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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

            {/* Time Delay (ripple) */}
            <div style={blockStyle}>
              <label style={labelStyle}>Time Delay: {timeDelay.toFixed(3)}</label>
              <input type="range" min="0" max="0.05" step="0.001" value={timeDelay} onChange={(e) => setTimeDelay(Number(e.target.value))} style={{ width: "100%" }} />
            </div>

            {/* Hue Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Hue Oscillator {hueOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={hueOscEnabled} onChange={(e) => setHueOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={hueOscFunction} onChange={(e) => setHueOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {hueOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {hueOscMin.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={hueOscMin} onChange={(e) => setHueOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {hueOscMax.toFixed(2)}
                  <input type="range" min="0" max="1" step="0.01" value={hueOscMax} onChange={(e) => setHueOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Tiling Type Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Tiling Type Oscillator {tilingTypeOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={tilingTypeOscEnabled} onChange={(e) => setTilingTypeOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={tilingTypeOscFunction} onChange={(e) => setTilingTypeOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {tilingTypeOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="2" step="0.05" value={tilingTypeOscSpeed} onChange={(e) => setTilingTypeOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {tilingTypeOscMin}
                  <input type="range" min="0" max="80" step="1" value={tilingTypeOscMin} onChange={(e) => setTilingTypeOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {tilingTypeOscMax}
                  <input type="range" min="0" max="80" step="1" value={tilingTypeOscMax} onChange={(e) => setTilingTypeOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Room Width Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Room Width Oscillator {roomRadiusOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={roomRadiusOscEnabled} onChange={(e) => setRoomRadiusOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={roomRadiusOscFunction} onChange={(e) => setRoomRadiusOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {roomRadiusOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={roomRadiusOscSpeed} onChange={(e) => setRoomRadiusOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {roomRadiusOscMin}
                  <input type="range" min="50" max="400" step="10" value={roomRadiusOscMin} onChange={(e) => setRoomRadiusOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {roomRadiusOscMax}
                  <input type="range" min="50" max="400" step="10" value={roomRadiusOscMax} onChange={(e) => setRoomRadiusOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Room Height Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Room Height Oscillator {roomHeightOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={roomHeightOscEnabled} onChange={(e) => setRoomHeightOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={roomHeightOscFunction} onChange={(e) => setRoomHeightOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {roomHeightOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={roomHeightOscSpeed} onChange={(e) => setRoomHeightOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {roomHeightOscMin}
                  <input type="range" min="50" max="400" step="10" value={roomHeightOscMin} onChange={(e) => setRoomHeightOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {roomHeightOscMax}
                  <input type="range" min="50" max="400" step="10" value={roomHeightOscMax} onChange={(e) => setRoomHeightOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Tile Scale Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Tile Scale Oscillator {tileScaleOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={tileScaleOscEnabled} onChange={(e) => setTileScaleOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={tileScaleOscFunction} onChange={(e) => setTileScaleOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {tileScaleOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={tileScaleOscSpeed} onChange={(e) => setTileScaleOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {tileScaleOscMin.toFixed(1)}
                  <input type="range" min="2" max="20" step="0.5" value={tileScaleOscMin} onChange={(e) => setTileScaleOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {tileScaleOscMax.toFixed(1)}
                  <input type="range" min="2" max="20" step="0.5" value={tileScaleOscMax} onChange={(e) => setTileScaleOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Tile Rotation Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Tile Rotation Oscillator {tileRotationOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={tileRotationOscEnabled} onChange={(e) => setTileRotationOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={tileRotationOscFunction} onChange={(e) => setTileRotationOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {tileRotationOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={tileRotationOscSpeed} onChange={(e) => setTileRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {Math.round(tileRotationOscMin * 180 / Math.PI)}&deg;
                  <input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={tileRotationOscMin} onChange={(e) => setTileRotationOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {Math.round(tileRotationOscMax * 180 / Math.PI)}&deg;
                  <input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={tileRotationOscMax} onChange={(e) => setTileRotationOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>

            {/* Room Depth Oscillator */}
            <details style={oscDetStyle}>
              <summary style={oscSumStyle}>
                Room Depth Oscillator {roomDepthOscEnabled ? "\u2713" : ""}
              </summary>
              <div style={oscBodyStyle}>
                <label style={oscCheckStyle}>
                  <input type="checkbox" checked={roomDepthOscEnabled} onChange={(e) => setRoomDepthOscEnabled(e.target.checked)} />
                  {" "}Enabled
                </label>
                <label style={oscLblStyle}>
                  Function:
                  <select value={roomDepthOscFunction} onChange={(e) => setRoomDepthOscFunction(e.target.value as WaveFunction)} style={oscSelectStyle}>
                    {waveOptions}
                  </select>
                </label>
                <label style={oscLblStyle}>
                  Speed: {roomDepthOscSpeed.toFixed(2)}
                  <input type="range" min="0.05" max="3" step="0.05" value={roomDepthOscSpeed} onChange={(e) => setRoomDepthOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={oscLblStyle}>
                  Min: {roomDepthOscMin}
                  <input type="range" min="100" max="4000" step="50" value={roomDepthOscMin} onChange={(e) => setRoomDepthOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {roomDepthOscMax}
                  <input type="range" min="100" max="4000" step="50" value={roomDepthOscMax} onChange={(e) => setRoomDepthOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
              </div>
            </details>
          </div>
        </div>
      )}

      {!isPreview && (
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            top: "10px",
            left: showControls ? "290px" : "10px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "10px 15px",
            cursor: "pointer",
            fontSize: "14px",
            zIndex: 10,
            transition: "left 0.3s ease",
          }}
        >
          {showControls ? "\u2190" : "\u2192"}
        </button>
      )}
    </div>
  );
}
