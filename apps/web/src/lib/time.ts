export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good evening.";
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  if (hour < 22) return "Good evening.";
  return "Good evening.";
}

export function formatTime(date: Date): { time: string; suffix: "AM" | "PM" } {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return { time: `${hours12}:${minutes}`, suffix: hours24 >= 12 ? "PM" : "AM" };
}

export function formatDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
}
