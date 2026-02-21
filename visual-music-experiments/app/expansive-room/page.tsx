"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createTilingWallGeometry } from "./tiling-geometry";

// 10 visually distinct tiling type indices (out of 0–80)
const DEFAULT_TILINGS = [
  3,   // floor
  12,  // ceiling
  7,   // wall 0
  19,  // wall 1
  28,  // wall 2
  35,  // wall 3
  44,  // wall 4
  52,  // wall 5
  61,  // wall 6
  73,  // wall 7
];

export default function ExpansiveRoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Parameters
  const [roomRadius, setRoomRadius] = useState(200);
  const [roomHeight, setRoomHeight] = useState(200);
  const [tileScale, setTileScale] = useState(8);
  const [edgeCurvature, setEdgeCurvature] = useState(0.5);
  const [fogDensity, setFogDensity] = useState(0.003);
  const [brightness, setBrightness] = useState(1.2);
  const [saturation, setSaturation] = useState(0.55);

  // Refs for Three.js objects we need to update
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const tiledMeshesRef = useRef<THREE.Mesh[]>([]);
  const lightsRef = useRef<THREE.Light[]>([]);

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
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080818);
    scene.fog = new THREE.FogExp2(0x080818, 0.003);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.5,
      1000,
    );
    camera.position.set(30, 20, 30);
    camera.lookAt(0, 40, -80);
    cameraRef.current = camera;

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
    });
    materialRef.current = material;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    };
    window.addEventListener("resize", onResize);

    return () => {
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

  // Rebuild scene when parameters change
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const material = materialRef.current;
    if (!scene || !camera || !renderer || !material) return;

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

    // Update fog
    scene.fog = new THREE.FogExp2(0x080818, fogDensity);

    // Update tone mapping exposure for brightness
    renderer.toneMappingExposure = brightness;

    // Lighting — brighter defaults
    const ambient = new THREE.AmbientLight(0x667799, 1.0);
    scene.add(ambient);
    lightsRef.current.push(ambient);

    const hemiLight = new THREE.HemisphereLight(0xbbccee, 0x445566, 0.8);
    scene.add(hemiLight);
    lightsRef.current.push(hemiLight);

    const centralLight = new THREE.PointLight(0xffeedd, 3, roomRadius * 3, 1.2);
    centralLight.position.set(0, roomHeight * 0.85, 0);
    scene.add(centralLight);
    lightsRef.current.push(centralLight);

    // Ring of point lights around the room
    const numLightRing = 8;
    for (let i = 0; i < numLightRing; i++) {
      const a = (i / numLightRing) * Math.PI * 2;
      const r = roomRadius * 0.5;
      const pl = new THREE.PointLight(0xddeeff, 1.5, roomRadius * 2, 1.5);
      pl.position.set(Math.sin(a) * r, roomHeight * 0.4, Math.cos(a) * r);
      scene.add(pl);
      lightsRef.current.push(pl);
    }

    // Lower fill lights
    const fillPositions = [
      [0, roomHeight * 0.15, 0],
      [roomRadius * 0.3, roomHeight * 0.6, roomRadius * 0.3],
      [-roomRadius * 0.3, roomHeight * 0.6, -roomRadius * 0.3],
    ];
    for (const [x, y, z] of fillPositions) {
      const fl = new THREE.PointLight(0xccbbaa, 0.8, roomRadius * 2, 1.8);
      fl.position.set(x, y, z);
      scene.add(fl);
      lightsRef.current.push(fl);
    }

    // Build octagonal room
    const numWalls = 8;
    const angleStep = (Math.PI * 2) / numWalls;
    const wallWidth = 2 * roomRadius * Math.tan(angleStep / 2);

    // Floor
    const floorTransform = new THREE.Matrix4();
    floorTransform.makeRotationX(-Math.PI / 2);
    const floorGeo = createTilingWallGeometry(
      DEFAULT_TILINGS[0],
      roomRadius * 2.5,
      roomRadius * 2.5,
      tileScale,
      floorTransform,
      0.58,
      saturation,
      edgeCurvature,
    );
    const floorMesh = new THREE.Mesh(floorGeo, material);
    scene.add(floorMesh);
    tiledMeshesRef.current.push(floorMesh);

    // Ceiling
    const ceilingTransform = new THREE.Matrix4();
    ceilingTransform.makeRotationX(Math.PI / 2);
    const ceilingTranslate = new THREE.Matrix4().makeTranslation(0, roomHeight, 0);
    ceilingTransform.premultiply(ceilingTranslate);
    const ceilingGeo = createTilingWallGeometry(
      DEFAULT_TILINGS[1],
      roomRadius * 2.5,
      roomRadius * 2.5,
      tileScale,
      ceilingTransform,
      0.08,
      saturation,
      edgeCurvature,
    );
    const ceilingMesh = new THREE.Mesh(ceilingGeo, material);
    scene.add(ceilingMesh);
    tiledMeshesRef.current.push(ceilingMesh);

    // 8 Walls
    for (let i = 0; i < numWalls; i++) {
      const angle = i * angleStep;
      const hue = i / numWalls;

      const cx = Math.sin(angle) * roomRadius;
      const cz = Math.cos(angle) * roomRadius;

      const wallTransform = new THREE.Matrix4();
      const translateUp = new THREE.Matrix4().makeTranslation(0, roomHeight / 2, 0);
      const rotY = new THREE.Matrix4().makeRotationY(angle);
      const translateOut = new THREE.Matrix4().makeTranslation(cx, 0, cz);

      wallTransform.multiply(translateOut);
      wallTransform.multiply(translateUp);
      wallTransform.multiply(rotY);

      const wallGeo = createTilingWallGeometry(
        DEFAULT_TILINGS[2 + i],
        wallWidth,
        roomHeight,
        tileScale,
        wallTransform,
        hue,
        saturation,
        edgeCurvature,
      );
      const wallMesh = new THREE.Mesh(wallGeo, material);
      scene.add(wallMesh);
      tiledMeshesRef.current.push(wallMesh);
    }

    renderer.render(scene, camera);
  }, [roomRadius, roomHeight, tileScale, edgeCurvature, fogDensity, brightness, saturation]);

  // Preview mode message handler
  useEffect(() => {
    if (!isPreview) return;
    const handler = (e: MessageEvent) => {
      // Static scene — support the protocol
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

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
              Fog Density: {fogDensity.toFixed(4)}
            </label>
            <input
              type="range"
              min="0"
              max="0.01"
              step="0.0005"
              value={fogDensity}
              onChange={(e) => setFogDensity(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Brightness: {brightness.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={blockStyle}>
            <label style={labelStyle}>
              Saturation: {saturation.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
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
