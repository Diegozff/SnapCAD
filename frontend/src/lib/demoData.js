/**
 * Sample geometry for the offline "demo" mode — no API key required.
 * Same shape the backend returns from /api/analyze.
 *
 * Part: a rectangular mounting plate / flange with a central bore and four
 * corner holes. Coordinates live in the normalized pixel space (longest side
 * ~1000), origin top-left.
 */
export const DEMO_GEOMETRY = {
  image_width: 1000,
  image_height: 760,
  part_name: "Placa de montaje (ejemplo)",
  view: "front",
  confidence: 0.92,
  entities: [
    // outer plate outline
    { id: "p1", type: "rect", x: 180, y: 150, w: 640, h: 460 },
    // central bore (two concentric circles)
    { id: "b1", type: "circle", cx: 500, cy: 380, r: 95 },
    { id: "b2", type: "circle", cx: 500, cy: 380, r: 58 },
    // four mounting holes
    { id: "h1", type: "circle", cx: 285, cy: 250, r: 28 },
    { id: "h2", type: "circle", cx: 715, cy: 250, r: 28 },
    { id: "h3", type: "circle", cx: 285, cy: 510, r: 28 },
    { id: "h4", type: "circle", cx: 715, cy: 510, r: 28 },
    // centerlines through the bore
    { id: "c1", type: "line", x1: 380, y1: 380, x2: 620, y2: 380 },
    { id: "c2", type: "line", x1: 500, y1: 260, x2: 500, y2: 500 },
  ],
  dimensions: [
    // overall width (below the plate)
    { id: "d1", kind: "linear", x1: 180, y1: 610, x2: 820, y2: 610, px: 640, label: "W1" },
    // overall height (right of the plate)
    { id: "d2", kind: "linear", x1: 820, y1: 150, x2: 820, y2: 610, px: 460, label: "H1" },
    // horizontal hole spacing (top holes)
    { id: "d3", kind: "linear", x1: 285, y1: 250, x2: 715, y2: 250, px: 430, label: "S1" },
    // vertical hole spacing (left holes)
    { id: "d4", kind: "linear", x1: 285, y1: 250, x2: 285, y2: 510, px: 260, label: "S2" },
    // central bore diameter
    { id: "d5", kind: "diameter", x1: 500, y1: 380, x2: 500, y2: 380, px: 190, label: "D1" },
    // mounting hole diameter
    { id: "d6", kind: "diameter", x1: 715, y1: 510, x2: 715, y2: 510, px: 56, label: "D2" },
  ],
};
