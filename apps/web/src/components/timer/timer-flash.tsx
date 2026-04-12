interface TimerFlashProps {
  active: boolean;
}

export function TimerFlash({ active }: TimerFlashProps) {
  if (!active) return null;

  return (
    <div
      className="absolute inset-0 animate-[timer-flash_0.5s_ease-in-out_infinite_alternate]"
      style={{ pointerEvents: "none" }}
    />
  );
}
