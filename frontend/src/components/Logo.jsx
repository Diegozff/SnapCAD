import { useState } from "react";

/**
 * SnapCAD logo.
 *
 * Uses the real brand image at `/logo.png` (place your uploaded logo file in
 * `frontend/public/logo.png`). If that file is missing, it gracefully falls
 * back to a built-in SVG mark so the header is never broken.
 */
export default function Logo({ size = 52 }) {
  const [imgOk, setImgOk] = useState(true);

  if (imgOk) {
    return (
      <img
        src="/logo.png"
        alt="SnapCAD"
        onError={() => setImgOk(false)}
        style={{ height: size }}
        className="w-auto select-none rounded-md bg-white/95 p-1 shadow-sm"
      />
    );
  }

  // Fallback mark (shown only until /logo.png exists).
  return (
    <div className="flex items-center gap-3 select-none">
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
      <div className="leading-none">
        <div className="text-xl font-extrabold tracking-tight text-white">
          SNAP<span className="text-brand-400">CAD</span>
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-brand-300">
          SNAPSHOT TO CAD
        </div>
      </div>
    </div>
  );
}
