import { useCallback, useMemo } from "react";
import { useFocusHistory } from "../hooks/useFocusHistory";
import { formatDuration } from "../utils/formatters";
import {
  useDailyStats,
  useWeeklyHourlyUsage,
  useWeeklyStats,
} from "../queries";

function Icon({
  name,
  size = 20,
  fill = false,
  style,
  className = "",
}: {
  name: string;
  size?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined leading-none select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: fill
          ? "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

function Cell({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-2 mb-4">
      <h2 className="font-serif text-4xl text-[#e2e2e2] leading-none font-normal">
        Analytics
      </h2>
      <div className="flex items-center gap-3 text-[#c6c6c6]">
        <Icon name="memory" size={16} />
        <p className="font-mono text-xs uppercase tracking-[0.15em]">
          Technical Blueprint Variant // Vol. 4
        </p>
      </div>
    </header>
  );
}

function StatCards({
  avgDailyUse,
  todaySeconds,
  totalPickups,
}: {
  avgDailyUse: number;
  todaySeconds: number;
  totalPickups: number;
}) {
  return (
    <>
      <Cell
        className="lg:col-span-4 bg-[#131313] p-8 flex flex-col gap-8 min-h-40"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-[#c6c6c6]">
            Avg. Daily Use (7D)
          </h3>
          <Icon
            name="schedule"
            size={18}
            className="text-[#c6c6c6] opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-5xl leading-none text-white font-light">
            {formatDuration(avgDailyUse)}
          </span>
          <div className="flex items-center gap-2 mt-2 font-mono text-[0.7rem] text-[#c6c6c6]">
            <Icon name="trending_down" size={16} className="text-[#c6c6c6]" />
            <span>Based on weekly activity</span>
          </div>
        </div>
      </Cell>

      <Cell
        className="lg:col-span-4 bg-[#131313] p-8 flex flex-col gap-8 min-h-40"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-[#c6c6c6]">
            Today's Usage
          </h3>
          <Icon
            name="today"
            size={18}
            className="text-[#c6c6c6] opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-5xl leading-none text-white font-light">
            {formatDuration(todaySeconds)}
          </span>
          <div className="w-full h-1 bg-[#2a2a2a] mt-4">
            <div
              className="h-full bg-[#474747]"
              style={{
                width: `${Math.min((todaySeconds / (avgDailyUse || 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </Cell>

      <Cell
        className="lg:col-span-4 bg-[#131313] p-8 flex flex-col gap-8 min-h-40"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-[#c6c6c6]">
            Total Sessions
          </h3>
          <Icon
            name="touch_app"
            size={18}
            className="text-[#c6c6c6] opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-5xl leading-none text-white font-light">
            {totalPickups}
          </span>
          <div className="font-mono text-[0.7rem] text-[#c6c6c6] mt-2">
            App launches today
          </div>
        </div>
      </Cell>
    </>
  );
}

const COLS = 48;
const LEGEND_COLORS = [
  "#1b1b1b",
  "#2a2a2a",
  "#474747",
  "#ffffff",
];

function IntensityMatrix({
  weeklyHourlyUsage,
  maxWeeklyHourlySeconds,
}: {
  weeklyHourlyUsage: { date: string; hour: number; total_seconds: number }[];
  maxWeeklyHourlySeconds: number;
}) {
  const { days, hourlyLookup } = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const h of weeklyHourlyUsage)
      lookup.set(`${h.date}-${h.hour}`, h.total_seconds);

    const dayList: { label: string; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dayList.push({
        date: dateStr,
        label: i === 6
          ? "Today"
          : d.toLocaleDateString("en", { weekday: "short" }),
      });
    }
    return { days: dayList, hourlyLookup: lookup };
  }, [weeklyHourlyUsage]);

  const cellColor = useCallback((v: number): string => {
    const pct = maxWeeklyHourlySeconds > 0 ? v / maxWeeklyHourlySeconds : 0;
    if (pct > 0.8) return "#ffffff";
    if (pct > 0.5) return "#474747";
    if (pct > 0.2) return "#2a2a2a";
    return "#1b1b1b";
  }, [maxWeeklyHourlySeconds]);

  return (
    <Cell
      className="lg:col-span-8 bg-[#131313] p-8 flex flex-col gap-6"
    >
      <header
        className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-1 border-b border-[#2a2a2a]"
      >
        <h3 className="font-serif text-lg text-[#e2e2e2] font-normal">
          Intensity Matrix
        </h3>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#c6c6c6]">
          Past 7 Days
        </span>
      </header>

      <div className="flex-1 flex flex-col justify-center overflow-x-auto">
        <div className="flex flex-col gap-0.5 min-w-[320px]">
          {days.map(({ date: dateStr, label: dayLabel }, r) => (
            <div key={dateStr} className="flex gap-0.5 items-center">
              <span className="font-mono text-[0.55rem] text-[#c6c6c6] w-7 shrink-0 uppercase tracking-[0.05em]">
                {dayLabel}
              </span>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: COLS }, (_, c) => {
                  const seconds = hourlyLookup.get(`${dateStr}-${c}`) ?? 0;
                  return (
                    <div
                      key={c}
                      data-cell
                      data-row={r}
                      data-col={c}
                      title={`${dayLabel} ${Math.floor(c / 2)}:${c % 2 === 0 ? "00" : "30"} — ${formatDuration(seconds)}`}
                      className="flex-1 min-w-[6px] aspect-square cursor-crosshair opacity-80 hover:opacity-100 transition-opacity duration-100 hover:outline hover:outline-1 hover:outline-white outline-none"
                      style={{
                        backgroundColor: cellColor(seconds),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-3 pl-7 font-mono text-[0.6rem] text-[#c6c6c6] min-w-[320px]">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pl-7">
          <span className="font-mono text-[0.55rem] text-[#c6c6c6] mr-1">
            Less
          </span>
          {LEGEND_COLORS.map((col) => (
            <div
              key={col}
              className="w-3 h-3 shrink-0"
              style={{ backgroundColor: col }}
            />
          ))}
          <span className="font-mono text-[0.55rem] text-[#c6c6c6] ml-1">
            More
          </span>
        </div>
      </div>
    </Cell>
  );
}

function DistractionVectors({
  apps,
}: {
  apps: {
    app_name: string;
    duration_seconds: number;
    category: string | null;
  }[];
}) {
  const items = useMemo(() => {
    return apps.slice(0, 5).map((a) => ({
      name: a.app_name,
      time: formatDuration(a.duration_seconds),
      pct: Math.round(
        (a.duration_seconds /
          (apps.reduce((s, x) => s + x.duration_seconds, 0) || 1)) *
          100,
      ),
    }));
  }, [apps]);

  return (
    <Cell
      className="lg:col-span-4 bg-[#131313] p-8 flex flex-col gap-6"
    >
      <header className="flex justify-between items-center pb-4 border-b border-[#2a2a2a]">
        <h3 className="font-serif text-lg text-[#e2e2e2] font-normal">
          Top Applications
        </h3>
        <Icon name="warning" size={16} className="text-[#c6c6c6]" />
      </header>
      {items.length === 0 ? (
        <p className="font-sans text-sm text-[#c6c6c6] text-center py-8">
          No data today
        </p>
      ) : (
        <ul className="flex flex-col gap-5 list-none p-0 m-0">
          {items.map((d) => (
            <DistractionRow key={d.name} entry={d} />
          ))}
        </ul>
      )}
    </Cell>
  );
}

function DistractionRow({
  entry,
}: {
  entry: { name: string; time: string; pct: number };
}) {
  return (
    <li className="group flex flex-col gap-2">
      <div className="flex justify-between font-mono text-xs">
        <span className="group-hover:text-white text-[#e2e2e2] transition-colors duration-150 overflow-hidden text-ellipsis whitespace-nowrap">
          {entry.name}
        </span>
        <span className="text-[#c6c6c6] shrink-0">
          {entry.time}
        </span>
      </div>
      <div className="w-full h-0.5 bg-[#2a2a2a]">
        <div
          className="h-full group-hover:bg-white bg-[#474747]"
          style={{
            width: `${entry.pct}%`,
            transition: "background-color 0.15s, width 0.4s ease-out",
          }}
        />
      </div>
    </li>
  );
}

function ProcessLedger({
  apps,
  totalSeconds,
}: {
  apps: {
    app_name: string;
    duration_seconds: number;
    session_count: number;
    category: string | null;
  }[];
  totalSeconds: number;
}) {
  return (
    <Cell className="lg:col-span-12 bg-[#131313] p-8">
      <header className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-lg text-[#e2e2e2] font-normal">
          Process Ledger
        </h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {[
                "Application",
                "Category",
                "Sessions",
                "Time Spent",
                "% Impact",
              ].map((col, i) => (
                <th
                  key={col}
                  className="font-sans text-[0.65rem] uppercase tracking-[0.15em] text-[#c6c6c6] p-3 font-normal whitespace-nowrap"
                  style={{
                    paddingLeft: i === 0 ? 0 : "1rem",
                    paddingRight: i === 4 ? 0 : "1rem",
                    textAlign: i >= 2 ? "right" : "left",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="font-sans text-sm text-[#c6c6c6] text-center p-8"
                >
                  No data available for today
                </td>
              </tr>
            ) : (
              apps.map((row) => (
                <tr
                  key={row.app_name}
                  className="border-b border-[#1b1b1b] hover:bg-[#0e0e0e] transition-colors duration-100 cursor-default"
                >
                  <td className="font-mono text-xs text-[#e2e2e2] p-4 pl-0">
                    {row.app_name}
                  </td>
                  <td className="font-mono text-xs text-[#c6c6c6] p-4">
                    {row.category || "Uncategorized"}
                  </td>
                  <td className="font-mono text-xs text-[#e2e2e2] p-4 text-right">
                    {row.session_count}
                  </td>
                  <td className="font-mono text-xs text-[#e2e2e2] p-4 text-right">
                    {formatDuration(row.duration_seconds)}
                  </td>
                  <td className="font-mono text-xs text-[#e2e2e2] p-4 pr-0 text-right">
                    {totalSeconds > 0
                      ? ((row.duration_seconds / totalSeconds) * 100).toFixed(1)
                      : "0"}
                    %
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Cell>
  );
}

function SessionTelemetry({
  sessions,
}: {
  sessions: {
    date: string;
    duration_minutes: number;
    completed: boolean;
    timestamp: number;
  }[];
}) {
  const recent = useMemo(() => sessions.slice(0, 3), [sessions]);
  return (
    <Cell className="lg:col-span-12 bg-[#131313] p-8">
      <header className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-lg text-[#e2e2e2] font-normal">
          Session Telemetry
        </h3>
        <LiveDot />
      </header>
      {recent.length === 0 ? (
        <p className="font-sans text-sm text-[#c6c6c6] text-center py-8">
          No focus sessions yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.map((s, i) => (
            <SessionCard key={i} session={s} />
          ))}
        </div>
      )}
    </Cell>
  );
}

function LiveDot() {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span
        className="absolute inset-0 bg-[#474747] opacity-75 rounded-none"
        style={{
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
        }}
      />
      <span className="relative w-2 h-2 bg-white" />
    </span>
  );
}

function SessionCard({
  session,
}: {
  session: { date: string; duration_minutes: number; completed: boolean };
}) {
  const h = Math.floor(session.duration_minutes / 60);
  const m = session.duration_minutes % 60;
  const durationStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

  return (
    <div
      className={`group flex flex-col gap-4 p-5 border border-[#2a2a2a] transition-all duration-150 cursor-default ${session.completed ? 'group-hover:border-[#474747] opacity-100' : 'opacity-60'}`}
    >
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-[#c6c6c6]">
          {session.date}
        </span>
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] bg-[#1f1f1f] px-2 py-1 ${session.completed ? 'text-[#e2e2e2]' : 'text-[#c6c6c6] line-through'}`}
        >
          {session.completed ? "Completed" : "Interrupted"}
        </span>
      </div>
      <div>
        <span className="font-mono text-2xl text-[#e2e2e2] block">
          {durationStr}
        </span>
        <span className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-[#c6c6c6]">
          Focus Session
        </span>
      </div>
    </div>
  );
}

function BlueprintGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-px bg-[#353535]">
      {children}
    </div>
  );
}

export function Analytics() {
  const { data: weeklyStats } = useWeeklyStats();
  const { data: dailyStats } = useDailyStats();
  const { data: weeklyHourlyUsage = [] } = useWeeklyHourlyUsage();
  const { sessions } = useFocusHistory();

  const avgDailyUse = useMemo(() => {
    if (!weeklyStats || weeklyStats.days.length === 0) return 0;
    return Math.round(weeklyStats.total_seconds / weeklyStats.days.length);
  }, [weeklyStats]);

  const totalPickups = useMemo(() => {
    if (!dailyStats) return 0;
    return dailyStats.apps.reduce((sum, app) => sum + app.session_count, 0);
  }, [dailyStats]);

  const maxWeeklyHourlySeconds = useMemo(() => {
    if (weeklyHourlyUsage.length === 0) return 1;
    return Math.max(...weeklyHourlyUsage.map((h) => h.total_seconds));
  }, [weeklyHourlyUsage]);

  const sortedApps = useMemo(() => {
    if (!dailyStats) return [];
    return [...dailyStats.apps].sort(
      (a, b) => b.duration_seconds - a.duration_seconds,
    );
  }, [dailyStats]);

  return (
    <div className="p-4 md:p-6 lg:p-8 xl:p-12 flex-1 relative overflow-hidden">
      <PageHeader />

      <BlueprintGrid>
        <StatCards
          avgDailyUse={avgDailyUse}
          todaySeconds={dailyStats?.total_seconds ?? 0}
          totalPickups={totalPickups}
        />
        <div className="lg:col-span-8">
          <IntensityMatrix
            weeklyHourlyUsage={weeklyHourlyUsage}
            maxWeeklyHourlySeconds={maxWeeklyHourlySeconds}
          />
        </div>
        <div className="lg:col-span-4">
          <DistractionVectors apps={dailyStats?.apps ?? []} />
        </div>
        <ProcessLedger
          apps={sortedApps}
          totalSeconds={dailyStats?.total_seconds ?? 0}
        />
        <SessionTelemetry sessions={sessions} />
      </BlueprintGrid>
    </div>
  );
}
