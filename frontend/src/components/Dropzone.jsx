import { useCallback, useRef, useState } from "react";

const ACCEPT = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

/** Drag-and-drop / click-to-upload area for the part photo. */
export default function Dropzone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = useCallback(
    (files) => {
      setError(null);
      const file = files?.[0];
      if (!file) return;
      if (!ACCEPT.includes(file.type)) {
        setError("Formato no válido. Usa PNG, JPG, WEBP o GIF.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("La imagen supera los 10 MB.");
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  return (
    <div className="w-full">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          over
            ? "border-brand-400 bg-brand-500/10"
            : "border-navy-600 bg-navy-800/40 hover:border-brand-500 hover:bg-navy-800/70",
        ].join(" ")}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-brand-400">
          <path
            d="M12 16V4m0 0L8 8m4-4l4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <p className="font-semibold text-white">
            Arrastra una foto de la pieza aquí
          </p>
          <p className="text-sm text-brand-200">
            o haz clic para seleccionar &middot; PNG, JPG, WEBP &middot; máx 10 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
