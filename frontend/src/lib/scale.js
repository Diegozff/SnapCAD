/**
 * Scale math for SnapCAD.
 *
 * The whole "scale trick" reduces to a single ratio (millimetres per pixel)
 * derived from one user-supplied reference dimension:
 *
 *     ratio = real_mm / reference.px
 *
 * Every other dimension's real value is then `dim.px * ratio`.
 */

/** Compute mm-per-pixel from a reference dimension and its real mm value. */
export function computeRatio(referencePx, realMm) {
  if (!referencePx || referencePx <= 0) return null;
  if (!realMm || realMm <= 0) return null;
  return realMm / referencePx;
}

/** Format a pixel measurement as a real mm string, given the active ratio. */
export function formatMeasure(px, ratio) {
  if (ratio == null) return null;
  const mm = px * ratio;
  // Nice rounding: integers when close, otherwise 1–2 decimals.
  if (mm >= 100) return `${Math.round(mm)}`;
  if (mm >= 10) return mm.toFixed(1);
  return mm.toFixed(2);
}

/**
 * Build the display label for a dimension.
 * - With a ratio: shows the computed mm value (with Ø for diameters).
 * - Without a ratio: shows the model's default label (e.g. "W1").
 */
export function dimensionDisplay(dim, ratio) {
  const measure = formatMeasure(dim.px, ratio);
  if (measure == null) return dim.label || "?";
  const prefix = dim.kind === "diameter" ? "Ø" : dim.kind === "radius" ? "R" : "";
  return `${prefix}${measure}`;
}
