/** Export helpers: download the blueprint as a real-vector .svg or .pdf. */
import { jsPDF } from "jspdf";
import "svg2pdf.js"; // augments jsPDF with .svg()

const CONTENT_ID = "snapcad-content";

/**
 * Serialize the SVG. Pan/zoom lives on the #snapcad-content group; we strip
 * that transform on the clone so exports always show the full, centered drawing
 * regardless of the on-screen view.
 */
function serialize(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const content = clone.querySelector(`#${CONTENT_ID}`);
  if (content) content.removeAttribute("transform");
  return clone;
}

function dims(svgEl) {
  const vb = svgEl.viewBox.baseVal;
  return { w: vb.width || svgEl.clientWidth || 1000, h: vb.height || svgEl.clientHeight || 1000 };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fitToPage(pdf, w, h) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const r = Math.min((pw - margin * 2) / w, (ph - margin * 2) / h);
  return { dw: w * r, dh: h * r, ox: (pw - w * r) / 2, oy: (ph - h * r) / 2 };
}

export function downloadSVG(svgEl, name = "snapcad-plano") {
  if (!svgEl) return;
  const str = new XMLSerializer().serializeToString(serialize(svgEl));
  triggerDownload(new Blob([str], { type: "image/svg+xml;charset=utf-8" }), `${safe(name)}.svg`);
}

export async function downloadPDF(svgEl, name = "snapcad-plano") {
  if (!svgEl) return;
  const { w, h } = dims(svgEl);
  const orientation = w >= h ? "landscape" : "portrait";
  const clone = serialize(svgEl);

  // --- Preferred path: true vector via svg2pdf ---
  try {
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const { dw, dh, ox, oy } = fitToPage(pdf, w, h);
    await pdf.svg(clone, { x: ox, y: oy, width: dw, height: dh });
    pdf.save(`${safe(name)}.pdf`);
    return;
  } catch (err) {
    console.warn("Vector PDF failed, falling back to raster:", err);
  }

  // --- Fallback: rasterize the SVG into the PDF ---
  await rasterPDF(clone, w, h, orientation, name);
}

async function rasterPDF(cloneEl, w, h, orientation, name) {
  const str = new XMLSerializer().serializeToString(cloneEl);
  const url = URL.createObjectURL(new Blob([str], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const s = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * s;
    canvas.height = h * s;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const { dw, dh, ox, oy } = fitToPage(pdf, w, h);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", ox, oy, dw, dh);
    pdf.save(`${safe(name)}.pdf`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function safe(name) {
  return (name || "snapcad-plano").replace(/[^\w.-]+/g, "_").slice(0, 60);
}
