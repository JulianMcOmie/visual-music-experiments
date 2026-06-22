"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { tilingTypes } from "tactile-js";
import { createTilingWallGeometry, type TilingWallConfig } from "./tiling-geometry";

function getTilingLabel(v: number): string {
  const intIdx = Math.floor(Math.max(0, Math.min(80, v)));
  const typeId = tilingTypes[intIdx];
  const frac = v - intIdx;
  if (frac < 0.01) return `IH${String(typeId).padStart(2, "0")}`;
  return `IH${String(typeId).padStart(2, "0")} (morphing)`;
}

export default function TiledRoom() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [roomWidth, setRoomWidth] = useState(40);
  const [roomHeight, setRoomHeight] = useState(80);
  const [roomDepth, setRoomDepth] = useState(100);
  const [tilingTypeIndex, setTilingTypeIndex] = useState(0);
  const [edgeCurvature, setEdgeCurvature] = useState(0);
  const [tileScale, setTileScale] = useState(5);

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
        if (obj instanceof THREE.Mesh) {
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
    const cw = roomWidth;
    const cd = roomDepth;
    const armLen = 100;
    const halfW = cw / 2;
    const halfD = cd / 2;
    const floorY = 0;
    const ceilY = h;
    const midY = h / 2;

    // Center camera vertically
    camera.position.set(0, midY, 0);
    camera.lookAt(0, midY, -50);

    const tilingConfig: TilingWallConfig = {
      tilingTypeIndex,
      edgeCurvature,
      tileScale,
    };

    function createPatternedWall(
      surfaceW: number,
      surfaceH: number,
      transform: THREE.Matrix4,
      hueBase: number,
      saturation: number,
    ) {
      const geometry = createTilingWallGeometry(
        tilingConfig,
        surfaceW,
        surfaceH,
        transform,
        hueBase,
        saturation,
      );

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.3,
        roughness: 0.5,
        side: THREE.DoubleSide,
        emissive: new THREE.Color().setHSL(hueBase, saturation, 0.15),
        emissiveIntensity: 0.4,
      });

      const mesh = new THREE.Mesh(geometry, material);
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
    createPatternedWall(cw, cd,
      m4(0, floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);
    createPatternedWall(cw, armLen,
      m4(0, floorY, -(halfD + armLen / 2), -Math.PI / 2, 0, 0), 0.6, 0.5);
    createPatternedWall(cw, armLen,
      m4(0, floorY, (halfD + armLen / 2), -Math.PI / 2, 0, 0), 0.6, 0.5);
    createPatternedWall(armLen, cd,
      m4((halfW + armLen / 2), floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);
    createPatternedWall(armLen, cd,
      m4(-(halfW + armLen / 2), floorY, 0, -Math.PI / 2, 0, 0), 0.6, 0.5);

    // --- Ceiling (5 cross segments) ---
    createPatternedWall(cw, cd,
      m4(0, ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(cw, armLen,
      m4(0, ceilY, -(halfD + armLen / 2), Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(cw, armLen,
      m4(0, ceilY, (halfD + armLen / 2), Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(armLen, cd,
      m4((halfW + armLen / 2), ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);
    createPatternedWall(armLen, cd,
      m4(-(halfW + armLen / 2), ceilY, 0, Math.PI / 2, 0, 0), 0.7, 0.4);

    // --- Wing side walls ---
    const nCtr = -(halfD + armLen / 2);
    createPatternedWall(armLen, h, m4(-halfW, midY, nCtr, 0, Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(armLen, h, m4(halfW, midY, nCtr, 0, -Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(cw, h, m4(0, midY, -(halfD + armLen), 0, 0, 0), 0.5, 0.7);

    const sCtr = (halfD + armLen / 2);
    createPatternedWall(armLen, h, m4(-halfW, midY, sCtr, 0, Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(armLen, h, m4(halfW, midY, sCtr, 0, -Math.PI / 2, 0), 0.55, 0.6);
    createPatternedWall(cw, h, m4(0, midY, (halfD + armLen), 0, Math.PI, 0), 0.5, 0.7);

    const eCtr = (halfW + armLen / 2);
    createPatternedWall(armLen, h, m4(eCtr, midY, -halfD, 0, 0, 0), 0.0, 0.6);
    createPatternedWall(armLen, h, m4(eCtr, midY, halfD, 0, Math.PI, 0), 0.0, 0.6);
    createPatternedWall(cd, h, m4((halfW + armLen), midY, 0, 0, -Math.PI / 2, 0), 0.05, 0.7);

    const wCtr = -(halfW + armLen / 2);
    createPatternedWall(armLen, h, m4(wCtr, midY, -halfD, 0, 0, 0), 0.0, 0.6);
    createPatternedWall(armLen, h, m4(wCtr, midY, halfD, 0, Math.PI, 0), 0.0, 0.6);
    createPatternedWall(cd, h, m4(-(halfW + armLen), midY, 0, 0, Math.PI / 2, 0), 0.05, 0.7);

    // --- Inner corner walls (8 segments filling cross junctions) ---
    createPatternedWall(armLen, h, m4(halfW + armLen / 2, midY, -halfD, 0, 0, 0), 0.15, 0.5);
    createPatternedWall(armLen, h, m4(halfW, midY, -(halfD + armLen / 2), 0, -Math.PI / 2, 0), 0.15, 0.5);
    createPatternedWall(armLen, h, m4(-(halfW + armLen / 2), midY, -halfD, 0, 0, 0), 0.85, 0.5);
    createPatternedWall(armLen, h, m4(-halfW, midY, -(halfD + armLen / 2), 0, Math.PI / 2, 0), 0.85, 0.5);
    createPatternedWall(armLen, h, m4(halfW + armLen / 2, midY, halfD, 0, Math.PI, 0), 0.15, 0.5);
    createPatternedWall(armLen, h, m4(halfW, midY, halfD + armLen / 2, 0, -Math.PI / 2, 0), 0.15, 0.5);
    createPatternedWall(armLen, h, m4(-(halfW + armLen / 2), midY, halfD, 0, Math.PI, 0), 0.85, 0.5);
    createPatternedWall(armLen, h, m4(-halfW, midY, halfD + armLen / 2, 0, Math.PI / 2, 0), 0.85, 0.5);

    scene.add(roomGroup);
    renderer.render(scene, camera);

  }, [roomWidth, roomHeight, roomDepth, tilingTypeIndex, edgeCurvature, tileScale]);

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
          <a href="/" style={{ fontSize: "12px", color: "#aa66ff", textDecoration: "none" }}>&#8592; Gallery</a>
          <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>Tiled Room</h2>
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>
            Tiling Type: {tilingTypeIndex.toFixed(1)} &mdash; {getTilingLabel(tilingTypeIndex)}
          </label>
          <input type="range" min="0" max="80" step="0.1" value={tilingTypeIndex}
            onChange={(e) => setTilingTypeIndex(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>
            Edge Curvature: {edgeCurvature.toFixed(2)}
          </label>
          <input type="range" min="0" max="1" step="0.01" value={edgeCurvature}
            onChange={(e) => setEdgeCurvature(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>
            Tile Scale: {tileScale.toFixed(1)}
          </label>
          <input type="range" min="1" max="20" step="0.5" value={tileScale}
            onChange={(e) => setTileScale(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #333" }} />

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
