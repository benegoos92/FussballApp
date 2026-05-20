"use client";
import { useState } from "react";
import type { Event, EventType } from "@/lib/database.types";

const TYPE_COLORS: Record<EventType, string> = {
  Training: "bg-blue-500",
  Spiel: "bg-red-500",
  Event: "bg-purple-500",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

interface Props {
  events: Event[];
  onDayClick?: (date: string) => void;
}

export default function MonthCalendar({ events, onDayClick }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const eventsByDate = events.reduce<Record<string, Event[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg">‹</button>
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg">›</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = dateStr(day);
          const dayEvents = eventsByDate[ds] ?? [];
          const isToday = ds === todayStr;
          const isSelected = ds === selected;

          return (
            <button
              key={i}
              onClick={() => {
                setSelected(isSelected ? null : ds);
                onDayClick?.(ds);
              }}
              className={`relative flex flex-col items-center rounded-lg py-1.5 min-h-[52px] transition-colors ${
                isSelected
                  ? "bg-green-100 ring-1 ring-green-400"
                  : "hover:bg-gray-100"
              }`}
            >
              <span
                className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                  isToday ? "bg-green-600 text-white" : "text-gray-700"
                }`}
              >
                {day}
              </span>
              <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[e.type]}`}
                    title={e.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-gray-400">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-700">
            {new Date(selected + "T00:00:00").toLocaleDateString("de-DE", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Termine</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500 flex-wrap">
        {(Object.entries(TYPE_COLORS) as [EventType, string][]).map(([t, c]) => (
          <span key={t} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${c}`} /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const TYPE_BG: Record<EventType, string> = {
    Training: "border-l-blue-500 bg-blue-50",
    Spiel: "border-l-red-500 bg-red-50",
    Event: "border-l-purple-500 bg-purple-50",
  };
  return (
    <li className={`border-l-4 rounded-r-lg px-3 py-2 ${TYPE_BG[event.type]}`}>
      <div className="flex justify-between items-start">
        <span className="font-medium text-sm">{event.title}</span>
        <span className="text-xs text-gray-500 ml-2 shrink-0">{event.start_time.slice(0, 5)} Uhr</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>
      {event.description && <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>}
    </li>
  );
}
