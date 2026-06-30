/** Export helpers: download the blueprint SVG as .svg or .pdf. */
import { jsPDF } from "jspdf";

function serialize(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blobOrUrl, filename) {
  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blobOrUrl !== "string") URL.revokeObjectURL(url);
}

export function downloadSVG(svgEl, name = "snapcad-plano") {
  if (!svgEl) return;
  const blob = new Blob([serialize(svgEl)], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `${name}.svg`);
}

export async function downloadPDF(svgEl, name = "snapcad-plano") {
  if (!svgEl) return;
  const vb = svgEl.viewBox.baseVal;
  const w = vb.width || svgEl.clientWidth || 1000;
  const h = vb.height || svgEl.clientHeight || 1000;

  const svgStr = serialize(svgEl);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    const scaleFactor = 2; // crisper raster
    const canvas = document.createElement("canvas");
    canvas.width = w * scaleFactor;
    canvas.height = h * scaleFactor;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const png = canvas.toDataURL("image/png");
    const orientation = w >= h ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const ratio = Math.min((pw - margin * 2) / w, (ph - margin * 2) / h);
    const dw = w * ratio;
    const dh = h * ratio;
    pdf.addImage(png, "PNG", (pw - dw) / 2, (ph - dh) / 2, dw, dh);
    pdf.save(`${name}.pdf`);
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
