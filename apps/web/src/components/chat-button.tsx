import { Bot } from "lucide-react";

export function ChatButton() {
  return (
    <button
      type="button"
      aria-label="Open chat"
      className="absolute right-6 bottom-6 z-30 flex size-[4.2rem] items-center justify-center rounded-full bg-foreground text-background shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      <Bot className="size-7" strokeWidth={1.75} />
    </button>
  );
}
