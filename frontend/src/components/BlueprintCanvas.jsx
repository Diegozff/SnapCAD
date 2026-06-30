import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { dimensionDisplay } from "../lib/scale.js";

/* ------------------------------------------------------------------ */
/* Drawing constants (in the normalized pixel space, ~1000 units wide) */
/* ------------------------------------------------------------------ */
const PART_STROKE = 2.4;
const DIM_STROKE = 1.3;
const EXT_GAP = 7;
const EXT_OVER = 9;
const DIM_OFFSET = 38;
const FONT = 22;
const MIN_K = 0.4;
const MAX_K = 8;

const THEMES = {
  blueprint: {
    bg: "#0E2A44", grid: "#16395C", part: "#CFE6F7", dim: "#8FC7F0",
    text: "#EAF4FD", sel: "#3D92E0", selText: "#FFFFFF",
  },
  white: {
    bg: "#FFFFFF", grid: "#E4ECF3", part: "#11314E", dim: "#1E4D75",
    text: "#11314E", sel: "#2D7DD2", selText: "#11314E",
  },
};

/* ----------------------------- vector helpers ----------------------------- */
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
const len = (a) => Math.hypot(a.x, a.y) || 1;
const norm = (a) => scale(a, 1 / len(a));
const perp = (a) => ({ x: -a.y, y: a.x });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function centroidOf(entities) {
  const pts = [];
  for (const e of entities) {
    if (e.type === "line") pts.push({ x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 });
    else if (e.type === "circle" || e.type === "arc") pts.push({ x: e.cx, y: e.cy });
    else if (e.type === "rect") pts.push({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
  }
  if (!pts.length) return { x: 500, y: 500 };
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

function uprightAngle(dx, dy) {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return a;
}

/* --------------------------- entity rendering --------------------------- */
function Entity({ e, color }) {
  const common = { stroke: color, strokeWidth: PART_STROKE, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  if (e.type === "line") return <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} {...common} />;
  if (e.type === "circle") return <circle cx={e.cx} cy={e.cy} r={e.r} {...common} />;
  if (e.type === "rect") return <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={1} {...common} />;
  if (e.type === "arc") {
    const a0 = (e.start_angle * Math.PI) / 180;
    const a1 = (e.end_angle * Math.PI) / 180;
    const steps = 28;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = a0 + ((a1 - a0) * i) / steps;
      d += `${i === 0 ? "M" : "L"}${(e.cx + e.r * Math.cos(t)).toFixed(2)},${(e.cy + e.r * Math.sin(t)).toFixed(2)} `;
    }
    return <path d={d} {...common} />;
  }
  return null;
}

/* -------------------------- dimension rendering -------------------------- */
function Dimension({ dim, ratio, centroid, theme, selected, onSelect }) {
  const stroke = selected ? theme.sel : theme.dim;
  const textFill = selected ? theme.sel : theme.text;
  const sw = selected ? DIM_STROKE * 1.7 : DIM_STROKE;
  const label = dimensionDisplay(dim, ratio);
  const markerId = selected ? "arrowSel" : "arrow";
  const click = (e) => { e.stopPropagation(); onSelect(dim.id); };

  if (dim.kind === "linear") {
    const p1 = { x: dim.x1, y: dim.y1 };
    const p2 = { x: dim.x2, y: dim.y2 };
    const dir = norm(sub(p2, p1));
    const n = perp(dir);
    const mid = scale(add(p1, p2), 0.5);
    const side = Math.sign((mid.x - centroid.x) * n.x + (mid.y - centroid.y) * n.y) || 1;
    const off = scale(n, DIM_OFFSET * side);
    const A = add(p1, off);
    const B = add(p2, off);
    const w1a = add(p1, scale(n, EXT_GAP * side));
    const w1b = add(A, scale(n, EXT_OVER * side));
    const w2a = add(p2, scale(n, EXT_GAP * side));
    const w2b = add(B, scale(n, EXT_OVER * side));
    const tMid = scale(add(A, B), 0.5);
    const tPos = add(tMid, scale(n, side * FONT * 0.55));
    const angle = uprightAngle(B.x - A.x, B.y - A.y);

    return (
      <g className="cursor-pointer" onClick={click}>
        <line x1={w1a.x} y1={w1a.y} x2={w1b.x} y2={w1b.y} stroke={stroke} strokeWidth={sw} />
        <line x1={w2a.x} y1={w2a.y} x2={w2b.x} y2={w2b.y} stroke={stroke} strokeWidth={sw} />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={sw}
          markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
        <text x={tPos.x} y={tPos.y} fill={textFill} fontSize={FONT} fontWeight="600"
          textAnchor="middle" dominantBaseline="central"
          transform={`rotate(${angle} ${tPos.x} ${tPos.y})`}
          style={{ paintOrder: "stroke", stroke: theme.bg, strokeWidth: 4 }}>
          {label}
        </text>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="transparent" strokeWidth={26} />
      </g>
    );
  }

  const C = { x: dim.x1, y: dim.y1 };
  const dir = norm({ x: 1, y: -1 });
  const reach = dim.kind === "diameter" ? dim.px / 2 : dim.px;
  const E2 = add(C, scale(dir, reach));
  const E1 = dim.kind === "diameter" ? sub(C, scale(dir, reach)) : C;
  const tPos = add(E2, scale(dir, FONT * 0.9));
  const angle = uprightAngle(dir.x, dir.y);

  return (
    <g className="cursor-pointer" onClick={click}>
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke={stroke} strokeWidth={sw}
        markerEnd={`url(#${markerId})`} markerStart={dim.kind === "diameter" ? `url(#${markerId})` : undefined} />
      <text x={tPos.x} y={tPos.y} fill={textFill} fontSize={FONT} fontWeight="600"
        textAnchor="middle" dominantBaseline="central"
        transform={`rotate(${angle} ${tPos.x} ${tPos.y})`}
        style={{ paintOrder: "stroke", stroke: theme.bg, strokeWidth: 4 }}>
        {label}
      </text>
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke="transparent" strokeWidth={26} />
    </g>
  );
}

/* ------------------------------- canvas -------------------------------- */
const BlueprintCanvas = forwardRef(function BlueprintCanvas(
  { geometry, ratio, selectedDimId, onSelectDim, themeName = "blueprint" },
  ref
) {
  const theme = THEMES[themeName] || THEMES.blueprint;
  const w = geometry?.image_width || 1000;
  const h = geometry?.image_height || 1000;
  const centroid = useMemo(() => centroidOf(geometry?.entities || []), [geometry]);

  const svgRef = useRef(null);
  useImperativeHandle(ref, () => svgRef.current);

  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef({ active: false, moved: false, last: null });

  // reset view whenever a new part loads
  useEffect(() => { setView({ k: 1, x: 0, y: 0 }); }, [geometry]);

  const userCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const u = pt.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  };

  const zoomAt = (p, factor) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K);
      const real = k / v.k;
      return { k, x: p.x - (p.x - v.x) * real, y: p.y - (p.y - v.y) * real };
    });
  };

  // non-passive wheel listener so we can preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(userCoords(e.clientX, e.clientY), e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e) => {
    drag.current = { active: true, moved: false, last: userCoords(e.clientX, e.clientY) };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const cur = userCoords(e.clientX, e.clientY);
    const d = sub(cur, drag.current.last);
    if (Math.abs(d.x) + Math.abs(d.y) > 3) drag.current.moved = true;
    drag.current.last = cur;
    setView((v) => ({ ...v, x: v.x + d.x, y: v.y + d.y }));
  };
  const endDrag = (e) => {
    if (drag.current.active) svgRef.current?.releasePointerCapture?.(e.pointerId);
    drag.current.active = false;
  };
  const onBgClick = () => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    onSelectDim(null);
  };

  if (!geometry) return null;
  const center = () => ({ x: w / 2, y: h / 2 });

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-full w-full touch-none ${drag.current.active ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={onBgClick}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14"
            orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <path d="M0,1 L9,5 L0,9 z" fill={theme.dim} />
          </marker>
          <marker id="arrowSel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="16" markerHeight="16"
            orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <path d="M0,1 L9,5 L0,9 z" fill={theme.sel} />
          </marker>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke={theme.grid} strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* fixed background + grid (outside the pan/zoom group) */}
        <rect x="0" y="0" width={w} height={h} fill={theme.bg} />
        <rect x="0" y="0" width={w} height={h} fill="url(#grid)" />

        {/* pan/zoom content — transform stripped on export */}
        <g id="snapcad-content" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {geometry.entities.map((e) => (
            <Entity key={e.id} e={e} color={theme.part} />
          ))}
          {geometry.dimensions.map((dm) => (
            <Dimension key={dm.id} dim={dm} ratio={ratio} centroid={centroid} theme={theme}
              selected={selectedDimId === dm.id} onSelect={onSelectDim} />
          ))}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute left-4 top-4 flex flex-col overflow-hidden rounded-lg border border-navy-600 bg-navy-900/80 backdrop-blur">
        <button onClick={() => zoomAt(center(), 1.25)} className="px-3 py-2 text-lg leading-none text-brand-200 hover:bg-navy-700" title="Acercar">+</button>
        <button onClick={() => zoomAt(center(), 1 / 1.25)} className="border-t border-navy-700 px-3 py-2 text-lg leading-none text-brand-200 hover:bg-navy-700" title="Alejar">−</button>
        <button onClick={() => setView({ k: 1, x: 0, y: 0 })} className="border-t border-navy-700 px-3 py-1.5 text-[10px] font-semibold text-brand-200 hover:bg-navy-700" title="Restablecer vista">1:1</button>
      </div>
    </div>
  );
});

export default BlueprintCanvas;
