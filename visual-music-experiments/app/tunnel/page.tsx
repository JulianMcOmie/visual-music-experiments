"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Tunnel3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(2);
  const [tunnelRadius, setTunnelRadius] = useState(5);
  const [segments, setSegments] = useState(32);
  const [ringSpacing, setRingSpacing] = useState(2);
  const [hueShift, setHueShift] = useState(180);
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
  const tunnelRadiusRef = useRef(tunnelRadius);
  const segmentsRef = useRef(segments);
  const ringSpacingRef = useRef(ringSpacing);
  const hueShiftRef = useRef(hueShift);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    tunnelRadiusRef.current = tunnelRadius;
  }, [tunnelRadius]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    ringSpacingRef.current = ringSpacing;
  }, [ringSpacing]);

  useEffect(() => {
    hueShiftRef.current = hueShift;
  }, [hueShift]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 100);

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

    // Create tunnel rings
    const rings: THREE.Mesh[] = [];
    const numRings = 50;

    for (let i = 0; i < numRings; i++) {
      const geometry = new THREE.TorusGeometry(
        tunnelRadiusRef.current,
        0.2,
        16,
        segmentsRef.current
      );
      const hue = (i * 10 + hueShiftRef.current) % 360;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.8, 0.5),
        wireframe: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = -i * ringSpacingRef.current;
      scene.add(ring);
      rings.push(ring);
    }

    let time = 0;
    let frameCount = 0;

    const animate = () => {
      if (!pausedRef.current) {
        time += 0.01 * speedRef.current;

        // Move rings forward
        rings.forEach((ring, i) => {
          ring.position.z += 0.1 * speedRef.current;

          // Reset ring to the back when it passes the camera
          if (ring.position.z > 5) {
            // Find the furthest back ring
            const minZ = Math.min(...rings.map(r => r.position.z));
            // Place this ring one spacing behind the furthest ring
            ring.position.z = minZ - ringSpacingRef.current;
          }

          // Update color
          const hue = (i * 10 + time * 50 + hueShiftRef.current) % 360;
          (ring.material as THREE.MeshBasicMaterial).color.setHSL(
            hue / 360,
            0.8,
            0.5
          );

          // Update debug values every 5 frames
          if (i === 0 && frameCount % 5 === 0) {
            setDebugTime(time);
            setDebugRingZ(ring.position.z);
            setDebugHue(hue);
          }

          // Update geometry if segments changed
          if ((ring.geometry as THREE.TorusGeometry).parameters.radialSegments !== segmentsRef.current) {
            ring.geometry.dispose();
            ring.geometry = new THREE.TorusGeometry(
              tunnelRadiusRef.current,
              0.2,
              16,
              segmentsRef.current
            );
          }

          // Update radius
          const currentRadius = (ring.geometry as THREE.TorusGeometry).parameters.radius;
          if (Math.abs(currentRadius - tunnelRadiusRef.current) > 0.1) {
            ring.geometry.dispose();
            ring.geometry = new THREE.TorusGeometry(
              tunnelRadiusRef.current,
              0.2,
              16,
              segmentsRef.current
            );
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
  }, []);

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
              max="10"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="tunnelRadius"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Tunnel Radius: {tunnelRadius.toFixed(1)}
            </label>
            <input
              id="tunnelRadius"
              type="range"
              min="2"
              max="15"
              step="0.5"
              value={tunnelRadius}
              onChange={(e) => setTunnelRadius(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="segments"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Segments: {segments}
            </label>
            <input
              id="segments"
              type="range"
              min="3"
              max="64"
              step="1"
              value={segments}
              onChange={(e) => setSegments(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="ringSpacing"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Ring Spacing: {ringSpacing.toFixed(1)}
            </label>
            <input
              id="ringSpacing"
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={ringSpacing}
              onChange={(e) => setRingSpacing(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="hueShift"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Hue Shift: {hueShift}°
            </label>
            <input
              id="hueShift"
              type="range"
              min="0"
              max="360"
              step="1"
              value={hueShift}
              onChange={(e) => setHueShift(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
