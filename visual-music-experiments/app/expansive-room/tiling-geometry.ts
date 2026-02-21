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
      for (let i = 0; i < samplesPerEdge; i++) {
        const t = i / samplesPerEdge;
        pts.push({
          x: v0.x + (v1.x - v0.x) * t,
          y: v0.y + (v1.y - v0.y) * t,
        });
      }
    } else {
      const mx = (v0.x + v1.x) / 2;
      const my = (v0.y + v1.y) / 2;
      const dx = v1.x - v0.x;
      const dy = v1.y - v0.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = curvature * len * 0.3;
      let nx: number, ny: number;

      if (seg.shape === EdgeShape.U) {
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
 * Generate random parameters for a given tiling type with a deterministic seed.
 */
function randomParams(tiling: IsohedralTiling, seed: number): number[] {
  const n = tiling.numParameters();
  if (n === 0) return [];
  const rng = seededRandom(seed);
  const params: number[] = [];
  for (let i = 0; i < n; i++) {
    params.push(rng() * 0.8 + 0.1);
  }
  return params;
}

/**
 * Create a merged BufferGeometry for one surface, filled with
 * TactileJS tiling tiles, colored with vertex colors.
 *
 * wallW/wallH: dimensions of the surface in world units
 * wallTransform: 4x4 matrix positioning the surface in the scene
 * hueBase: base hue [0,1] for coloring tiles
 * saturation: color saturation [0,1]
 * tileScale: world-space size of tiles
 * tilingTypeIndex: index into tilingTypes (0-80)
 * edgeCurvature: how curved the tile edges are (0-1)
 */
export function createTilingWallGeometry(
  tilingTypeIndex: number,
  wallW: number,
  wallH: number,
  tileScale: number,
  wallTransform: THREE.Matrix4,
  hueBase: number,
  saturation: number,
  edgeCurvature: number = 0.5,
): THREE.BufferGeometry {
  const clampedIdx = Math.max(0, Math.min(80, tilingTypeIndex));
  const typeId = tilingTypes[clampedIdx];

  const tiling = new IsohedralTiling(typeId);

  const params = randomParams(tiling, clampedIdx * 1000 + 42);
  if (params.length > 0) {
    tiling.setParameters(params);
  }

  const outline = buildPrototileOutline(tiling, edgeCurvature);
  const { positions: protoFlat, indices: protoIndices } = triangulateTile(outline);

  const vertsPerTile = outline.length;

  const halfW = wallW / (2 * tileScale);
  const halfH = wallH / (2 * tileScale);
  const margin = 2;

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
    return new THREE.PlaneGeometry(wallW, wallH);
  }

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

    const hue = (hueBase + (tile.aspect / Math.max(numAspects, 1)) * 0.15) % 1;
    const lightness = 0.35 + (tile.aspect % 3) * 0.1;
    color.setHSL(hue, saturation, lightness);

    for (let vi = 0; vi < vertsPerTile; vi++) {
      const px = protoFlat[vi * 2];
      const py = protoFlat[vi * 2 + 1];

      const T = tile.T;
      const tx = T[0] * px + T[1] * py + T[2];
      const ty = T[3] * px + T[4] * py + T[5];

      const wx = tx * tileScale;
      const wy = ty * tileScale;

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
