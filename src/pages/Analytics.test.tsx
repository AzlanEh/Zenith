/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Analytics } from "./Analytics";

vi.mock("../queries", () => ({
  useDailyStats: () => ({
    data: {
      total_seconds: 7200,
      apps: [
        {
          app_name: "Code",
          duration_seconds: 3600,
          session_count: 5,
          category: "Development",
        },
      ],
    },
  }),
  useWeeklyStats: () => ({
    data: {
      total_seconds: 50400,
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-08-0${i + 1}`,
        total_seconds: 7200,
      })),
    },
  }),
  useWeeklyHourlyUsage: () => ({
    data: [
      // Today (row 6) - mock different hours to test color scale thresholds
      { date: new Date().toISOString().slice(0, 10), hour: 0, total_seconds: 0 },
      { date: new Date().toISOString().slice(0, 10), hour: 1, total_seconds: 500 }, // 1-900 -> #064e3b
      { date: new Date().toISOString().slice(0, 10), hour: 2, total_seconds: 1200 }, // 901-1800 -> #15803d
      { date: new Date().toISOString().slice(0, 10), hour: 3, total_seconds: 2400 }, // 1801-2700 -> #22c55e
      { date: new Date().toISOString().slice(0, 10), hour: 4, total_seconds: 3600 }, // 2701+ -> #4ade80
    ],
  }),
}));

vi.mock("../hooks/useFocusHistory", () => ({
  useFocusHistory: () => ({
    sessions: [],
    addSession: vi.fn(),
    clearHistory: vi.fn(),
  }),
}));

describe("Analytics IntensityMatrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 24 hourly columns per row (total 168 cells for 7 days)", () => {
    const { container } = render(<Analytics />);
    const row0Cells = container.querySelectorAll('[data-row="0"][data-cell]');
    expect(row0Cells.length).toBe(24);

    const allCells = container.querySelectorAll('[data-cell]');
    expect(allCells.length).toBe(24 * 7); // 168 cells
  });

  it("renders time labels 00:00, 06:00, 12:00, 18:00, 23:00", () => {
    render(<Analytics />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.getByText("23:00")).toBeInTheDocument();
  });

  it("applies the 5-tier emerald green color scale based on hourly seconds", () => {
    const { container } = render(<Analytics />);
    const todayRowIndex = 6;

    const cell0 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="0"]`
    );
    const cell1 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="1"]`
    );
    const cell2 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="2"]`
    );
    const cell3 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="3"]`
    );
    const cell4 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="4"]`
    );

    // 0s -> rgba(255, 255, 255, 0.05)
    expect(cell0?.style.backgroundColor).toBe("rgba(255, 255, 255, 0.05)");
    // 500s (1-900s) -> #064e3b -> rgb(6, 78, 59)
    expect(cell1?.style.backgroundColor).toMatch(/rgb\(6,\s*78,\s*59\)|#064e3b/i);
    // 1200s (901-1800s) -> #15803d -> rgb(21, 128, 61)
    expect(cell2?.style.backgroundColor).toMatch(/rgb\(21,\s*128,\s*61\)|#15803d/i);
    // 2400s (1801-2700s) -> #22c55e -> rgb(34, 197, 94)
    expect(cell3?.style.backgroundColor).toMatch(/rgb\(34,\s*197,\s*94\)|#22c55e/i);
    // 3600s (2701s+) -> #4ade80 -> rgb(74, 222, 128)
    expect(cell4?.style.backgroundColor).toMatch(/rgb\(74,\s*222,\s*128\)|#4ade80/i);
  });

  it("formats tooltip title string correctly as '${dayLabel} ${startHour}:00 - ${endHour}:00 — ${formatDuration(seconds)}'", () => {
    const { container } = render(<Analytics />);
    const todayRowIndex = 6;

    const cell1 = container.querySelector<HTMLElement>(
      `[data-row="${todayRowIndex}"][data-col="1"]`
    );
    expect(cell1?.getAttribute("title")).toBe("Today 01:00 - 02:00 — 8m");
  });

  it("renders 5 legend swatches with 0%, 25%, 50%, 75%, 100% percentages", () => {
    render(<Analytics />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
