import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "outline-toggle";

export function OutlineToggle() {
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  });

  useEffect(() => {
    document.documentElement.dataset.outline = on ? "on" : "off";
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  }, [on]);

  const toggle = () => setOn((prev) => !prev);

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
