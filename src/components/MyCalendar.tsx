"use client";
import { Scheduler, CalendarEvent, ViewType, Resource } from "calendarkit-pro";
import { useState } from "react";

const customTheme = {
  colors: {
    primary: "#6366f1", // Primary accent color
    secondary: "#ec4899", // Secondary color
    background: "#ffffff", // Background color
    foreground: "#0f172a", // Text color
    border: "#e2e8f0", // Border color
    muted: "#f1f5f9", // Muted backgrounds
    accent: "#f1f5f9", // Accent backgrounds
  },
  fontFamily: "Inter, sans-serif",
  borderRadius: "0.75rem",
};

export default function MyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <Scheduler
      theme={customTheme}
      events={events}
      view={view}
      onViewChange={setView}
      date={date}
      onDateChange={setDate}
      isDarkMode={isDarkMode}
      onThemeToggle={() => setIsDarkMode(!isDarkMode)}
      onEventCreate={(event) => {
        setEvents([...events, { ...event, id: Date.now().toString() }]);
      }}
    />
  );
}
