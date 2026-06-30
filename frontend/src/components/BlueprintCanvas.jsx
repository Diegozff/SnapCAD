import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { dimensionDisplay } from "../lib/scale.js";

/* ------------------------------------------------------------------ */
/* Drawing constants (normalized pixel space, ~1000 units wide)       */
/* ------------------------------------------------------------------ */
const PART_STROKE = 2.4;
const DIM_STROKE = 1.3;
const EXT_GAP = 7;
const EXT_OVER = 9;
const DIM_OFFSET = 38;
const FONT = 22;
const MIN_K = 0.4;
const MAX_K = 8;
const SNAP_DIST = 18;

const THEMES = {
  blueprint: {
    bg: "#0E2A44", grid: "#16395C", part: "#CFE6F7", dim: "#8FC7F0",
    text: "#EAF4FD", sel: "#3D92E0", selText: "#FFFFFF", accent: "#F4B740",
  },
  white: {
    bg: "#FFFFFF", grid: "#E4ECF3", part: "#11314E", dim: "#1E4D75",
    text: "#11314E", sel: "#2D7DD2", selText: "#11314E", accent: "#D98A00",
  },
};

/* ----------------------------- vector helpers ----------------------------- */
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
const len = (a) => Math.hypot(a.x, a.y) || 1;
const norm = (a) => scale(a, 1 / len(a));
const perp = (a) => ({ x: -a.y, y: a.x });
const dot = (a, b) => a.x * b.x + a.y * b.y;
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

/** Snap candidates: line ends, circle/arc centers, rect corners. */
function snapPointsOf(entities) {
  const pts = [];
  for (const e of entities) {
    if (e.type === "line") pts.push({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 });
    else if (e.type === "circle" || e.type === "arc") pts.push({ x: e.cx, y: e.cy });
    else if (e.type === "rect")
      pts.push(
        { x: e.x, y: e.y }, { x: e.x + e.w, y: e.y },
        { x: e.x, y: e.y + e.h }, { x: e.x + e.w, y: e.y + e.h }
      );
  }
  return pts;
}

function uprightAngle(dx, dy) {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return a;
}

function linearOffset(dim, centroid) {
  const dir = norm(sub({ x: dim.x2, y: dim.y2 }, { x: dim.x1, y: dim.y1 }));
  const n = perp(dir);
  const mid = { x: (dim.x1 + dim.x2) / 2, y: (dim.y1 + dim.y2) / 2 };
  const side = Math.sign(dot(sub(mid, centroid), n)) || 1;
  return dim.offset != null ? dim.offset : DIM_OFFSET * side;
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
function Dimension({ dim, ratio, centroid, theme, selected, onDown }) {
  const stroke = selected ? theme.sel : theme.dim;
  const sw = selected ? DIM_STROKE * 1.7 : DIM_STROKE;
  const label = dimensionDisplay(dim, ratio);
  const markerId = selected ? "arrowSel" : "arrow";
  const down = (e) => onDown(e, dim);
  const labelStyle = { paintOrder: "stroke", stroke: theme.bg, strokeWidth: 4 };

  if (dim.kind === "linear") {
    const p1 = { x: dim.x1, y: dim.y1 };
    const p2 = { x: dim.x2, y: dim.y2 };
    const dir = norm(sub(p2, p1));
    const n = perp(dir);
    const offset = linearOffset(dim, centroid);
    const sgn = Math.sign(offset) || 1;
    const off = scale(n, offset);
    const A = add(p1, off);
    const B = add(p2, off);
    const w1a = add(p1, scale(n, EXT_GAP * sgn));
    const w1b = add(A, scale(n, EXT_OVER * sgn));
    const w2a = add(p2, scale(n, EXT_GAP * sgn));
    const w2b = add(B, scale(n, EXT_OVER * sgn));
    const tMid = scale(add(A, B), 0.5);
    const tPos = add(tMid, scale(n, sgn * FONT * 0.55));
    const angle = uprightAngle(B.x - A.x, B.y - A.y);

    return (
      <g className="cursor-move" onPointerDown={down}>
        <line x1={w1a.x} y1={w1a.y} x2={w1b.x} y2={w1b.y} stroke={stroke} strokeWidth={sw} />
        <line x1={w2a.x} y1={w2a.y} x2={w2b.x} y2={w2b.y} stroke={stroke} strokeWidth={sw} />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={sw}
          markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
        <text x={tPos.x} y={tPos.y} fill={selected ? theme.sel : theme.text} fontSize={FONT} fontWeight="600"
          textAnchor="middle" dominantBaseline="central"
          transform={`rotate(${angle} ${tPos.x} ${tPos.y})`} style={labelStyle}>
          {label}
        </text>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="transparent" strokeWidth={26} />
      </g>
    );
  }

  const C = { x: dim.x1, y: dim.y1 };
  const angle = dim.dirAngle != null ? dim.dirAngle : Math.atan2(-1, 1);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const reach = dim.kind === "diameter" ? dim.px / 2 : dim.px;
  const E2 = add(C, scale(dir, reach));
  const E1 = dim.kind === "diameter" ? sub(C, scale(dir, reach)) : C;
  const tPos = add(E2, scale(dir, FONT * 0.9));
  const tAngle = uprightAngle(dir.x, dir.y);

  return (
    <g className="cursor-move" onPointerDown={down}>
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke={stroke} strokeWidth={sw}
        markerEnd={`url(#${markerId})`} markerStart={dim.kind === "diameter" ? `url(#${markerId})` : undefined} />
      <text x={tPos.x} y={tPos.y} fill={selected ? theme.sel : theme.text} fontSize={FONT} fontWeight="600"
        textAnchor="middle" dominantBaseline="central"
        transform={`rotate(${tAngle} ${tPos.x} ${tPos.y})`} style={labelStyle}>
        {label}
      </text>
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke="transparent" strokeWidth={26} />
    </g>
  );
}

/* ------------------------------- canvas -------------------------------- */
const BlueprintCanvas = forwardRef(function BlueprintCanvas(
  { geometry, ratio, selectedDimId, onSelectDim, onUpdateDim, onAddDim, themeName = "blueprint" },
  ref
) {
  const theme = THEMES[themeName] || THEMES.blueprint;
  const w = geometry?.image_width || 1000;
  const h = geometry?.image_height || 1000;
  const centroid = useMemo(() => centroidOf(geometry?.entities || []), [geometry]);
  const snaps = useMemo(() => snapPointsOf(geometry?.entities || []), [geometry]);

  const svgRef = useRef(null);
  useImperativeHandle(ref, () => svgRef.current);

  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [addMode, setAddMode] = useState(false);
  const [addStart, setAddStart] = useState(null);
  const [cursor, setCursor] = useState(null);
  const drag = useRef({ mode: null, dimId: null, last: null, moved: false });

  useEffect(() => {
    setView({ k: 1, x: 0, y: 0 });
    setAddMode(false);
    setAddStart(null);
  }, [geometry]);

  const userCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const u = pt.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  };

  const snap = (p) => {
    let best = null, bd = SNAP_DIST / view.k;
    for (const s of snaps) {
      const d = len(sub(s, p));
      if (d < bd) { bd = d; best = s; }
    }
    return best || p;
  };

  const zoomAt = (p, factor) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K);
      const real = k / v.k;
      return { k, x: p.x - (p.x - v.x) * real, y: p.y - (p.y - v.y) * real };
    });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(userCoords(e.clientX, e.clientY), e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- dimension drag (start from the dimension element) ---- */
  const startDimDrag = (e, dim) => {
    if (addMode) return;
    e.stopPropagation();
    drag.current = { mode: "dim", dimId: dim.id, last: userCoords(e.clientX, e.clientY), moved: false };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const dragDimension = (cur, delta) => {
    const dim = geometry.dimensions.find((d) => d.id === drag.current.dimId);
    if (!dim) return;
    if (dim.kind === "linear") {
      const n = perp(norm(sub({ x: dim.x2, y: dim.y2 }, { x: dim.x1, y: dim.y1 })));
      const curOff = linearOffset(dim, centroid);
      onUpdateDim(dim.id, { offset: curOff + dot(delta, n) });
    } else {
      const v = sub(cur, { x: dim.x1, y: dim.y1 });
      onUpdateDim(dim.id, { dirAngle: Math.atan2(v.y, v.x) });
    }
  };

  /* ---- background pointer (pan, or place add-points) ---- */
  const onPointerDown = (e) => {
    const cur = userCoords(e.clientX, e.clientY);
    if (addMode) { drag.current = { mode: "add", last: cur, moved: false }; return; }
    drag.current = { mode: "pan", last: cur, moved: false };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const cur = userCoords(e.clientX, e.clientY);
    if (addMode) setCursor(cur);
    const ds = drag.current;
    if (!ds.mode) return;
    const delta = sub(cur, ds.last);
    ds.last = cur;
    if (Math.abs(delta.x) + Math.abs(delta.y) > 3 / view.k) ds.moved = true;
    if (ds.mode === "pan") setView((v) => ({ ...v, x: v.x + delta.x, y: v.y + delta.y }));
    else if (ds.mode === "dim") dragDimension(cur, delta);
  };

  const onPointerUp = (e) => {
    const ds = drag.current;
    const cur = userCoords(e.clientX, e.clientY);
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    if (ds.mode === "dim" && !ds.moved) onSelectDim(ds.dimId);
    else if (ds.mode === "pan" && !ds.moved) onSelectDim(null);
    else if (ds.mode === "add" && !ds.moved) placePoint(cur);
    drag.current = { mode: null, dimId: null, last: null, moved: false };
  };

  const placePoint = (p) => {
    const sp = snap(p);
    if (!addStart) { setAddStart(sp); return; }
    const px = len(sub(sp, addStart));
    if (px > 5) {
      const n = geometry.dimensions.length + 1;
      onAddDim({
        id: `u${Date.now().toString(36)}`,
        kind: "linear",
        x1: addStart.x, y1: addStart.y, x2: sp.x, y2: sp.y,
        px, label: `C${n}`,
      });
    }
    setAddStart(null);
    setAddMode(false);
  };

  const toggleAdd = () => {
    setAddMode((m) => !m);
    setAddStart(null);
  };

  if (!geometry) return null;
  const center = () => ({ x: w / 2, y: h / 2 });
  const cursorClass = addMode ? "cursor-crosshair" : drag.current.mode === "pan" ? "cursor-grabbing" : "cursor-grab";
  const snappedCursor = addMode && cursor ? snap(cursor) : null;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-full w-full touch-none ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
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

        <rect x="0" y="0" width={w} height={h} fill={theme.bg} />
        <rect x="0" y="0" width={w} height={h} fill="url(#grid)" />

        <g id="snapcad-content" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {geometry.entities.map((e) => (
            <Entity key={e.id} e={e} color={theme.part} />
          ))}
          <g style={{ pointerEvents: addMode ? "none" : "auto" }}>
            {geometry.dimensions.map((dm) => (
              <Dimension key={dm.id} dim={dm} ratio={ratio} centroid={centroid} theme={theme}
                selected={selectedDimId === dm.id} onDown={startDimDrag} />
            ))}
          </g>

          {/* add-dimension preview */}
          {addMode && addStart && snappedCursor && (
            <line x1={addStart.x} y1={addStart.y} x2={snappedCursor.x} y2={snappedCursor.y}
              stroke={theme.accent} strokeWidth={DIM_STROKE * 1.5} strokeDasharray="8 6" />
          )}
          {addMode && addStart && (
            <circle cx={addStart.x} cy={addStart.y} r={6 / view.k} fill={theme.accent} />
          )}
          {snappedCursor && (
            <circle cx={snappedCursor.x} cy={snappedCursor.y} r={6 / view.k}
              fill="none" stroke={theme.accent} strokeWidth={2 / view.k} />
          )}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute left-4 top-4 flex flex-col overflow-hidden rounded-lg border border-navy-600 bg-navy-900/80 backdrop-blur">
        <button onClick={() => zoomAt(center(), 1.25)} className="px-3 py-2 text-lg leading-none text-brand-200 hover:bg-navy-700" title="Acercar">+</button>
        <button onClick={() => zoomAt(center(), 1 / 1.25)} className="border-t border-navy-700 px-3 py-2 text-lg leading-none text-brand-200 hover:bg-navy-700" title="Alejar">−</button>
        <button onClick={() => setView({ k: 1, x: 0, y: 0 })} className="border-t border-navy-700 px-3 py-1.5 text-[10px] font-semibold text-brand-200 hover:bg-navy-700" title="Restablecer vista">1:1</button>
      </div>

      {/* add-dimension tool */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <button
          onClick={toggleAdd}
          className={[
            "rounded-lg border px-3 py-2 text-sm font-semibold backdrop-blur transition",
            addMode
              ? "border-amber-400 bg-amber-400/90 text-navy-900"
              : "border-navy-600 bg-navy-900/80 text-brand-200 hover:bg-navy-700",
          ].join(" ")}
        >
          ＋ Cota
        </button>
        {addMode && (
          <div className="max-w-[210px] rounded-lg border border-amber-400/50 bg-navy-900/85 px-3 py-2 text-right text-xs text-amber-200 backdrop-blur">
            {addStart ? "Clic en el 2.º punto" : "Clic en el 1.er punto"} · se ajusta a vértices y centros
          </div>
        )}
      </div>
    </div>
  );
});

export default BlueprintCanvas;
