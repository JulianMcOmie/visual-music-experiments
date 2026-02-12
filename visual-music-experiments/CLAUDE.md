# Visual Music Experiments

This project is a collection of interactive visual music experiments built with Next.js, featuring generative art synchronized with musical parameters.

## Project Overview

A gallery of visual music experiments where each project is an interactive canvas-based or WebGL-based animation that responds to musical parameters like tempo, beats, oscillators, and scales.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **3D Graphics**: Three.js (for 3D projects like polar, cube-tube)
- **2D Graphics**: HTML5 Canvas (for circle, tunnel, penrose-tiling)
- **Testing/Screenshots**: Playwright

## Project Structure

```
app/
├── page.tsx                 # Gallery homepage with project cards
├── circle/                  # Polar Functions (2D)
├── polar/                   # 3D Polar Functions (Three.js)
├── tunnel/                  # Polar Bursts (2D)
├── cube-tube/               # Cube Tube (Three.js)
└── penrose-tiling/          # Penrose Tiling (2D)

public/snapshots/            # Static preview images for gallery
scripts/
├── capture-snapshots.mjs    # Automated screenshot tool
```

## Code Conventions

### Project Pages Pattern

Each project follows a consistent structure:

1. **Canvas/Container**: Full viewport canvas or Three.js container
2. **Controls Panel**: Left-side panel with sliders, dropdowns, and toggles
   - Hidden in preview mode (`?preview` query param)
   - Styled with dark theme: `rgba(0, 0, 0, 0.7)` background
3. **Musical Pane**: Bottom panel for musical settings (MusicalPane component)
   - Also hidden in preview mode
4. **Preview Mode**: Detects `?preview` query param to hide UI for screenshots

### State Management

- Use `useState` for UI controls
- Use `useRef` for animation state that doesn't trigger re-renders
- Store refs for values accessed in animation loops (prevents stale closures)

### Animation Pattern

```typescript
useEffect(() => {
  // Setup canvas/scene
  // Animation loop with requestAnimationFrame
  // Cleanup on unmount
  return () => {
    // Cancel animation frame
    // Remove event listeners
    // Dispose Three.js resources
  };
}, []);
```

### Preview Mode Implementation

```typescript
const [isPreview, setIsPreview] = useState(false);
const pausedRef = useRef(false);

useEffect(() => {
  if (window.location.search.includes("preview")) {
    setIsPreview(true);
    pausedRef.current = true;
  }
}, []);

// Message handler for gallery iframe control
useEffect(() => {
  if (!isPreview) return;
  const handler = (e: MessageEvent) => {
    if (e.data === "play") pausedRef.current = false;
    if (e.data === "pause") pausedRef.current = true;
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, [isPreview]);
```

## Gallery Page

- Static snapshots (not live animations) to avoid performance issues
- Project cards with hover effects
- Each card links to the full interactive project
- Snapshots in `public/snapshots/` directory

## Common Tasks

### Adding a New Project

1. Create new directory under `app/[project-name]/`
2. Create `page.tsx` with the project component
3. Add preview mode support (see pattern above)
4. Update gallery in `app/page.tsx`:
   - Add project to `projects` array
   - Include title, href, description, color, bgColor, snapshot path
5. Capture snapshot (see below)

### Capturing Snapshots

```bash
npm run dev  # Start dev server
node scripts/capture-snapshots.mjs  # Capture all project snapshots
```

The script:
- Navigates to each project with `?preview` param
- Enables WebGL for Three.js projects
- Sends "play" message to start animation
- Waits 2 seconds, then captures 800x600 screenshot
- Saves to `public/snapshots/[project-name].png`

### WebGL Projects Note

Three.js projects require WebGL context. The screenshot script uses:
```javascript
chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-gpu-sandbox',
    '--ignore-gpu-blocklist'
  ]
});
```

## Git Conventions

- **Do NOT auto-commit or auto-push**: Never commit or push changes unless explicitly requested by the user
- **Commit messages**: Use clear, descriptive messages without co-author tags
- **No Claude references**: Don't include "Co-Authored-By: Claude" in commits
- Example: "Add timeline keyframes with oscillator variations"

## Performance Considerations

- Gallery uses static snapshots (not iframes) to prevent lag
- Each project runs independently when navigated to
- Preview mode pauses animations initially
- Clean up resources in useEffect cleanup functions

## Musical Parameters

Projects typically include:
- **Tempo/BPM**: Controls animation speed
- **Time signature**: Affects rhythm patterns
- **Scales**: Musical scales for note generation
- **Oscillators**: Shape wave functions (sin, cos, triangle, square, sawtooth)
- **Layers**: Multiple animation layers with independent parameters
- **Phrases**: Sequences of musical/visual patterns

## Color Palettes

Common palette modes:
- Analogous, Complementary, Triadic
- Warm, Cool, Sunset, Ocean, Forest
- Monochrome
- HSL-based with configurable hue, saturation, lightness

## Development

```bash
npm run dev     # Start dev server (localhost:3000)
npm run build   # Production build
npm run start   # Run production server
```

## Notes

- All projects use `"use client"` directive (client components)
- Animation loops should check pause state before animating
- Use proper TypeScript types for wave functions, palettes, etc.
- Mobile responsiveness: controls are scrollable on smaller screens
