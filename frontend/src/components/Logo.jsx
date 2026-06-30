/** Inline SVG recreation of the SnapCAD logo (camera aperture + blueprint). */
export default function Logo({ size = 40 }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SnapCAD"
      >
        <rect width="64" height="64" rx="14" fill="#122E4A" />
        <rect x="20" y="10" width="22" height="8" rx="2" fill="#5BA8E8" />
        <circle cx="32" cy="35" r="17" fill="#163A5C" stroke="#3D92E0" strokeWidth="2.5" />
        {/* aperture blades */}
        <g stroke="#5BA8E8" strokeWidth="1.6" fill="none" opacity="0.9">
          <path d="M32 35 L32 19" />
          <path d="M32 35 L46 27" />
          <path d="M32 35 L46 43" />
          <path d="M32 35 L32 51" />
          <path d="M32 35 L18 43" />
          <path d="M32 35 L18 27" />
        </g>
        <circle cx="32" cy="35" r="6.5" fill="#2D7DD2" />
        {/* tiny dimension tick */}
        <g stroke="#8FC7F0" strokeWidth="1.4">
          <path d="M50 52 L58 52" />
          <path d="M50 50 L50 54" />
          <path d="M58 50 L58 54" />
        </g>
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
