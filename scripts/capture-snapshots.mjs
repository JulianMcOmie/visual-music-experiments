import { chromium } from 'playwright';

const BASE = process.env.SNAPSHOT_BASE_URL || 'http://localhost:3000';

// path -> snapshot filename, matching the gallery cards in app/page.tsx
const projects = [
  { name: 'polar-functions', path: '/circle' },
  { name: '3d-polar-functions', path: '/polar' },
  { name: '3d-tunnel', path: '/tunnel' },
  { name: 'polar-bursts', path: '/polar-bursts' },
  { name: 'cube-tube', path: '/cube-tube' },
  { name: 'penrose-tiling', path: '/penrose-tiling' },
  { name: 'tiled-room', path: '/tiled-room' },
  { name: 'expansive-room', path: '/expansive-room' },
  { name: 'nested-circles', path: '/nested-circles' },
  { name: 'keyboard-circles', path: '/keyboard-circles' },
];

async function captureSnapshots() {
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-gpu-sandbox',
      '--ignore-gpu-blocklist'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 }
  });
  const page = await context.newPage();

  for (const project of projects) {
    console.log(`Capturing ${project.name}...`);

    // Navigate to the project page in preview mode (hides UI)
    await page.goto(`${BASE}${project.path}?preview`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for initial render
    await page.waitForTimeout(1000);

    // Start the animation by sending play message
    await page.evaluate(() => {
      window.postMessage('play', '*');
    });

    // Wait for animation to render a few frames
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: `public/snapshots/${project.name}.png`,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });

    console.log(`✓ Saved ${project.name}.png`);
  }

  await browser.close();
  console.log('\nAll snapshots captured!');
}

captureSnapshots().catch(console.error);
