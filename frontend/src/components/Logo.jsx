import { useState } from "react";

/**
 * SnapCAD logo.
 *
 *   <Logo />                -> header lockup: real icon + "SNAPCAD" wordmark
 *   <Logo variant="full" /> -> full brand image on a clean card (landing)
 *
 * Assets live in `frontend/public/`:
 *   - logo.png       full brand image (icon + wordmark + tagline)
 *   - logo-icon.png  transparent icon only (camera + aperture + gear)
 */
export default function Logo({ variant = "header" }) {
  return variant === "full" ? <FullLogo /> : <HeaderLogo />;
}

function HeaderLogo() {
  const [ok, setOk] = useState(true);
  return (
    <div className="flex select-none items-center gap-3">
      {ok ? (
        <div className="rounded-lg bg-white p-1.5 shadow-sm">
          <img
            src="/logo-icon.png"
            alt=""
            onError={() => setOk(false)}
            className="h-9 w-auto"
          />
        </div>
      ) : (
        <FallbackMark size={40} />
      )}
      <div className="leading-none">
        <div className="text-2xl font-extrabold tracking-tight text-white">
          SNAP<span className="text-brand-400">CAD</span>
        </div>
        <div className="text-[10px] font-semibold tracking-[0.22em] text-brand-300">
          SNAPSHOT TO CAD
        </div>
      </div>
    </div>
  );
}

function FullLogo() {
  const [ok, setOk] = useState(true);
  if (!ok) return <HeaderLogo />;
  return (
    <div className="inline-block rounded-2xl bg-white p-5 shadow-xl shadow-black/30 ring-1 ring-black/5">
      <img
        src="/logo.png"
        alt="SnapCAD — Snapshot to CAD"
        onError={() => setOk(false)}
        className="h-44 w-auto"
      />
    </div>
  );
}

/** Built-in SVG mark, used only if the image assets are missing. */
function FallbackMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="SnapCAD">
      <rect width="64" height="64" rx="14" fill="#122E4A" />
      <rect x="20" y="10" width="22" height="8" rx="2" fill="#5BA8E8" />
      <circle cx="32" cy="35" r="17" fill="#163A5C" stroke="#3D92E0" strokeWidth="2.5" />
      <g stroke="#5BA8E8" strokeWidth="1.6" fill="none" opacity="0.9">
        <path d="M32 35 L32 19" /><path d="M32 35 L46 27" /><path d="M32 35 L46 43" />
        <path d="M32 35 L32 51" /><path d="M32 35 L18 43" /><path d="M32 35 L18 27" />
      </g>
      <circle cx="32" cy="35" r="6.5" fill="#2D7DD2" />
    </svg>
  );
}
