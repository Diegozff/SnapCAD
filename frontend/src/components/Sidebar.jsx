import { useEffect, useState } from "react";
import { dimensionDisplay } from "../lib/scale.js";

/**
 * Left control panel: scale reference input, dimension list, theme toggle,
 * and export actions.
 */
export default function Sidebar({
  geometry,
  ratio,
  selectedDimId,
  onSelectDim,
  onSetReference,
  onRenameDim,
  onDeleteDim,
  onReset,
  themeName,
  onToggleTheme,
  onExportSVG,
  onExportPDF,
}) {
  const selected = geometry?.dimensions.find((d) => d.id === selectedDimId);
  const [mm, setMm] = useState("");
  const [label, setLabel] = useState("");

  // Sync inputs whenever the selected dimension changes.
  useEffect(() => {
    setMm("");
    setLabel(selected?.label ?? "");
  }, [selectedDimId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyReference = (e) => {
    e.preventDefault();
    const value = parseFloat(mm);
    if (!selected || !value || value <= 0) return;
    onSetReference(selected, value);
  };

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-navy-800/60 p-5">
      {/* part summary */}
      <div className="rounded-xl border border-navy-600 bg-navy-900/50 p-4">
        <div className="text-xs uppercase tracking-wider text-brand-300">Pieza detectada</div>
        <div className="mt-1 text-lg font-bold text-white">
          {geometry?.part_name || "—"}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-brand-200">
          <span>Vista: {geometry?.view || "—"}</span>
          <span className="opacity-50">·</span>
          <span>
            Confianza:{" "}
            {geometry ? `${Math.round((geometry.confidence || 0) * 100)}%` : "—"}
          </span>
        </div>
      </div>

      {/* scale reference */}
      <div className="rounded-xl border border-navy-600 bg-navy-900/50 p-4">
        <div className="text-sm font-semibold text-white">1. Define la escala</div>
        <p className="mt-1 text-xs text-brand-200">
          Selecciona una cota (en el plano o la lista) e introduce su medida real.
        </p>

        <form onSubmit={applyReference} className="mt-3 space-y-2">
          <div className="rounded-lg bg-navy-800 px-3 py-2 text-sm">
            {selected ? (
              <span className="text-white">
                Cota <b className="text-brand-300">{selected.label}</b>{" "}
                <span className="text-brand-200">({Math.round(selected.px)} px)</span>
              </span>
            ) : (
              <span className="text-brand-200">Ninguna cota seleccionada</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={mm}
              disabled={!selected}
              onChange={(e) => setMm(e.target.value)}
              placeholder="mm reales"
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-brand-200/50 focus:border-brand-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selected || !mm}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        </form>

        {ratio != null && (
          <div className="mt-3 rounded-lg bg-brand-500/15 px-3 py-2 text-xs text-brand-200">
            Escala activa: <b className="text-white">{ratio.toFixed(4)} mm/px</b>
          </div>
        )}
      </div>

      {/* edit selected dimension */}
      {selected && (
        <div className="rounded-xl border border-brand-500/40 bg-navy-900/50 p-4">
          <div className="text-sm font-semibold text-white">Editar cota</div>
          <div className="mt-2 flex gap-2">
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                onRenameDim(selected.id, e.target.value);
              }}
              placeholder="Etiqueta"
              className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
            />
            <button
              onClick={() => onDeleteDim(selected.id)}
              title="Eliminar cota"
              className="rounded-lg border border-red-500/60 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* dimension list */}
      <div className="rounded-xl border border-navy-600 bg-navy-900/50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">2. Cotas</div>
          <span className="text-xs text-brand-200">
            {geometry?.dimensions.length || 0}
          </span>
        </div>
        <ul className="mt-2 space-y-1">
          {geometry?.dimensions.map((d) => {
            const isSel = d.id === selectedDimId;
            return (
              <li key={d.id} className="group flex items-stretch gap-1">
                <button
                  onClick={() => onSelectDim(isSel ? null : d.id)}
                  className={[
                    "flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                    isSel
                      ? "bg-brand-500/25 text-white ring-1 ring-brand-400"
                      : "bg-navy-800/60 text-brand-100 hover:bg-navy-700/60",
                  ].join(" ")}
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="font-mono text-xs">
                    {ratio != null
                      ? `${dimensionDisplay(d, ratio)} mm`
                      : `${Math.round(d.px)} px`}
                  </span>
                </button>
                <button
                  onClick={() => onDeleteDim(d.id)}
                  title="Eliminar cota"
                  className="rounded-lg px-2 text-brand-200/50 transition hover:bg-red-500/15 hover:text-red-300"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* actions */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-navy-600 bg-navy-900/50 px-4 py-3">
          <span className="text-sm text-white">Estilo</span>
          <button
            onClick={onToggleTheme}
            className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-semibold text-brand-200 hover:bg-navy-600"
          >
            {themeName === "blueprint" ? "Blueprint" : "Blanco"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportSVG}
            className="rounded-lg border border-brand-500 px-3 py-2 text-sm font-semibold text-brand-300 hover:bg-brand-500/10"
          >
            ↓ SVG
          </button>
          <button
            onClick={onExportPDF}
            className="rounded-lg border border-brand-500 px-3 py-2 text-sm font-semibold text-brand-300 hover:bg-brand-500/10"
          >
            ↓ PDF
          </button>
        </div>

        <button
          onClick={onReset}
          className="w-full rounded-lg bg-navy-700 px-3 py-2 text-sm font-medium text-brand-200 hover:bg-navy-600"
        >
          Analizar otra pieza
        </button>
      </div>
    </aside>
  );
}
