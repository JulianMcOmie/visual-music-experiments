"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Rounded column geometry helper
function createColumnGeometry(radius: number, height: number, segments: number = 16): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, height, segments);
}

// Pointed arch shape for windows and vaults
function createArchShape(w: number, h: number, pointedness: number = 0.6): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2;
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, h * 0.5);
  // Gothic pointed arch using quadratic curves
  const cp = h * pointedness;
  shape.quadraticCurveTo(-hw, h * 0.5 + cp, 0, h);
  shape.quadraticCurveTo(hw, h * 0.5 + cp, hw, h * 0.5);
  shape.lineTo(hw, 0);
  shape.lineTo(-hw, 0);
  return shape;
}

export default function ExpansiveRoom() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Cathedral dimensions — ginormous scale
  const [naveLength, setNaveLength] = useState(600);
  const [naveWidth, setNaveWidth] = useState(80);
  const [naveHeight, setNaveHeight] = useState(120);
  const [transeptLength, setTranseptLength] = useState(300);
  const [columnSpacing, setColumnSpacing] = useState(30);
  const [fogDensity, setFogDensity] = useState(0.003);

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

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Initialize scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 3000);
    camera.position.set(0, 30, 0);
    camera.lookAt(0, 50, -100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Rebuild cathedral when params change
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

    // Clear existing lights except ambient
    scene.children
      .filter(c => c instanceof THREE.PointLight || c instanceof THREE.SpotLight || c instanceof THREE.DirectionalLight || c instanceof THREE.AmbientLight || c instanceof THREE.HemisphereLight)
      .forEach(c => scene.remove(c));

    // Fog for depth
    scene.fog = new THREE.FogExp2(0x020208, fogDensity);

    const roomGroup = new THREE.Group();
    roomGroupRef.current = roomGroup;

    const halfNave = naveLength / 2;
    const halfWidth = naveWidth / 2;
    const halfTransept = transeptLength / 2;
    const sideAisleW = naveWidth * 0.4;
    const aisleHeight = naveHeight * 0.55;

    // Position camera in the nave
    camera.position.set(0, 30, halfNave * 0.6);
    camera.lookAt(0, naveHeight * 0.4, -halfNave * 0.3);

    // --- Materials ---
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x8888a0,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x444450,
      roughness: 0.7,
      metalness: 0.1,
    });
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.9,
      metalness: 0.02,
    });
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x999aac,
      roughness: 0.6,
      metalness: 0.15,
    });
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x6a6a80,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x2244aa,
      emissive: 0x112266,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const roseWindowMat = new THREE.MeshStandardMaterial({
      color: 0x8833cc,
      emissive: 0x6622aa,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.7,
    });

    // --- Checkerboard floor ---
    const tileSize = 8;
    const floorTilesX = Math.ceil((naveWidth + sideAisleW * 2 + 20) / tileSize);
    const floorTilesZ = Math.ceil((naveLength + 40) / tileSize);
    for (let x = -Math.floor(floorTilesX / 2); x <= Math.floor(floorTilesX / 2); x++) {
      for (let z = -Math.floor(floorTilesZ / 2); z <= Math.floor(floorTilesZ / 2); z++) {
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(tileSize - 0.2, tileSize - 0.2),
          ((x + z) % 2 === 0) ? floorMat : darkStoneMat,
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x * tileSize, 0, z * tileSize);
        roomGroup.add(tile);
      }
    }

    // Transept floor extension
    const transFloorTilesX = Math.ceil(transeptLength / tileSize);
    const transFloorTilesZ = Math.ceil(naveWidth / tileSize);
    for (let x = -Math.floor(transFloorTilesX / 2); x <= Math.floor(transFloorTilesX / 2); x++) {
      for (let z = -Math.floor(transFloorTilesZ / 2); z <= Math.floor(transFloorTilesZ / 2); z++) {
        const wx = x * tileSize;
        const wz = z * tileSize;
        // Only place if outside nave footprint (avoid overlap)
        if (Math.abs(wx) > halfWidth + sideAisleW) {
          const tile = new THREE.Mesh(
            new THREE.PlaneGeometry(tileSize - 0.2, tileSize - 0.2),
            ((x + z) % 2 === 0) ? floorMat : darkStoneMat,
          );
          tile.rotation.x = -Math.PI / 2;
          tile.position.set(wx, 0, wz);
          roomGroup.add(tile);
        }
      }
    }

    // --- Nave walls ---
    // Left wall
    const wallGeo = new THREE.PlaneGeometry(naveLength, naveHeight);
    const leftWall = new THREE.Mesh(wallGeo, stoneMat);
    leftWall.position.set(-(halfWidth + sideAisleW), naveHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    roomGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeo, stoneMat);
    rightWall.position.set(halfWidth + sideAisleW, naveHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    roomGroup.add(rightWall);

    // --- Ceiling / vault (simple barrel vault approximation) ---
    // Main nave vault
    const vaultSegs = 24;
    const vaultGeo = new THREE.CylinderGeometry(
      halfWidth * 0.95, halfWidth * 0.95,
      naveLength, vaultSegs, 1, true,
      0, Math.PI,
    );
    const vault = new THREE.Mesh(vaultGeo, vaultMat);
    vault.rotation.x = Math.PI / 2;
    vault.rotation.z = Math.PI;
    vault.position.set(0, naveHeight, 0);
    roomGroup.add(vault);

    // Side aisle vaults (lower)
    for (const side of [-1, 1]) {
      const aisleVaultGeo = new THREE.CylinderGeometry(
        sideAisleW * 0.8, sideAisleW * 0.8,
        naveLength, 16, 1, true,
        0, Math.PI,
      );
      const aisleVault = new THREE.Mesh(aisleVaultGeo, vaultMat);
      aisleVault.rotation.x = Math.PI / 2;
      aisleVault.rotation.z = Math.PI;
      aisleVault.position.set(side * (halfWidth + sideAisleW / 2), aisleHeight, 0);
      roomGroup.add(aisleVault);
    }

    // --- Columns (arcade between nave and side aisles) ---
    const colRadius = 2.5;
    const colHeight = aisleHeight;
    const numCols = Math.floor(naveLength / columnSpacing);

    for (const side of [-1, 1]) {
      for (let i = 0; i <= numCols; i++) {
        const z = -halfNave + i * columnSpacing;
        const col = new THREE.Mesh(
          createColumnGeometry(colRadius, colHeight),
          columnMat,
        );
        col.position.set(side * halfWidth, colHeight / 2, z);
        roomGroup.add(col);

        // Column capital (widened top)
        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(colRadius * 1.8, colRadius, colRadius * 2, 16),
          columnMat,
        );
        capital.position.set(side * halfWidth, colHeight, z);
        roomGroup.add(capital);

        // Thin shaft continues up to vault spring
        const shaftH = naveHeight - colHeight;
        const shaft = new THREE.Mesh(
          createColumnGeometry(colRadius * 0.5, shaftH, 8),
          columnMat,
        );
        shaft.position.set(side * halfWidth, colHeight + shaftH / 2, z);
        roomGroup.add(shaft);
      }
    }

    // --- Transept walls ---
    const transeptW = naveWidth * 1.2;
    const transHeight = naveHeight * 0.9;

    // North transept end wall
    const transWallGeo = new THREE.PlaneGeometry(transeptW, transHeight);
    const northTransWall = new THREE.Mesh(transWallGeo, stoneMat);
    northTransWall.position.set(-halfTransept, transHeight / 2, 0);
    northTransWall.rotation.y = Math.PI / 2;
    roomGroup.add(northTransWall);

    // South transept end wall
    const southTransWall = new THREE.Mesh(transWallGeo, stoneMat);
    southTransWall.position.set(halfTransept, transHeight / 2, 0);
    southTransWall.rotation.y = -Math.PI / 2;
    roomGroup.add(southTransWall);

    // Transept side walls (front and back, running along Z)
    for (const side of [-1, 1]) {
      const xStart = halfWidth + sideAisleW;
      const xEnd = halfTransept;
      const wallLen = xEnd - xStart;
      if (wallLen > 0) {
        for (const zSide of [-1, 1]) {
          const tw = new THREE.Mesh(
            new THREE.PlaneGeometry(wallLen, transHeight),
            stoneMat,
          );
          tw.position.set(
            side * (xStart + wallLen / 2),
            transHeight / 2,
            zSide * transeptW / 2,
          );
          tw.rotation.y = zSide > 0 ? Math.PI : 0;
          roomGroup.add(tw);
        }
      }
    }

    // Transept vault
    for (const side of [-1, 1]) {
      const transVaultLen = halfTransept - halfWidth - sideAisleW;
      if (transVaultLen > 0) {
        const transVaultGeo = new THREE.CylinderGeometry(
          transeptW / 2 * 0.8, transeptW / 2 * 0.8,
          transVaultLen, 16, 1, true, 0, Math.PI,
        );
        const transVault = new THREE.Mesh(transVaultGeo, vaultMat);
        transVault.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        transVault.rotation.x = 0;
        // Rotate so arch faces up
        transVault.rotation.order = "YXZ";
        transVault.rotation.y = Math.PI / 2;
        transVault.rotation.x = Math.PI;
        transVault.position.set(
          side * (halfWidth + sideAisleW + transVaultLen / 2),
          transHeight,
          0,
        );
        roomGroup.add(transVault);
      }
    }

    // --- Apse (semicircular end) ---
    const apseRadius = halfWidth + sideAisleW;
    const apseGeo = new THREE.CylinderGeometry(
      apseRadius, apseRadius, naveHeight, 32, 1, true,
      0, Math.PI,
    );
    const apse = new THREE.Mesh(apseGeo, stoneMat);
    apse.position.set(0, naveHeight / 2, -halfNave);
    apse.rotation.y = Math.PI / 2;
    roomGroup.add(apse);

    // Apse dome
    const apseDomeGeo = new THREE.SphereGeometry(apseRadius, 32, 16, 0, Math.PI, 0, Math.PI / 2);
    const apseDome = new THREE.Mesh(apseDomeGeo, vaultMat);
    apseDome.position.set(0, naveHeight, -halfNave);
    roomGroup.add(apseDome);

    // --- West facade (entrance wall) with rose window ---
    const facadeGeo = new THREE.PlaneGeometry(naveWidth + sideAisleW * 2, naveHeight);
    const facade = new THREE.Mesh(facadeGeo, stoneMat);
    facade.position.set(0, naveHeight / 2, halfNave);
    facade.rotation.y = Math.PI;
    roomGroup.add(facade);

    // Rose window
    const roseRadius = naveWidth * 0.25;
    const roseGeo = new THREE.CircleGeometry(roseRadius, 32);
    const roseWindow = new THREE.Mesh(roseGeo, roseWindowMat);
    roseWindow.position.set(0, naveHeight * 0.7, halfNave - 0.5);
    roseWindow.rotation.y = Math.PI;
    roomGroup.add(roseWindow);

    // Rose window spokes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spokeGeo = new THREE.PlaneGeometry(0.5, roseRadius * 0.9);
      const spoke = new THREE.Mesh(spokeGeo, columnMat);
      spoke.position.set(
        Math.cos(angle) * roseRadius * 0.45,
        naveHeight * 0.7 + Math.sin(angle) * roseRadius * 0.45,
        halfNave - 0.4,
      );
      spoke.rotation.z = angle;
      spoke.rotation.y = Math.PI;
      roomGroup.add(spoke);
    }

    // --- Clerestory windows (upper nave, above side aisles) ---
    const windowW = 4;
    const windowH = naveHeight * 0.25;
    const windowY = aisleHeight + windowH * 0.7;
    const windowShape = createArchShape(windowW, windowH, 0.5);
    const windowGeo = new THREE.ShapeGeometry(windowShape);

    for (const side of [-1, 1]) {
      for (let i = 0; i < numCols; i++) {
        const z = -halfNave + i * columnSpacing + columnSpacing / 2;
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(side * (halfWidth + sideAisleW - 0.2), windowY, z);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        roomGroup.add(win);
      }
    }

    // --- Side aisle windows ---
    const sideWinH = aisleHeight * 0.5;
    const sideWinW = 3;
    const sideWinShape = createArchShape(sideWinW, sideWinH, 0.4);
    const sideWinGeo = new THREE.ShapeGeometry(sideWinShape);

    for (const side of [-1, 1]) {
      for (let i = 0; i < numCols; i++) {
        const z = -halfNave + i * columnSpacing + columnSpacing / 2;
        const win = new THREE.Mesh(sideWinGeo, windowMat);
        win.position.set(side * (halfWidth + sideAisleW - 0.2), aisleHeight * 0.2, z);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        roomGroup.add(win);
      }
    }

    // --- Ribbed vault ribs (decorative arches along nave ceiling) ---
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0xaaaabc,
      roughness: 0.5,
      metalness: 0.2,
    });
    for (let i = 0; i <= numCols; i++) {
      const z = -halfNave + i * columnSpacing;
      // Transverse rib
      const ribCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-halfWidth, aisleHeight, z),
        new THREE.Vector3(0, naveHeight + halfWidth * 0.15, z),
        new THREE.Vector3(halfWidth, aisleHeight, z),
      );
      const ribGeo = new THREE.TubeGeometry(ribCurve, 20, 0.8, 6, false);
      const rib = new THREE.Mesh(ribGeo, ribMat);
      roomGroup.add(rib);
    }

    // --- Lighting ---
    // Warm ambient
    scene.add(new THREE.AmbientLight(0x111122, 0.5));
    scene.add(new THREE.HemisphereLight(0x334466, 0x111111, 0.4));

    // Directional "sunlight" through clerestory
    const sun = new THREE.DirectionalLight(0xffeedd, 0.8);
    sun.position.set(100, 200, -50);
    scene.add(sun);

    // Point lights along the nave (like candelabras)
    const lightSpacing = columnSpacing * 2;
    const numLights = Math.floor(naveLength / lightSpacing);
    for (let i = 0; i <= numLights; i++) {
      const z = -halfNave + i * lightSpacing;
      const navLight = new THREE.PointLight(0xffcc88, 3, columnSpacing * 3);
      navLight.position.set(0, naveHeight * 0.3, z);
      scene.add(navLight);
    }

    // Transept crossing light (brighter, higher)
    const crossingLight = new THREE.PointLight(0xffeedd, 5, 400);
    crossingLight.position.set(0, naveHeight * 0.8, 0);
    scene.add(crossingLight);

    // Apse warm glow
    const apseLight = new THREE.PointLight(0xffaa66, 4, 300);
    apseLight.position.set(0, naveHeight * 0.5, -halfNave + 10);
    scene.add(apseLight);

    // Rose window backlight
    const roseLight = new THREE.PointLight(0x8844ff, 3, 200);
    roseLight.position.set(0, naveHeight * 0.7, halfNave - 5);
    scene.add(roseLight);

    // Transept end lights
    for (const side of [-1, 1]) {
      const transLight = new THREE.PointLight(0xccddff, 2, 250);
      transLight.position.set(side * (halfTransept - 20), transHeight * 0.5, 0);
      scene.add(transLight);
    }

    scene.add(roomGroup);

    // Animation loop — slow camera drift
    cancelAnimationFrame(animFrameRef.current);
    timeRef.current = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (pausedRef.current) return;

      timeRef.current += 0.003;
      const t = timeRef.current;

      // Gentle camera sway
      camera.position.x = Math.sin(t * 0.3) * 8;
      camera.position.y = 30 + Math.sin(t * 0.2) * 5;
      camera.lookAt(
        Math.sin(t * 0.15) * 20,
        naveHeight * 0.35 + Math.sin(t * 0.1) * 10,
        camera.position.z - 150,
      );

      renderer.render(scene, camera);
    };
    animate();

    return () => cancelAnimationFrame(animFrameRef.current);

  }, [naveLength, naveWidth, naveHeight, transeptLength, columnSpacing, fogDensity]);

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
          <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#fff" }}>Expansive Room</h2>
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Nave Length: {naveLength}</label>
          <input type="range" min="200" max="1200" step="50" value={naveLength}
            onChange={(e) => setNaveLength(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Nave Width: {naveWidth}</label>
          <input type="range" min="30" max="200" step="10" value={naveWidth}
            onChange={(e) => setNaveWidth(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Nave Height: {naveHeight}</label>
          <input type="range" min="40" max="300" step="10" value={naveHeight}
            onChange={(e) => setNaveHeight(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Transept Length: {transeptLength}</label>
          <input type="range" min="100" max="600" step="25" value={transeptLength}
            onChange={(e) => setTranseptLength(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Column Spacing: {columnSpacing}</label>
          <input type="range" min="15" max="60" step="5" value={columnSpacing}
            onChange={(e) => setColumnSpacing(Number(e.target.value))} style={sliderStyle} />
        </div>

        <div style={blockStyle}>
          <label style={labelStyle}>Fog Density: {fogDensity.toFixed(4)}</label>
          <input type="range" min="0" max="0.01" step="0.0005" value={fogDensity}
            onChange={(e) => setFogDensity(Number(e.target.value))} style={sliderStyle} />
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
