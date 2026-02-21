"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { createTilingWallGeometry } from "./tiling-geometry";

// HSL-to-RGB shader function + tile coloring with lighting
const vertexShader = /* glsl */ `
  #include <common>
  #include <lights_pars_begin>

  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vColor = color;
    vec3 transformedNormal = normalMatrix * normal;
    vNormal = normalize(transformedNormal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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

    // Compute final hue from uniform + per-tile offset
    float hue = fract(uHue + aspectFraction * 0.15);
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

    // Rough tone mapping to keep colors from blowing out
    finalColor = finalColor / (finalColor + vec3(1.0));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createTileMaterial(hue: number, saturation: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsLib.lights,
      uHue: { value: hue },
      uSaturation: { value: saturation },
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
  const [roomRadius, setRoomRadius] = useState(200);
  const [roomHeight, setRoomHeight] = useState(200);
  const [tileScale, setTileScale] = useState(8);
  const [edgeCurvature, setEdgeCurvature] = useState(0.5);
  const [tileRotation, setTileRotation] = useState(0);
  const [roomDepth, setRoomDepth] = useState(400);

  // Cheap params (uniform-driven) — refs for instant updates, state for UI display
  const hueRef = useRef(0.58);
  const saturationRef = useRef(0.55);
  const brightnessRef = useRef(1.2);
  const [hueDisplay, setHueDisplay] = useState(0.58);
  const [saturationDisplay, setSaturationDisplay] = useState(0.55);
  const [brightnessDisplay, setBrightnessDisplay] = useState(1.2);

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const tiledMeshesRef = useRef<THREE.Mesh[]>([]);
  const lightsRef = useRef<THREE.Light[]>([]);
  const rafRef = useRef<number>(0);

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
    camera.position.set(0, 40, 100);
    camera.lookAt(0, 40, -200);
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

  // Rebuild geometry when expensive params change
  useEffect(() => {
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

    const maxDim = Math.max(roomRadius, roomDepth);
    const centralLight = new THREE.PointLight(0xffeedd, 3, maxDim * 3, 1.2);
    centralLight.position.set(0, roomHeight * 0.85, 0);
    scene.add(centralLight);
    lightsRef.current.push(centralLight);

    const numLightsZ = Math.max(3, Math.ceil(roomDepth / 200));
    for (let zi = 0; zi < numLightsZ; zi++) {
      const zPos = -roomDepth / 2 + (zi + 0.5) * (roomDepth / numLightsZ);
      for (let ai = 0; ai < 4; ai++) {
        const a = (ai / 4) * Math.PI * 2;
        const pl = new THREE.PointLight(0xddeeff, 1.5, maxDim * 2, 1.5);
        pl.position.set(Math.sin(a) * roomRadius * 0.5, roomHeight * 0.4, zPos + Math.cos(a) * roomRadius * 0.5);
        scene.add(pl);
        lightsRef.current.push(pl);
      }
    }

    const fillZPositions = [0, -roomDepth * 0.3, roomDepth * 0.3];
    for (const fz of fillZPositions) {
      const fl = new THREE.PointLight(0xccbbaa, 0.8, maxDim * 2, 1.8);
      fl.position.set(0, roomHeight * 0.15, fz);
      scene.add(fl);
      lightsRef.current.push(fl);
    }

    // Build rectangular hall
    const roomWidth = roomRadius * 2;
    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    const addSurface = (w: number, h: number, transform: THREE.Matrix4) => {
      const geo = createTilingWallGeometry(
        tilingType, w, h, tileScale, transform,
        edgeCurvature, tileRotation,
      );
      const mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);
      tiledMeshesRef.current.push(mesh);
    };

    // Floor
    const floorT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    addSurface(roomWidth, roomDepth, floorT);

    // Ceiling
    const ceilT = new THREE.Matrix4();
    ceilT.multiply(new THREE.Matrix4().makeTranslation(0, roomHeight, 0));
    ceilT.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    addSurface(roomWidth, roomDepth, ceilT);

    // Left wall
    const leftT = new THREE.Matrix4();
    leftT.multiply(new THREE.Matrix4().makeTranslation(-halfW, roomHeight / 2, 0));
    leftT.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    addSurface(roomDepth, roomHeight, leftT);

    // Right wall
    const rightT = new THREE.Matrix4();
    rightT.multiply(new THREE.Matrix4().makeTranslation(halfW, roomHeight / 2, 0));
    rightT.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
    addSurface(roomDepth, roomHeight, rightT);

    // Back wall
    const backT = new THREE.Matrix4();
    backT.multiply(new THREE.Matrix4().makeTranslation(0, roomHeight / 2, -halfD));
    addSurface(roomWidth, roomHeight, backT);

    // Front wall
    const frontT = new THREE.Matrix4();
    frontT.multiply(new THREE.Matrix4().makeTranslation(0, roomHeight / 2, halfD));
    frontT.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    addSurface(roomWidth, roomHeight, frontT);
  }, [tilingType, roomRadius, roomHeight, roomDepth, tileScale, edgeCurvature, tileRotation]);

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

  const sliderStyle = { width: "100%", cursor: "pointer" };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    color: "#fff",
  };
  const blockStyle: React.CSSProperties = { marginBottom: "15px" };

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
            top: "20px",
            left: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "20px",
            borderRadius: "8px",
            minWidth: "250px",
            maxHeight: "90vh",
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #444" }}>
            <a href="/" style={{ fontSize: "12px", color: "#4488ff", textDecoration: "none" }}>
              &larr; Gallery
            </a>
            <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>
              Expansive Room
            </h2>
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Tiling Type: {tilingType}
            </label>
            <input
              type="range"
              min="0"
              max="80"
              step="1"
              value={tilingType}
              onChange={(e) => setTilingType(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Hue: {hueDisplay.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={hueDisplay}
              onChange={onHueChange}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Room Radius: {roomRadius}
            </label>
            <input
              type="range"
              min="50"
              max="400"
              step="10"
              value={roomRadius}
              onChange={(e) => setRoomRadius(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Room Height: {roomHeight}
            </label>
            <input
              type="range"
              min="50"
              max="400"
              step="10"
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Tile Scale: {tileScale.toFixed(1)}
            </label>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={tileScale}
              onChange={(e) => setTileScale(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Edge Curvature: {edgeCurvature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={edgeCurvature}
              onChange={(e) => setEdgeCurvature(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Tile Rotation: {Math.round(tileRotation * 180 / Math.PI)}&deg;
            </label>
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.01"
              value={tileRotation}
              onChange={(e) => setTileRotation(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Room Depth: {roomDepth}
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="50"
              value={roomDepth}
              onChange={(e) => setRoomDepth(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Brightness: {brightnessDisplay.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={brightnessDisplay}
              onChange={onBrightnessChange}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Saturation: {saturationDisplay.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={saturationDisplay}
              onChange={onSaturationChange}
              style={sliderStyle}
            />
          </div>
        </div>
      )}

      {!isPreview && (
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            top: showControls ? "auto" : "20px",
            bottom: showControls ? "20px" : "auto",
            left: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "10px 15px",
            cursor: "pointer",
            fontSize: "14px",
            zIndex: 10,
          }}
        >
          {showControls ? "Hide Controls" : "Show Controls"}
        </button>
      )}
    </div>
  );
}
