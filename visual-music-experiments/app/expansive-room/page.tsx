"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Shape radius functions (polar: angle → radius)
// These define tile shapes as polar curves, sampled to create geometry.
// The continuous shape parameter interpolates between adjacent functions.
const shapeRadiusFns = [
  // 0: Circle
  () => 1,
  // 1: Rounded square (superellipse p=4)
  (theta: number) => {
    const c = Math.abs(Math.cos(theta));
    const s = Math.abs(Math.sin(theta));
    return Math.pow(Math.pow(c, 4) + Math.pow(s, 4), -1 / 4);
  },
  // 2: Diamond (L1 unit ball)
  (theta: number) => 1 / (Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta)) + 0.001),
  // 3: Hexagon
  (theta: number) => {
    const sector = ((theta % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
    return Math.cos(Math.PI / 6) / Math.cos(sector);
  },
  // 4: 6-point star
  (theta: number) => 0.55 + 0.45 * Math.cos(3 * theta),
  // 5: Cross / plus
  (theta: number) => {
    const c = Math.cos(2 * theta);
    return 0.5 + 0.5 * c * c;
  },
];

function getShapeRadius(shapeValue: number, theta: number): number {
  const maxIdx = shapeRadiusFns.length - 1;
  const clamped = Math.max(0, Math.min(maxIdx, shapeValue));
  const i = Math.floor(clamped);
  const frac = clamped - i;
  const r1 = shapeRadiusFns[i](theta);
  if (i >= maxIdx || frac === 0) return r1;
  const r2 = shapeRadiusFns[i + 1](theta);
  return r1 * (1 - frac) + r2 * frac;
}

function createTileGeometry(shapeValue: number, size: number): THREE.BufferGeometry {
  const numPoints = 64;
  const shape = new THREE.Shape();
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * Math.PI * 2;
    const r = getShapeRadius(shapeValue, theta) * size;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const SHAPE_LABELS = ["Circle", "Rounded Square", "Diamond", "Hexagon", "Star", "Cross"];

function getShapeLabel(v: number): string {
  const i = Math.floor(Math.max(0, Math.min(v, shapeRadiusFns.length - 1)));
  const j = Math.min(i + 1, shapeRadiusFns.length - 1);
  const frac = v - i;
  if (frac < 0.01) return SHAPE_LABELS[i];
  return `${SHAPE_LABELS[i]} → ${SHAPE_LABELS[j]}`;
}

export default function ExpansiveRoom() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [roomWidth, setRoomWidth] = useState(40);
  const [roomHeight, setRoomHeight] = useState(80);
  const [roomDepth, setRoomDepth] = useState(100);
  const [shapeValue, setShapeValue] = useState(0);

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

  // Scene persists, room rebuilds on param change
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);

  // Initialize scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 40, 0);
    camera.lookAt(0, 40, -50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    scene.add(new THREE.HemisphereLight(0x8888ff, 0x444422, 0.6));

    const lightConfigs = [
      { pos: [0, 40, 0], color: 0xeeeeff, intensity: 5 },
      { pos: [0, 30, -60], color: 0xccddff, intensity: 3 },
      { pos: [0, 30, 60], color: 0xccddff, intensity: 3 },
      { pos: [-60, 30, 0], color: 0xffddcc, intensity: 3 },
      { pos: [60, 30, 0], color: 0xffddcc, intensity: 3 },
    ];
    for (const lc of lightConfigs) {
      const light = new THREE.PointLight(lc.color, lc.intensity, 300);
      light.position.set(lc.pos[0], lc.pos[1], lc.pos[2]);
      scene.add(light);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Rebuild room when params change
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    // Remove old room
    if (roomGroupRef.current) {
      roomGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      scene.remove(roomGroupRef.current);
    }

    const roomGroup = new THREE.Group();
    roomGroupRef.current = roomGroup;

    const h = roomHeight;
    const wingW = roomWidth;                  // corridor width (visible width of each arm)
    const wingLenX = 100;                     // east/west arm length from center
    const wingLenZ = roomDepth;               // north/south arm length from center
    const halfWing = wingW / 2;
    const floorY = 0;
    const ceilY = h;
    const midY = h / 2;

    // Center camera vertically
    camera.position.set(0, midY, 0);
    camera.lookAt(0, midY, -50);

    const tileSize = 3;
    const tileGeo = createTileGeometry(shapeValue, tileSize * 0.42);

    function createPatternedWall(
      surfaceW: number,
      surfaceH: number,
      transform: THREE.Matrix4,
      hueBase: number,
      saturation: number,
    ) {
      const tilesU = Math.ceil(surfaceW / tileSize);
      const tilesV = Math.ceil(surfaceH / tileSize);
      const count = tilesU * tilesV;

      const material = new THREE.MeshStandardMaterial({
        vertexColors: false,
        metalness: 0.3,
        roughness: 0.5,
        side: THREE.DoubleSide,
        emissive: new THREE.Color().setHSL(hueBase, saturation, 0.15),
        emissiveIntensity: 0.4,
      });

      const mesh = new THREE.InstancedMesh(tileGeo, material, count);
      const colorArr = new Float32Array(count * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);

      const dummy = new THREE.Object3D();
      let idx = 0;

      for (let u = 0; u < tilesU; u++) {
        for (let v = 0; v < tilesV; v++) {
          const lx = (u - tilesU / 2 + 0.5) * tileSize;
          const ly = (v - tilesV / 2 + 0.5) * tileSize;

          dummy.position.set(lx, ly, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();

          const finalMatrix = new THREE.Matrix4().multiplyMatrices(transform, dummy.matrix);
          mesh.setMatrixAt(idx, finalMatrix);

          const hue = (hueBase + (u + v * 3) * 0.015) % 1;
          const lightness = 0.45 + ((u + v) % 3) * 0.08;
          const color = new THREE.Color().setHSL(hue, saturation, lightness);
          mesh.setColorAt(idx, color);
          idx++;
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      roomGroup.add(mesh);
    }

    function m4(px: number, py: number, pz: number, rx: number, ry: number, rz: number): THREE.Matrix4 {
      const obj = new THREE.Object3D();
      obj.position.set(px, py, pz);
      obj.rotation.set(rx, ry, rz);
      obj.updateMatrix();
      return obj.matrix.clone();
    }

    // --- Floor (5 cross segments) ---
    // Center
    createPatternedWall(wingW, wingW,
      m4(0, floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);
    // North
    createPatternedWall(wingW, wingLenZ,
      m4(0, floorY, -(halfWing + wingLenZ / 2), -Math.PI / 2, 0, 0), 0.6, 0.5);
    // South
    createPatternedWall(wingW, wingLenZ,
      m4(0, floorY, (halfWing + wingLenZ / 2), -Math.PI / 2, 0, 0), 0.6, 0.5);
    // East
    createPatternedWall(wingLenX, wingW,
      m4((halfWing + wingLenX / 2), floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);
    // West
    createPatternedWall(wingLenX, wingW,
      m4(-(halfWing + wingLenX / 2), floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);

    // --- Ceiling (5 cross segments) ---
    createPatternedWall(wingW, wingW,
      m4(0, ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(wingW, wingLenZ,
      m4(0, ceilY, -(halfWing + wingLenZ / 2), Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(wingW, wingLenZ,
      m4(0, ceilY, (halfWing + wingLenZ / 2), Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(wingLenX, wingW,
      m4((halfWing + wingLenX / 2), ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(wingLenX, wingW,
      m4(-(halfWing + wingLenX / 2), ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);

    // --- Wing side walls ---
    // North wing
    const nCtr = -(halfWing + wingLenZ / 2);
    createPatternedWall(wingLenZ, h, m4(-halfWing, midY, nCtr, 0, Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(wingLenZ, h, m4(halfWing, midY, nCtr, 0, -Math.PI / 2, 0), 0.55, 0.6);
    // North end
    createPatternedWall(wingW, h, m4(0, midY, -(halfWing + wingLenZ), 0, 0, 0), 0.5, 0.7);

    // South wing
    const sCtr = (halfWing + wingLenZ / 2);
    createPatternedWall(wingLenZ, h, m4(-halfWing, midY, sCtr, 0, Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(wingLenZ, h, m4(halfWing, midY, sCtr, 0, -Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(wingW, h, m4(0, midY, (halfWing + wingLenZ), 0, Math.PI, 0), 0.5, 0.7);

    // East wing
    const eCtr = (halfWing + wingLenX / 2);
    createPatternedWall(wingLenX, h, m4(eCtr, midY, -halfWing, 0, 0, 0), 0.0, 0.6);
    createPatternedWall(wingLenX, h, m4(eCtr, midY, halfWing, 0, Math.PI, 0), 0.0, 0.6);
    createPatternedWall(wingW, h, m4((halfWing + wingLenX), midY, 0, 0, -Math.PI / 2, 0), 0.05, 0.7);

    // West wing
    const wCtr = -(halfWing + wingLenX / 2);
    createPatternedWall(wingLenX, h, m4(wCtr, midY, -halfWing, 0, 0, 0), 0.0, 0.6);
    createPatternedWall(wingLenX, h, m4(wCtr, midY, halfWing, 0, Math.PI, 0), 0.0, 0.6);
    createPatternedWall(wingW, h, m4(-(halfWing + wingLenX), midY, 0, 0, Math.PI / 2, 0), 0.05, 0.7);

    // --- Inner corner walls (8 segments filling cross junctions) ---
    // NE
    createPatternedWall(wingLenX, h, m4(halfWing + wingLenX / 2, midY, -halfWing, 0, 0, 0), 0.15, 0.5);
    createPatternedWall(wingLenZ, h, m4(halfWing, midY, -(halfWing + wingLenZ / 2), 0, -Math.PI / 2, 0), 0.15, 0.5);
    // NW
    createPatternedWall(wingLenX, h, m4(-(halfWing + wingLenX / 2), midY, -halfWing, 0, 0, 0), 0.85, 0.5);
    createPatternedWall(wingLenZ, h, m4(-halfWing, midY, -(halfWing + wingLenZ / 2), 0, Math.PI / 2, 0), 0.85, 0.5);
    // SE
    createPatternedWall(wingLenX, h, m4(halfWing + wingLenX / 2, midY, halfWing, 0, Math.PI, 0), 0.15, 0.5);
    createPatternedWall(wingLenZ, h, m4(halfWing, midY, halfWing + wingLenZ / 2, 0, -Math.PI / 2, 0), 0.15, 0.5);
    // SW
    createPatternedWall(wingLenX, h, m4(-(halfWing + wingLenX / 2), midY, halfWing, 0, Math.PI, 0), 0.85, 0.5);
    createPatternedWall(wingLenZ, h, m4(-halfWing, midY, halfWing + wingLenZ / 2, 0, Math.PI / 2, 0), 0.85, 0.5);

    scene.add(roomGroup);
    renderer.render(scene, camera);

  }, [roomWidth, roomHeight, roomDepth, shapeValue]);

  const sliderStyle = { width: "100%", cursor: "pointer" };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: "6px", fontSize: "13px", color: "#fff" };
  const blockStyle: React.CSSProperties = { marginBottom: "15px" };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

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
          <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>Expansive Room</h2>
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>
            Shape: {shapeValue.toFixed(2)} — {getShapeLabel(shapeValue)}
          </label>
          <input type="range" min="0" max={shapeRadiusFns.length - 1} step="0.01" value={shapeValue}
            onChange={(e) => setShapeValue(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Room Width: {roomWidth}</label>
          <input type="range" min="10" max="200" step="5" value={roomWidth}
            onChange={(e) => setRoomWidth(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Room Height: {roomHeight}</label>
          <input type="range" min="20" max="200" step="10" value={roomHeight}
            onChange={(e) => setRoomHeight(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Room Depth: {roomDepth}</label>
          <input type="range" min="20" max="500" step="10" value={roomDepth}
            onChange={(e) => setRoomDepth(Number(e.target.value))} style={sliderStyle} />
        </div>
      </div>

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
