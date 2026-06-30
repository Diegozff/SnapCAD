/** Thin API client for the SnapCAD backend. */

const BASE = import.meta.env.VITE_API_BASE || "";

/**
 * Upload an image and get back the structured geometry JSON.
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function analyzeImage(file) {
  const form = new FormData();
  form.append("file", file);

  let res;
  try {
    res = await fetch(`${BASE}/api/analyze`, { method: "POST", body: form });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. ¿Está corriendo el backend?"
    );
  }

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* keep generic message */
    }
    throw new Error(detail);
  }

  return res.json();
}
