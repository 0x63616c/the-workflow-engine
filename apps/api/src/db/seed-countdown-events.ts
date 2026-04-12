import { db } from "./client";
import { countdownEvents } from "./schema";

const EVENTS = [
  // Upcoming
  { title: "Coachella W2", date: "2026-04-16" },
  { title: "SF - SoFi Codathon", date: "2026-04-26" },
  { title: "Disco Lines", date: "2026-05-02" },
  { title: "SF - Temporal Replay", date: "2026-05-04" },
  { title: "5 Year Anniversary Of Green Card", date: "2026-05-06" },
  { title: "EDC", date: "2026-05-14" },
  { title: "LIB", date: "2026-05-21" },
  { title: "Gorgon City", date: "2026-05-30" },
  { title: "Chris Lake Day 1 & 2", date: "2026-06-19" },
  { title: "DayTrip", date: "2026-06-27" },
  { title: "Beltran Day 1 & 2", date: "2026-07-11" },
  { title: "Hard Summer", date: "2026-08-01" },
  { title: "Head Trip", date: "2026-10-10" },
  { title: "My Birthday", date: "2026-11-02" },
  { title: "EDC Sea", date: "2027-01-26" },
  // Past
  { title: "Beyond 26", date: "2026-03-27" },
  { title: "CRSSD", date: "2026-03-14" },
  { title: "Skyline", date: "2026-02-28" },
  { title: "Eligible for Naturalization", date: "2026-02-08" },
  { title: "Mochakk + Beltran Hollywood Take...", date: "2025-12-13" },
  { title: "Matroda: DTLA", date: "2025-12-05" },
  { title: "Biscits - Gudfella", date: "2025-11-07" },
  { title: "Escape 25", date: "2025-10-31" },
  { title: "Worship: Red Rocks", date: "2025-10-30" },
  { title: "Martin Garrix", date: "2025-10-23" },
  { title: "Mau P", date: "2025-10-10" },
  { title: "Sidepiece - San Diego", date: "2025-10-04" },
  { title: "CRSSD San Diego", date: "2025-09-27" },
  { title: "Nocturnal Wonderland", date: "2025-09-13" },
  { title: "Chris Lake: Red Rocks", date: "2025-08-30" },
  { title: "Sidepiece: Day Trip", date: "2025-08-16" },
  { title: "Chris Lake: San Diego", date: "2025-08-02" },
  { title: "Lost In Dreams 25", date: "2025-07-11" },
  { title: "Martin Garrix", date: "2025-06-27" },
  { title: "EDCLV 25", date: "2025-05-16" },
  { title: "Shaun in LA", date: "2025-05-10" },
  { title: "Coachella 25", date: "2025-04-18" },
  { title: "Armin Van Buuren 25", date: "2025-04-04" },
  { title: "Beyond Wonderland 25", date: "2025-03-28" },
  { title: "NoFap", date: "2025-03-23" },
  { title: "Rezz Cow Palace 25", date: "2025-03-01" },
  { title: "John Summit Vail 25", date: "2025-02-15" },
  { title: "Aeon:MODE LA 25", date: "2025-02-07" },
  { title: "Chyl 25", date: "2025-01-25" },
];

console.log(`Seeding ${EVENTS.length} countdown events...`);
db.insert(countdownEvents).values(EVENTS).run();
console.log(`Seeded ${EVENTS.length} countdown events`);
