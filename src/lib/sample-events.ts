import type { CalendarEvent } from "calendarkit-pro";
import { addDays, atTime } from "@/lib/dates";
import { memberColor } from "@/lib/family";

// Offsets from the Monday that starts the rendered week.
const MONDAY = 0;
const TUESDAY = 1;
const WEDNESDAY = 2;
const THURSDAY = 3;
const FRIDAY = 4;
const SATURDAY = 5;
const SUNDAY = 6;

interface TimedSeed {
  readonly title: string;
  readonly calendarId: string;
  readonly day: number;
  readonly startHour: number;
  readonly startMinute?: number;
  readonly endHour: number;
  readonly endMinute?: number;
  readonly description?: string;
}

interface AllDaySeed {
  readonly title: string;
  readonly calendarId: string;
  readonly day: number;
  readonly description?: string;
}

const TIMED_SEEDS: readonly TimedSeed[] = [
  { title: "School drop-off", calendarId: "everyone", day: MONDAY, startHour: 7, startMinute: 45, endHour: 8, endMinute: 15 },
  { title: "Standup", calendarId: "dad", day: MONDAY, startHour: 9, endHour: 9, endMinute: 30 },
  { title: "Soccer practice", calendarId: "haven", day: MONDAY, startHour: 16, startMinute: 30, endHour: 18, description: "Cleats in the garage" },
  { title: "Piano lesson", calendarId: "lacy", day: TUESDAY, startHour: 15, startMinute: 30, endHour: 16, endMinute: 30 },
  { title: "Book club", calendarId: "mom", day: TUESDAY, startHour: 19, endHour: 20, endMinute: 30 },
  { title: "Grocery run", calendarId: "mom", day: WEDNESDAY, startHour: 10, endHour: 11 },
  { title: "Family dinner", calendarId: "everyone", day: WEDNESDAY, startHour: 18, endHour: 19 },
  { title: "Dentist — Lacy", calendarId: "lacy", day: THURSDAY, startHour: 14, endHour: 15 },
  { title: "Late meeting", calendarId: "dad", day: THURSDAY, startHour: 17, endHour: 18 },
  { title: "Movie night", calendarId: "everyone", day: FRIDAY, startHour: 19, endHour: 21 },
  { title: "Swim meet", calendarId: "haven", day: SATURDAY, startHour: 9, endHour: 12 },
];

const ALL_DAY_SEEDS: readonly AllDaySeed[] = [
  { title: "Grandma's birthday", calendarId: "everyone", day: SUNDAY },
  { title: "Teacher in-service — no school", calendarId: "everyone", day: FRIDAY },
];

function toTimedEvent(seed: TimedSeed, weekStart: Date): CalendarEvent {
  return {
    id: `sample-${seed.calendarId}-${seed.day}-${seed.startHour}`,
    title: seed.title,
    calendarId: seed.calendarId,
    resourceId: seed.calendarId,
    color: memberColor(seed.calendarId),
    description: seed.description,
    start: atTime(weekStart, seed.day, seed.startHour, seed.startMinute ?? 0),
    end: atTime(weekStart, seed.day, seed.endHour, seed.endMinute ?? 0),
  };
}

function toAllDayEvent(seed: AllDaySeed, weekStart: Date): CalendarEvent {
  const day = addDays(weekStart, seed.day);
  day.setHours(0, 0, 0, 0);
  return {
    id: `sample-allday-${seed.calendarId}-${seed.day}`,
    title: seed.title,
    calendarId: seed.calendarId,
    resourceId: seed.calendarId,
    color: memberColor(seed.calendarId),
    description: seed.description,
    allDay: true,
    start: day,
    end: day,
  };
}

/**
 * Placeholder household week, anchored to whichever week is on screen so the
 * calendar never renders as an empty grid. Replaced by the events API in Phase 1.
 */
export function buildSampleWeek(weekStart: Date): CalendarEvent[] {
  return [
    ...TIMED_SEEDS.map((seed) => toTimedEvent(seed, weekStart)),
    ...ALL_DAY_SEEDS.map((seed) => toAllDayEvent(seed, weekStart)),
  ];
}
