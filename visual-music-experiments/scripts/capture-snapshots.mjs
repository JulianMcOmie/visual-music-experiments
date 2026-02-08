import { chromium } from 'playwright';

const projects = [
  { name: 'polar-functions', path: '/circle' },
  { name: '3d-polar-functions', path: '/polar' },
  { name: 'warp-speed-tunnel', path: '/tunnel' },
  { name: 'cube-tube', path: '/cube-tube' },
  { name: 'penrose-tiling', path: '/penrose-tiling' },
];

async function captureSnapshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 }
  });
  const page = await context.newPage();

  for (const project of projects) {
    console.log(`Capturing ${project.name}...`);

    // Navigate to the project page in preview mode (hides UI)
    await page.goto(`http://localhost:3000${project.path}?preview`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait a bit for the animation to render
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
