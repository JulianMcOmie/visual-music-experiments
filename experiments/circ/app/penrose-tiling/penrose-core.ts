// Penrose P2 tiling with deflation + spatial layer detection

const PHI = (1 + Math.sqrt(5)) / 2;

export interface Tile {
  x: number;
  y: number;
  angle: number;
  type: 0 | 1; // 0 = kite, 1 = dart
  generation: number; // Spatial ring/layer from center
}

export interface TilingState {
  tiles: Tile[];
  size: number;
}

export function createInitialTiling(size: number): TilingState {
  // Start with a sun pattern: 5 kites arranged radially for radial symmetry
  const tiles: Tile[] = [];

  for (let i = 0; i < 5; i++) {
    const angle = (i * 72) - 90; // 72° apart (360°/5), starting at -90° (pointing up)
    tiles.push({
      x: 0,
      y: 0,
      angle: angle,
      type: 0, // kite
      generation: 0
    });
  }

  return { tiles, size };
}

export function deflateTiling(state: TilingState): TilingState {
  const newTiles: Tile[] = [];

  for (const tile of state.tiles) {
    if (tile.type === 0) {
      // Deflate kite into 2 kites + 2 darts
      newTiles.push({
        x: tile.x + state.size * Math.cos((tile.angle - 54) * Math.PI / 180),
        y: tile.y + state.size * Math.sin((tile.angle - 54) * Math.PI / 180),
        angle: tile.angle - 108,
        type: 0,
        generation: 0 // Will recalculate later
      });

      newTiles.push({
        x: tile.x + state.size * Math.cos((tile.angle - 126) * Math.PI / 180),
        y: tile.y + state.size * Math.sin((tile.angle - 126) * Math.PI / 180),
        angle: tile.angle + 108,
        type: 0,
        generation: 0
      });

      newTiles.push({
        x: tile.x,
        y: tile.y,
        angle: tile.angle - 36,
        type: 1,
        generation: 0
      });

      newTiles.push({
        x: tile.x,
        y: tile.y,
        angle: tile.angle + 36,
        type: 1,
        generation: 0
      });
    } else {
      // Deflate dart into 1 kite + 2 darts
      newTiles.push({
        x: tile.x,
        y: tile.y,
        angle: tile.angle,
        type: 0,
        generation: 0
      });

      newTiles.push({
        x: tile.x + state.size * Math.cos((tile.angle - 126) * Math.PI / 180),
        y: tile.y + state.size * Math.sin((tile.angle - 126) * Math.PI / 180),
        angle: tile.angle + 144,
        type: 1,
        generation: 0
      });

      newTiles.push({
        x: tile.x + state.size * Math.cos((tile.angle - 54) * Math.PI / 180),
        y: tile.y + state.size * Math.sin((tile.angle - 54) * Math.PI / 180),
        angle: tile.angle - 144,
        type: 1,
        generation: 0
      });
    }
  }

  return {
    tiles: removeDuplicates(newTiles, state.size / PHI),
    size: state.size / PHI
  };
}

function removeDuplicates(tiles: Tile[], size: number): Tile[] {
  const minD = size / Math.pow(PHI, 10);
  const result: Tile[] = [];

  for (const tile of tiles) {
    let isDuplicate = false;

    for (const existing of result) {
      const ang1 = normalizeAngle(tile.angle);
      const ang2 = normalizeAngle(existing.angle);

      if (
        Math.abs(tile.x - existing.x) < minD &&
        Math.abs(tile.y - existing.y) < minD &&
        Math.abs(ang1 - ang2) < 0.001 &&
        tile.type === existing.type
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      result.push(tile);
    }
  }

  return result;
}

function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized < 0) normalized += 360;
  while (normalized >= 360) normalized -= 360;
  return normalized;
}

function assignSpatialLayers(tiles: Tile[]): void {
  if (tiles.length === 0) return;

  // Calculate distance from center for each tile
  const distances = tiles.map(tile => Math.sqrt(tile.x * tile.x + tile.y * tile.y));

  // Find max distance to normalize
  const maxDistance = Math.max(...distances);

  // Assign generation as normalized distance (0 to ~10 for typical patterns)
  // This gives a continuous gradient rather than discrete rings
  tiles.forEach(tile => {
    const dist = Math.sqrt(tile.x * tile.x + tile.y * tile.y);
    // Scale distance to roughly 0-10 range for typical patterns
    tile.generation = (dist / maxDistance) * 10;
  });
}

export function generateTiling(deflations: number, initialSize: number): TilingState {
  let state = createInitialTiling(initialSize);

  for (let i = 0; i < deflations; i++) {
    state = deflateTiling(state);
  }

  // Assign spatial layers based on distance from center
  assignSpatialLayers(state.tiles);

  return state;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  size: number,
  fillColor: string,
  strokeColor: string = '#000000'
) {
  const x = tile.x;
  const y = tile.y;
  const ang = tile.angle;

  ctx.fillStyle = fillColor;
  ctx.beginPath();

  if (tile.type === 0) {
    // Draw kite
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + size * Math.sin((36 + ang) * Math.PI / 180),
      y - size * Math.cos((36 + ang) * Math.PI / 180)
    );
    ctx.lineTo(
      x + size * Math.sin(ang * Math.PI / 180),
      y - size * Math.cos(ang * Math.PI / 180)
    );
    ctx.lineTo(
      x - size * Math.sin((36 - ang) * Math.PI / 180),
      y - size * Math.cos((36 - ang) * Math.PI / 180)
    );
  } else {
    // Draw dart
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + size * Math.sin((36 + ang) * Math.PI / 180),
      y - size * Math.cos((36 + ang) * Math.PI / 180)
    );
    ctx.lineTo(
      x + (size * Math.sin(ang * Math.PI / 180)) / PHI,
      y - (size * Math.cos(ang * Math.PI / 180)) / PHI
    );
    ctx.lineTo(
      x - size * Math.sin((36 - ang) * Math.PI / 180),
      y - size * Math.cos((36 - ang) * Math.PI / 180)
    );
  }

  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = size / 50;
  ctx.stroke();
}
