import { IsohedralTiling, EdgeShape, tilingTypes, mul } from "tactile-js";
import earcut from "earcut";
import * as THREE from "three";

// Seeded PRNG for deterministic parameter presets per tiling type
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Build the outline of the prototile by iterating tiling.shape(),
 * sampling Bezier curves on U/S edges and straight segments on J/I edges.
 */
export function buildPrototileOutline(
  tiling: IsohedralTiling,
  curvature: number,
  samplesPerEdge: number = 8,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const verts = tiling.vertices();

  let edgeIdx = 0;
  for (const seg of tiling.shape()) {
    const nVerts = verts.length;
    const v0 = verts[edgeIdx % nVerts];
    const v1 = verts[(edgeIdx + 1) % nVerts];

    if (seg.shape === EdgeShape.J || seg.shape === EdgeShape.I || curvature < 0.001) {
      // Straight edge: sample linearly
      for (let i = 0; i < samplesPerEdge; i++) {
        const t = i / samplesPerEdge;
        pts.push({
          x: v0.x + (v1.x - v0.x) * t,
          y: v0.y + (v1.y - v0.y) * t,
        });
      }
    } else {
      // Curved edge: quadratic Bezier with control point offset perpendicular to edge
      const mx = (v0.x + v1.x) / 2;
      const my = (v0.y + v1.y) / 2;
      const dx = v1.x - v0.x;
      const dy = v1.y - v0.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular offset scaled by curvature
      const offset = curvature * len * 0.3;
      let nx: number, ny: number;

      if (seg.shape === EdgeShape.U) {
        // U-shape: bulge outward
        nx = -dy / len;
        ny = dx / len;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        for (let i = 0; i < samplesPerEdge; i++) {
          const t = i / samplesPerEdge;
          const u = 1 - t;
          pts.push({
            x: u * u * v0.x + 2 * u * t * cx + t * t * v1.x,
            y: u * u * v0.y + 2 * u * t * cy + t * t * v1.y,
          });
        }
      } else {
        // S-shape: sinusoidal curve
        nx = -dy / len;
        ny = dx / len;
        for (let i = 0; i < samplesPerEdge; i++) {
          const t = i / samplesPerEdge;
          const lineX = v0.x + dx * t;
          const lineY = v0.y + dy * t;
          const s = Math.sin(t * Math.PI) * offset * (t < 0.5 ? 1 : -1);
          pts.push({
            x: lineX + nx * s,
            y: lineY + ny * s,
          });
        }
      }
    }
    edgeIdx++;
  }

  return pts;
}

/**
 * Triangulate a 2D polygon using earcut.
 * Returns flat array of triangle vertex indices.
 */
export function triangulateTile(
  vertices: { x: number; y: number }[],
): { positions: number[]; indices: number[] } {
  const flat: number[] = [];
  for (const v of vertices) {
    flat.push(v.x, v.y);
  }
  const indices = earcut(flat);
  return { positions: flat, indices };
}

/**
 * Generate two random parameter presets for a given tiling type,
 * then interpolate between them using `frac`.
 */
function interpolatedParams(
  tiling: IsohedralTiling,
  tilingIdx: number,
  frac: number,
): number[] {
  const n = tiling.numParameters();
  if (n === 0) return [];

  const rngA = seededRandom(tilingIdx * 1000 + 42);
  const rngB = seededRandom(tilingIdx * 1000 + 137);

  const paramsA: number[] = [];
  const paramsB: number[] = [];
  for (let i = 0; i < n; i++) {
    paramsA.push(rngA() * 0.8 + 0.1); // range [0.1, 0.9]
    paramsB.push(rngB() * 0.8 + 0.1);
  }

  if (frac < 0.001) return paramsA;
  if (frac > 0.999) return paramsB;

  return paramsA.map((a, i) => a + (paramsB[i] - a) * frac);
}

export interface TilingWallConfig {
  tilingTypeIndex: number; // 0–80, fractional for morph
  edgeCurvature: number; // 0–1
  tileScale: number; // world-space tile size
}

/**
 * Create a merged BufferGeometry for one wall surface, filled with
 * TactileJS tiling tiles, colored with vertex colors.
 */
export function createTilingWallGeometry(
  config: TilingWallConfig,
  wallW: number,
  wallH: number,
  wallTransform: THREE.Matrix4,
  hueBase: number,
  saturation: number,
): THREE.BufferGeometry {
  const { tilingTypeIndex, edgeCurvature, tileScale } = config;

  // Determine tiling type
  const clampedIdx = Math.max(0, Math.min(80, tilingTypeIndex));
  const intIdx = Math.floor(clampedIdx);
  const frac = clampedIdx - intIdx;
  const typeId = tilingTypes[intIdx];

  const tiling = new IsohedralTiling(typeId);

  // Set interpolated parameters
  const params = interpolatedParams(tiling, intIdx, frac);
  if (params.length > 0) {
    tiling.setParameters(params);
  }

  // Build prototile outline
  const outline = buildPrototileOutline(tiling, edgeCurvature);

  // Triangulate the prototile
  const { positions: protoFlat, indices: protoIndices } = triangulateTile(outline);

  // Number of triangles per tile
  const numTriPerTile = protoIndices.length / 3;
  const vertsPerTile = outline.length;

  // Determine fill bounds in tiling space
  // We need to cover wallW x wallH centered at origin, scaled by tileScale
  const halfW = wallW / (2 * tileScale);
  const halfH = wallH / (2 * tileScale);
  // Add margin to avoid gaps at edges
  const margin = 2;

  // Collect all tiles
  const tiles: { T: number[]; aspect: number }[] = [];
  for (const tile of tiling.fillRegionBounds(
    -halfW - margin,
    -halfH - margin,
    halfW + margin,
    halfH + margin,
  )) {
    tiles.push({ T: tile.T as number[], aspect: tile.aspect });
  }

  if (tiles.length === 0) {
    // Fallback: return a simple quad
    const geo = new THREE.PlaneGeometry(wallW, wallH);
    return geo;
  }

  // Build merged geometry
  const totalVerts = tiles.length * vertsPerTile;
  const totalIndices = tiles.length * protoIndices.length;

  const posArray = new Float32Array(totalVerts * 3);
  const colorArray = new Float32Array(totalVerts * 3);
  const idxArray =
    totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  const numAspects = tiling.numAspects();
  const color = new THREE.Color();
  const tempVec = new THREE.Vector3();

  for (let ti = 0; ti < tiles.length; ti++) {
    const tile = tiles[ti];
    const vertOff = ti * vertsPerTile;
    const idxOff = ti * protoIndices.length;

    // Color based on aspect
    const hue = (hueBase + (tile.aspect / Math.max(numAspects, 1)) * 0.15) % 1;
    const lightness = 0.4 + (tile.aspect % 3) * 0.1;
    color.setHSL(hue, saturation, lightness);

    for (let vi = 0; vi < vertsPerTile; vi++) {
      // Transform prototile vertex by tile transform
      const px = protoFlat[vi * 2];
      const py = protoFlat[vi * 2 + 1];

      // Apply tile's 2D affine transform: [a, b, tx, c, d, ty]
      const T = tile.T;
      const tx = T[0] * px + T[1] * py + T[2];
      const ty = T[3] * px + T[4] * py + T[5];

      // Scale to world space, position on wall (centered)
      const wx = tx * tileScale;
      const wy = ty * tileScale;

      // Apply wall 3D transform (wall is in XY plane, centered at origin)
      tempVec.set(wx, wy, 0);
      tempVec.applyMatrix4(wallTransform);

      const idx3 = (vertOff + vi) * 3;
      posArray[idx3] = tempVec.x;
      posArray[idx3 + 1] = tempVec.y;
      posArray[idx3 + 2] = tempVec.z;

      colorArray[idx3] = color.r;
      colorArray[idx3 + 1] = color.g;
      colorArray[idx3 + 2] = color.b;
    }

    // Copy triangle indices with offset
    for (let ii = 0; ii < protoIndices.length; ii++) {
      idxArray[idxOff + ii] = vertOff + protoIndices[ii];
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
  geometry.setIndex(new THREE.BufferAttribute(idxArray, 1));
  geometry.computeVertexNormals();

  return geometry;
}
