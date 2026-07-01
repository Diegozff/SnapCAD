import { useEffect, useRef, useState } from "react";
import Logo from "./components/Logo.jsx";
import Dropzone from "./components/Dropzone.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BlueprintCanvas from "./components/BlueprintCanvas.jsx";
import { analyzeImage } from "./api.js";
import { computeRatio } from "./lib/scale.js";
import { downloadPDF, downloadSVG } from "./lib/export.js";
import { DEMO_GEOMETRY } from "./lib/demoData.js";

export default function App() {
  const [imageURL, setImageURL] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [ratio, setRatio] = useState(null);
  const [selectedDimId, setSelectedDimId] = useState(null);
  const [themeName, setThemeName] = useState("blueprint");
  const [isDemo, setIsDemo] = useState(false);

  // Undo/redo history of geometry snapshots.
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const svgRef = useRef(null);

  /** Snapshot the current geometry before a mutating interaction. */
  function beginHistory() {
    if (!geometry) return;
    setPast((p) => [...p, geometry]);
    setFuture([]);
  }

  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [geometry, ...f]);
    setPast((p) => p.slice(0, -1));
    setGeometry(prev);
    setSelectedDimId(null);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setPast((p) => [...p, geometry]);
    setFuture((f) => f.slice(1));
    setGeometry(next);
    setSelectedDimId(null);
  }

  function loadDemo() {
    setError(null);
    setLoading(false);
    setImageURL(null);
    setRatio(null);
    setSelectedDimId(null);
    setIsDemo(true);
    setPast([]);
    setFuture([]);
    // Deep-clone so edits never mutate the shared sample.
    setGeometry(structuredClone(DEMO_GEOMETRY));
  }

  async function handleFile(file) {
    setError(null);
    setLoading(true);
    setGeometry(null);
    setRatio(null);
    setSelectedDimId(null);
    setIsDemo(false);
    setPast([]);
    setFuture([]);
    setImageURL(URL.createObjectURL(file));
    try {
      const data = await analyzeImage(file);
      setGeometry(data);
    } catch (e) {
      setError(e.message || "Error inesperado al analizar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  function setReference(dim, realMm) {
    const r = computeRatio(dim.px, realMm);
    if (r != null) setRatio(r);
  }

  function renameDim(id, label) {
    setGeometry((g) => ({
      ...g,
      dimensions: g.dimensions.map((d) => (d.id === id ? { ...d, label } : d)),
    }));
  }

  function deleteDim(id) {
    beginHistory();
    setGeometry((g) => ({ ...g, dimensions: g.dimensions.filter((d) => d.id !== id) }));
    if (selectedDimId === id) setSelectedDimId(null);
  }

  // Live mutator used during drags and rename — history is snapshotted by the
  // caller (beginHistory) at the start of the interaction.
  function updateDim(id, patch) {
    setGeometry((g) => ({
      ...g,
      dimensions: g.dimensions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }

  function addDim(dim) {
    beginHistory();
    setGeometry((g) => ({ ...g, dimensions: [...g.dimensions, dim] }));
    setSelectedDimId(dim.id);
  }

  function reset() {
    setGeometry(null);
    setImageURL(null);
    setError(null);
    setRatio(null);
    setSelectedDimId(null);
    setIsDemo(false);
    setPast([]);
    setFuture([]);
  }

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z or Ctrl+Y (redo).
  useEffect(() => {
    function onKey(e) {
      if (!geometry) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-bind each render so undo/redo close over current state

  const showWorkspace = geometry || loading || error;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-navy-700 bg-navy-900/80 px-6 py-3 backdrop-blur">
        <Logo />
        <a
          href="https://docs.claude.com/en/docs/about-claude/models"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs text-brand-200 hover:text-brand-300 sm:block"
        >
          Motor: Claude Opus 4.8 Vision
        </a>
      </header>

      {/* Body */}
      {!showWorkspace ? (
        <Landing onFile={handleFile} onDemo={loadDemo} />
      ) : (
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
          {/* Sidebar */}
          <div className="hidden border-r border-navy-700 lg:block">
            {geometry && (
              <Sidebar
                geometry={geometry}
                ratio={ratio}
                selectedDimId={selectedDimId}
                onSelectDim={setSelectedDimId}
                onSetReference={setReference}
                onRenameDim={renameDim}
                onDeleteDim={deleteDim}
                onBeginHistory={beginHistory}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onReset={reset}
                themeName={themeName}
                onToggleTheme={() =>
                  setThemeName((t) => (t === "blueprint" ? "white" : "blueprint"))
                }
                onExportSVG={() => downloadSVG(svgRef.current, geometry.part_name)}
                onExportPDF={() => downloadPDF(svgRef.current, geometry.part_name)}
              />
            )}
          </div>

          {/* Canvas area */}
          <main className="relative flex flex-col overflow-hidden bg-[#0b1f33]">
            {loading && <LoadingState />}
            {error && <ErrorState message={error} onRetry={reset} />}
            {geometry && (
              <>
                <div className="flex-1 overflow-hidden p-4">
                  <BlueprintCanvas
                    ref={svgRef}
                    geometry={geometry}
                    ratio={ratio}
                    selectedDimId={selectedDimId}
                    onSelectDim={setSelectedDimId}
                    onUpdateDim={updateDim}
                    onAddDim={addDim}
                    onBeginHistory={beginHistory}
                    themeName={themeName}
                  />
                </div>
                {imageURL && (
                  <div className="absolute bottom-4 right-4 w-32 overflow-hidden rounded-lg border border-navy-600 shadow-lg">
                    <img src={imageURL} alt="Foto original" className="block w-full" />
                  </div>
                )}
                {isDemo && (
                  <div className="absolute left-4 top-4 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy-900 shadow">
                    Demo
                  </div>
                )}
                {ratio == null && (
                  <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-brand-500/90 px-4 py-1.5 text-xs font-semibold text-white shadow">
                    Selecciona una cota e introduce su medida real para escalar el plano
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ sub-views ------------------------------ */
function Landing({ onFile, onDemo }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8 flex justify-center">
          <Logo variant="full" />
        </div>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          De la foto al <span className="text-brand-400">plano CAD</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-brand-200">
          Sube la foto de una pieza mecánica. SnapCAD detecta su geometría, dibuja
          el croquis técnico y calcula todas las cotas a partir de una sola medida
          de referencia.
        </p>
        <div className="mt-8">
          <Dropzone onFile={onFile} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <span className="text-brand-200/70">¿Sin API key?</span>
          <button
            onClick={onDemo}
            className="rounded-lg border border-brand-500 px-4 py-2 font-semibold text-brand-300 transition hover:bg-brand-500/10"
          >
            Ver ejemplo →
          </button>
        </div>
        <p className="mt-4 text-xs text-brand-200/70">
          Tus imágenes se procesan con Claude Opus 4.8 Vision.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy-600 border-t-brand-400" />
      <div>
        <p className="font-semibold text-white">Analizando la geometría…</p>
        <p className="text-sm text-brand-200">
          Claude está extrayendo aristas, círculos y cotas.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-2xl">
        ⚠️
      </div>
      <div>
        <p className="font-semibold text-white">No se pudo analizar la imagen</p>
        <p className="mt-1 max-w-md text-sm text-brand-200">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
