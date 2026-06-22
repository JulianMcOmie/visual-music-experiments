"use client";
import { useState, Fragment } from "react";
import type { MutableRefObject, CSSProperties } from "react";

export interface PhraseStep {
  duration: number;
  petals: number;
  shapes: number;
  layers: number;
}

export interface MusicalSettings {
  enabled: boolean;
  bpm: number;
  ratioMode: boolean;
  ratios: {
    petals: string;
    shapes: string;
    radius: string;
    layers: string;
    rotation: string;
  };
  chromaticMode: boolean;
  scale: "major" | "minor" | "pentatonic" | "chromatic";
  rootNote: number;
  quantizeMode: boolean;
  gridResolution: string;
  phraseMode: boolean;
  phraseLoop: boolean;
  phrases: PhraseStep[];
}

export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const DEFAULT_MUSICAL: MusicalSettings = {
  enabled: true,
  bpm: 90,
  ratioMode: true,
  ratios: { petals: "1/4", shapes: "1/2", radius: "1/1", layers: "3/4", rotation: "1/2" },
  chromaticMode: true,
  scale: "pentatonic",
  rootNote: 0,
  quantizeMode: true,
  gridResolution: "1/4",
  phraseMode: true,
  phraseLoop: true,
  phrases: [
    { duration: 4, petals: 3, shapes: 3, layers: 2 },
    { duration: 4, petals: 5, shapes: 5, layers: 3 },
    { duration: 2, petals: 7, shapes: 3, layers: 4 },
    { duration: 2, petals: 5, shapes: 1, layers: 2 },
  ],
};

const RATIOS = ["1/8", "1/4", "1/3", "1/2", "2/3", "3/4", "1/1", "4/3", "3/2", "2/1", "3/1", "4/1"];
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const GRID_RESOLUTIONS = ["1/1", "1/2", "1/4", "1/8", "1/16"];

const sel: CSSProperties = {
  padding: "4px 6px",
  borderRadius: "4px",
  background: "#1a1a2e",
  color: "#fff",
  border: "1px solid #3a3a5c",
  fontSize: "12px",
  cursor: "pointer",
};

const numIn: CSSProperties = {
  width: "44px",
  padding: "3px 4px",
  borderRadius: "4px",
  background: "#1a1a2e",
  color: "#fff",
  border: "1px solid #3a3a5c",
  fontSize: "12px",
  textAlign: "center",
};

function SectionHeader({
  title,
  toggle,
}: {
  title: string;
  toggle?: { checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ color: "#7a6fa0", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      {toggle && (
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={toggle.checked} onChange={(e) => toggle.onChange(e.target.checked)} style={{ cursor: "pointer" }} />
        </label>
      )}
    </div>
  );
}

export default function MusicalPane({
  settingsRef,
  currentStep,
  currentBeat,
}: {
  settingsRef: MutableRefObject<MusicalSettings>;
  currentStep: number;
  currentBeat: number;
}) {
  const [s, setS] = useState<MusicalSettings>(settingsRef.current);
  const [expanded, setExpanded] = useState(true);

  const set = (partial: Partial<MusicalSettings>) => {
    const next = { ...s, ...partial };
    setS(next);
    settingsRef.current = next;
  };

  const updatePhrase = (index: number, field: keyof PhraseStep, value: number) => {
    const phrases = [...s.phrases];
    phrases[index] = { ...phrases[index], [field]: value };
    set({ phrases });
  };

  const totalPhraseBeats = s.phrases.reduce((sum, p) => sum + p.duration, 0);
  const displayBeat = s.phraseMode && s.phraseLoop && totalPhraseBeats > 0
    ? currentBeat % totalPhraseBeats
    : currentBeat;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(20, 18, 40, 0.85)",
          border: "1px solid #3a3a5c",
          color: "#a88fd8",
          padding: "8px 16px",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          letterSpacing: "0.05em",
        }}
      >
        Musical
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "rgba(20, 18, 40, 0.88)",
        padding: "20px",
        borderRadius: "8px",
        width: "248px",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid #3a3a5c",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #3a3a5c" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#a88fd8", fontWeight: 500 }}>Musical</h3>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
            <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} style={{ cursor: "pointer" }} />
            On
          </label>
          <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
      </div>

      {!s.enabled && <div style={{ color: "#555", fontSize: "13px", fontStyle: "italic" }}>Disabled — all musical overrides paused</div>}

      {s.enabled && (
        <>
          {/* Tempo */}
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title="Tempo" />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#aaa", fontSize: "12px", width: "28px" }}>BPM</span>
              <input
                type="number"
                min={20}
                max={300}
                value={s.bpm}
                onChange={(e) => set({ bpm: Math.max(20, Math.min(300, Number(e.target.value) || 90)) })}
                style={{ ...numIn, width: "48px" }}
              />
              <input
                type="range"
                min={40}
                max={200}
                value={s.bpm}
                onChange={(e) => set({ bpm: Number(e.target.value) })}
                style={{ flex: 1, cursor: "pointer" }}
              />
            </div>
          </div>

          {/* Ratios */}
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title="Ratios" toggle={{ checked: s.ratioMode, onChange: (v) => set({ ratioMode: v }) }} />
            {s.ratioMode && (
              <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: "5px 8px", alignItems: "center" }}>
                {(["petals", "shapes", "radius", "layers", "rotation"] as const).map((key) => (
                  <Fragment key={key}>
                    <span style={{ color: "#aaa", fontSize: "12px", textTransform: "capitalize" }}>{key}</span>
                    <select
                      value={s.ratios[key]}
                      onChange={(e) => set({ ratios: { ...s.ratios, [key]: e.target.value } })}
                      style={{ ...sel, width: "100%" }}
                    >
                      {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Fragment>
                ))}
              </div>
            )}
            {!s.ratioMode && <div style={{ color: "#555", fontSize: "11px" }}>Speeds use main panel sliders</div>}
          </div>

          {/* Chromatic Colors */}
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title="Colors" toggle={{ checked: s.chromaticMode, onChange: (v) => set({ chromaticMode: v }) }} />
            {s.chromaticMode && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <div style={{ color: "#666", fontSize: "10px", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Scale</div>
                  <select value={s.scale} onChange={(e) => set({ scale: e.target.value as any })} style={{ ...sel, width: "100%" }}>
                    <option value="pentatonic">Pentatonic</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="chromatic">Chromatic</option>
                  </select>
                </div>
                <div>
                  <div style={{ color: "#666", fontSize: "10px", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Root</div>
                  <select value={s.rootNote} onChange={(e) => set({ rootNote: Number(e.target.value) })} style={{ ...sel, width: "100%" }}>
                    {NOTES.map((n, i) => <option key={n} value={i}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}
            {!s.chromaticMode && <div style={{ color: "#555", fontSize: "11px" }}>Hue uses main panel palette</div>}
          </div>

          {/* Quantize */}
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title="Quantize" toggle={{ checked: s.quantizeMode, onChange: (v) => set({ quantizeMode: v }) }} />
            {s.quantizeMode && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#aaa", fontSize: "12px" }}>Grid</span>
                <select value={s.gridResolution} onChange={(e) => set({ gridResolution: e.target.value })} style={sel}>
                  {GRID_RESOLUTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
            {!s.quantizeMode && <div style={{ color: "#555", fontSize: "11px" }}>Oscillations run continuously</div>}
          </div>

          {/* Phrases */}
          <div style={{ marginBottom: "16px" }}>
            <SectionHeader title="Phrases" toggle={{ checked: s.phraseMode, onChange: (v) => set({ phraseMode: v }) }} />
            {s.phraseMode && (
              <>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
                    <input type="checkbox" checked={s.phraseLoop} onChange={(e) => set({ phraseLoop: e.target.checked })} style={{ cursor: "pointer" }} />
                    Loop
                  </label>
                  <button
                    onClick={() => set({ phrases: [...s.phrases, { duration: 4, petals: 5, shapes: 3, layers: 2 }] })}
                    style={{ background: "#2a2a4a", border: "1px solid #3a3a5c", color: "#a88fd8", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px" }}
                  >+ Step</button>
                </div>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "16px 38px 40px 40px 40px 18px", gap: "3px", alignItems: "center", marginBottom: "3px" }}>
                  {["", "dur", "P", "S", "L", ""].map((h, i) => (
                    <div key={i} style={{ color: "#555", fontSize: "10px", textAlign: "center", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>

                {/* Steps */}
                {s.phrases.map((step, i) => {
                  const isActive = i === currentStep && s.phraseMode;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16px 38px 40px 40px 40px 18px",
                        gap: "3px",
                        alignItems: "center",
                        background: isActive ? "rgba(168,143,216,0.12)" : "transparent",
                        borderRadius: "4px",
                        padding: "2px 0",
                        marginBottom: "2px",
                        border: isActive ? "1px solid rgba(168,143,216,0.25)" : "1px solid transparent",
                      }}
                    >
                      <div style={{ color: isActive ? "#a88fd8" : "#444", fontSize: "11px", textAlign: "center", fontWeight: isActive ? 700 : 400 }}>
                        {isActive ? "▶" : `${i + 1}`}
                      </div>
                      <input type="number" min={1} max={32} value={step.duration} onChange={(e) => updatePhrase(i, "duration", Math.max(1, Number(e.target.value) || 1))} style={numIn} />
                      <input type="number" min={1} max={48} value={step.petals} onChange={(e) => updatePhrase(i, "petals", Math.max(1, Number(e.target.value) || 1))} style={numIn} />
                      <input type="number" min={1} max={48} value={step.shapes} onChange={(e) => updatePhrase(i, "shapes", Math.max(1, Number(e.target.value) || 1))} style={numIn} />
                      <input type="number" min={1} max={24} value={step.layers} onChange={(e) => updatePhrase(i, "layers", Math.max(1, Number(e.target.value) || 1))} style={numIn} />
                      <button
                        onClick={() => { if (s.phrases.length > 1) set({ phrases: s.phrases.filter((_, idx) => idx !== i) }); }}
                        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "13px", padding: 0, textAlign: "center" }}
                      >×</button>
                    </div>
                  );
                })}
              </>
            )}
            {!s.phraseMode && <div style={{ color: "#555", fontSize: "11px" }}>Petals / shapes / layers use main oscillators</div>}
          </div>

          {/* Beat display */}
          <div style={{ paddingTop: "10px", borderTop: "1px solid #3a3a5c", fontSize: "12px", color: "#666", display: "flex", gap: "16px" }}>
            <span style={{ color: "#7a6fa0" }}>♩</span>
            <span>{displayBeat.toFixed(1)}</span>
            {s.phraseMode && <span style={{ color: "#555" }}>|</span>}
            {s.phraseMode && <span>Step {currentStep + 1} / {s.phrases.length}</span>}
          </div>
        </>
      )}
    </div>
  );
}
