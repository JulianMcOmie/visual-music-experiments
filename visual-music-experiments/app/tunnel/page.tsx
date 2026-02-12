"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type WaveFunction = "sin" | "cos" | "triangle" | "sawtooth";

const waveFunctions: Record<WaveFunction, (x: number) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  triangle: (x) => Math.abs((x / Math.PI) % 2 - 1) * 2 - 1,
  sawtooth: (x) => 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5)),
};

export default function Tunnel3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(2);
  const [cameraRotation, setCameraRotation] = useState(0);

  // Generation constants - determine how new rings are created
  const [generationHue, setGenerationHue] = useState(180);
  const [generationRadius, setGenerationRadius] = useState(5);
  const [generationSpacing, setGenerationSpacing] = useState(2);
  const [generationSegments, setGenerationSegments] = useState(32);

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
  const [radiusOscMax, setRadiusOscMax] = useState(10);

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
  const generationHueRef = useRef(generationHue);
  const generationRadiusRef = useRef(generationRadius);
  const generationSpacingRef = useRef(generationSpacing);
  const generationSegmentsRef = useRef(generationSegments);

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

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    cameraRotationRef.current = cameraRotation;
  }, [cameraRotation]);

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
        generationRadiusRef.current,
        0.2,
        16,
        generationSegmentsRef.current
      );
      // Hue is exactly the generation constant, not calculated from ring index
      const hue = generationHueRef.current;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.8, 0.5),
        wireframe: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = -i * generationSpacingRef.current;

      // Bake ring properties from generation constants
      ring.userData = {
        radius: generationRadiusRef.current,
        segments: generationSegmentsRef.current,
        hue: hue,
        spacing: generationSpacingRef.current,
        birthIndex: i,
      };

      scene.add(ring);
      rings.push(ring);
    }

    let time = 0;
    let frameCount = 0;

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
        time += 0.01 * speedRef.current;

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

        // Move all rings forward toward camera first
        rings.forEach((ring) => {
          ring.position.z += 0.1 * speedRef.current;
        });

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

            // Find the furthest back ring (after all movement is done)
            const minZ = Math.min(...rings.map(r => r.position.z));
            // Place this ring using oscillated spacing
            ring.position.z = minZ - currentSpacing;

            // Regenerate with oscillated generation constants
            ring.geometry.dispose();
            ring.geometry = new THREE.TorusGeometry(
              currentRadius,
              0.2,
              16,
              currentSegments
            );

            // Bake oscillated generation constants into ring
            ring.userData = {
              radius: currentRadius,
              segments: currentSegments,
              hue: currentHue,
              spacing: currentSpacing,
              birthIndex: ring.userData.birthIndex,
            };

            // Set the color to the new baked hue
            (ring.material as THREE.MeshBasicMaterial).color.setHSL(
              currentHue / 360,
              0.8,
              0.5
            );
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
              step="0.01"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: "100%" }}
            />
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
              max="15"
              step="0.01"
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
                  <select value={hueOscFunction} onChange={(e) => setHueOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px" }}>
                    <option value="sin">Sin</option>
                    <option value="cos">Cos</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {hueOscSpeed.toFixed(2)}
                  <input type="range" min="0.1" max="5" step="0.1" value={hueOscSpeed} onChange={(e) => setHueOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <select value={radiusOscFunction} onChange={(e) => setRadiusOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px" }}>
                    <option value="sin">Sin</option>
                    <option value="cos">Cos</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {radiusOscSpeed.toFixed(2)}
                  <input type="range" min="0.1" max="5" step="0.1" value={radiusOscSpeed} onChange={(e) => setRadiusOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Min: {radiusOscMin.toFixed(1)}
                  <input type="range" min="2" max="15" step="0.1" value={radiusOscMin} onChange={(e) => setRadiusOscMin(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
                </label>
                <label style={{ display: "block", fontSize: "12px" }}>
                  Max: {radiusOscMax.toFixed(1)}
                  <input type="range" min="2" max="15" step="0.1" value={radiusOscMax} onChange={(e) => setRadiusOscMax(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <select value={spacingOscFunction} onChange={(e) => setSpacingOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px" }}>
                    <option value="sin">Sin</option>
                    <option value="cos">Cos</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {spacingOscSpeed.toFixed(2)}
                  <input type="range" min="0.1" max="5" step="0.1" value={spacingOscSpeed} onChange={(e) => setSpacingOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <select value={segmentsOscFunction} onChange={(e) => setSegmentsOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px" }}>
                    <option value="sin">Sin</option>
                    <option value="cos">Cos</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {segmentsOscSpeed.toFixed(2)}
                  <input type="range" min="0.1" max="5" step="0.1" value={segmentsOscSpeed} onChange={(e) => setSegmentsOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
                  <select value={cameraRotationOscFunction} onChange={(e) => setCameraRotationOscFunction(e.target.value as WaveFunction)} style={{ marginLeft: "8px" }}>
                    <option value="sin">Sin</option>
                    <option value="cos">Cos</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                  </select>
                </label>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>
                  Speed: {cameraRotationOscSpeed.toFixed(2)}
                  <input type="range" min="0.1" max="5" step="0.1" value={cameraRotationOscSpeed} onChange={(e) => setCameraRotationOscSpeed(Number(e.target.value))} style={{ width: "100%", display: "block" }} />
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
          </div>
        </div>
      )}
    </div>
  );
}
