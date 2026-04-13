import { resizeCanvasToParent } from "@/components/art-clock/states/canvas-utils";
import { useEffect, useRef } from "react";

const RESIZE_THROTTLE_MS = 200;

export interface CanvasAnimationOptions {
  /**
   * Called after the canvas is resized, with the new logical (CSS) dimensions.
   * Use this for state that depends on canvas size (e.g. particle positions, grid dimensions).
   */
  onResize?: (width: number, height: number) => void;
  /**
   * Called every animation frame. Apply your transforms and draw here.
   * `timestamp` is the DOMHighResTimeStamp from requestAnimationFrame.
   */
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, timestamp: number) => void;
  /**
   * Dependencies for the effect. Defaults to []. Pass additional deps if your draw
   * function closes over reactive values that require the effect to re-run.
   */
  deps?: React.DependencyList;
}

/**
 * Shared canvas boilerplate for art-clock states.
 *
 * Handles:
 * - Canvas ref creation
 * - DPI-aware resizing (devicePixelRatio) via resizeCanvasToParent
 * - Window resize listener with ~200ms throttle
 * - requestAnimationFrame loop with cleanup on unmount
 *
 * Returns a ref to attach to a <canvas> element.
 */
export function useCanvasAnimation({
  onResize,
  draw,
  deps = [],
}: CanvasAnimationOptions): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const drawRef = useRef(draw);
  const onResizeRef = useRef(onResize);
  drawRef.current = draw;
  onResizeRef.current = onResize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const { width, height } = resizeCanvasToParent(canvas);
      onResizeRef.current?.(width, height);
    };
    handleResize();

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledResize = () => {
      if (throttleTimer !== null) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        handleResize();
      }, RESIZE_THROTTLE_MS);
    };
    window.addEventListener("resize", throttledResize);

    const loop = (timestamp: number) => {
      drawRef.current(ctx, canvas, timestamp);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", throttledResize);
      if (throttleTimer !== null) clearTimeout(throttleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}
