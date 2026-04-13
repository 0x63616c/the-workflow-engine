/**
 * Resize a canvas to fill its parent container (not the window).
 * Returns the CSS (logical) width and height.
 */
export function resizeCanvasToParent(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const parent = canvas.parentElement;
  const w = parent ? parent.clientWidth : canvas.clientWidth;
  const h = parent ? parent.clientHeight : canvas.clientHeight;
  const dpr = window.devicePixelRatio;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  return { width: w, height: h };
}

/**
 * Get the CSS (logical) dimensions of a canvas from its backing store size.
 */
export function canvasLogicalSize(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const dpr = window.devicePixelRatio;
  return { width: canvas.width / dpr, height: canvas.height / dpr };
}
