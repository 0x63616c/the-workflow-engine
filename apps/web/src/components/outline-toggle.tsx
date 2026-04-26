import { useState } from "react";
import { createPortal } from "react-dom";

export function OutlineToggle() {
  const [on, setOn] = useState(true);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.outline = next ? "on" : "off";
  };

  return createPortal(
    <button
      type="button"
      onClick={toggle}
      className="fixed right-4 bottom-4 z-50 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md transition hover:bg-white/20"
    >
      {on ? "Hide outline" : "Show outline"}
    </button>,
    document.body,
  );
}
