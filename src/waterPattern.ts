// Tileable stipple pattern generator for the water fill. 
//
// Uses Mitchell's best-candidate algorithm — a cheap Poisson-disk
// approximation. For each new dot, sample N random candidates and pick
// the one farthest from any existing dot. Distances are computed on a
// torus (wrap around the canvas edges) so the pattern tiles seamlessly.
// Without toroidal distance, edge dots cluster against the boundary and
// adjacent tiles show visible seams.
//
// The dots are also drawn with their 8 wrapped twins so any dot that
// straddles an edge appears partially on the opposite edge — that's
// the rendering side of the tileability invariant.
//
// Output is an ImageData ready for map.addImage(). Pattern is rendered
// as ink dots over a paper background so the layer is self-contained
// regardless of any underlying fill-color.

export type StippleOptions = {
  size?: number;        // logical pixel size of the tile (square)
  count?: number;       // number of dots per tile
  radius?: number;      // dot radius in logical pixels
  pixelRatio?: number;  // canvas oversample factor (passed to addImage)
  candidates?: number;  // candidates per dot for best-candidate selection
};

const DEFAULTS: Required<StippleOptions> = {
  size: 64,
  count: 48,
  radius: 0.5,
  pixelRatio: 2,
  candidates: 24,
};

const toroidalDistSq = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  size: number,
): number => {
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  if (dx > size / 2) dx = size - dx;
  if (dy > size / 2) dy = size - dy;
  return dx * dx + dy * dy;
};

export const makeStipplePattern = (
  ink: string,
  paper: string,
  opts: StippleOptions = {},
): ImageData => {
  const o = { ...DEFAULTS, ...opts };
  const px = o.size * o.pixelRatio;

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, px, px);

  const dots: Array<[number, number]> = [
    [Math.random() * o.size, Math.random() * o.size],
  ];

  for (let i = 1; i < o.count; i++) {
    let bestX = 0;
    let bestY = 0;
    let bestMinDistSq = -1;
    for (let c = 0; c < o.candidates; c++) {
      const cx = Math.random() * o.size;
      const cy = Math.random() * o.size;
      let minDistSq = Infinity;
      for (const [dx, dy] of dots) {
        const d = toroidalDistSq(cx, cy, dx, dy, o.size);
        if (d < minDistSq) minDistSq = d;
      }
      if (minDistSq > bestMinDistSq) {
        bestMinDistSq = minDistSq;
        bestX = cx;
        bestY = cy;
      }
    }
    dots.push([bestX, bestY]);
  }

  ctx.fillStyle = ink;
  const r = o.radius * o.pixelRatio;
  for (const [x, y] of dots) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cx = (x + ox * o.size) * o.pixelRatio;
        const cy = (y + oy * o.size) * o.pixelRatio;
        if (cx + r < 0 || cx - r > px || cy + r < 0 || cy - r > px) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return ctx.getImageData(0, 0, px, px);
};
