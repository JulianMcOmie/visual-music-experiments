declare module "tactile-js" {
  export const EdgeShape: {
    J: number;
    U: number;
    S: number;
    I: number;
  };

  export const numTypes: number;
  export const tilingTypes: number[];

  export function mul(
    M: number[],
    pt: { x: number; y: number },
  ): { x: number; y: number };
  export function mul(M: number[], N: number[]): number[];

  export class IsohedralTiling {
    constructor(typeId: number);
    reset(typeId: number): void;
    getTilingType(): number;
    numParameters(): number;
    getParameters(): number[];
    setParameters(params: number[]): void;
    numEdgeShapes(): number;
    getEdgeShape(idx: number): number;
    numVertices(): number;
    vertices(): { x: number; y: number }[];
    getVertex(idx: number): { x: number; y: number };
    numAspects(): number;
    getAspectTransform(idx: number): number[];
    getT1(): { x: number; y: number };
    getT2(): { x: number; y: number };
    getColour(t1: number, t2: number, aspect: number): number;

    shape(): Iterable<{
      T: number[];
      id: number;
      shape: number;
      rev: boolean;
    }>;

    parts(): Iterable<{
      T: number[];
      id: number;
      shape: number;
      rev: boolean;
      second: boolean;
    }>;

    fillRegionBounds(
      xmin: number,
      ymin: number,
      xmax: number,
      ymax: number,
    ): Iterable<{
      T: number[];
      t1: number;
      t2: number;
      aspect: number;
    }>;

    fillRegionQuad(
      A: { x: number; y: number },
      B: { x: number; y: number },
      C: { x: number; y: number },
      D: { x: number; y: number },
    ): Iterable<{
      T: number[];
      t1: number;
      t2: number;
      aspect: number;
    }>;
  }
}
