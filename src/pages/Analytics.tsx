import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Cpu,
  Hand,
  TrendingDown,
} from "lucide-react";
import { useFocusHistory } from "../hooks/useFocusHistory";
import { formatDuration } from "../utils/formatters";
import {
  useDailyStats,
  useWeeklyHourlyUsage,
  useWeeklyStats,
} from "../queries";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  memory: Cpu,
  schedule: Clock,
  trending_down: TrendingDown,
  today: CalendarDays,
  touch_app: Hand,
  warning: AlertTriangle,
};

function Icon({
  name,
  size: _size,
  style,
  className = "",
}: {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} style={style} />;
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
    <header className="flex flex-col gap-2 mb-6">
      <h2 className="font-serif text-4xl text-foreground leading-none font-normal">
        Analytics
      </h2>
      <div className="flex items-center gap-3 text-muted-foreground">
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
        className="lg:col-span-4 bg-card p-6 sm:p-8 flex flex-col gap-8 min-h-40 border border-border"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-bold">
            Avg. Daily Use (7D)
          </h3>
          <Icon
            name="schedule"
            size={18}
            className="text-muted-foreground opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-4xl sm:text-5xl leading-none text-foreground font-light">
            {formatDuration(avgDailyUse)}
          </span>
          <div className="flex items-center gap-2 mt-3 font-mono text-[0.7rem] text-muted-foreground">
            <Icon name="trending_down" size={16} className="text-muted-foreground" />
            <span>Based on weekly activity</span>
          </div>
        </div>
      </Cell>

      <Cell
        className="lg:col-span-4 bg-card p-6 sm:p-8 flex flex-col gap-8 min-h-40 border border-border"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-bold">
            Today's Usage
          </h3>
          <Icon
            name="today"
            size={18}
            className="text-muted-foreground opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-4xl sm:text-5xl leading-none text-foreground font-light">
            {formatDuration(todaySeconds)}
          </span>
          <div className="w-full h-1.5 bg-muted mt-4">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min((todaySeconds / (avgDailyUse || 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </Cell>

      <Cell
        className="lg:col-span-4 bg-card p-6 sm:p-8 flex flex-col gap-8 min-h-40 border border-border"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-bold">
            Total Sessions
          </h3>
          <Icon
            name="touch_app"
            size={18}
            className="text-muted-foreground opacity-50"
          />
        </div>
        <div className="mt-auto">
          <span className="font-mono text-4xl sm:text-5xl leading-none text-foreground font-light">
            {totalPickups}
          </span>
          <div className="font-mono text-[0.7rem] text-muted-foreground mt-3">
            App launches today
          </div>
        </div>
      </Cell>
    </>
  );
}

const COLS = 48;
const LEGEND_SWATCHES = [
  { label: "0%", color: "var(--muted)" },
  { label: "25%", color: "#064e3b" },
  { label: "50%", color: "#15803d" },
  { label: "75%", color: "#22c55e" },
  { label: "100%", color: "#4ade80" },
];

function cellColor(seconds: number): string {
  if (seconds <= 0) return "var(--muted)";
  if (seconds <= 450) return "#064e3b";  // 1s - 7.5m (25%)
  if (seconds <= 900) return "#15803d";  // 7.5m - 15m (50%)
  if (seconds <= 1350) return "#22c55e"; // 15m - 22.5m (75%)
  return "#4ade80";                      // 22.5m+ (100%)
}

function IntensityMatrix({
  weeklyHourlyUsage,
}: {
  weeklyHourlyUsage: { date: string; hour: number; total_seconds: number }[];
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
        label: i === 0
          ? "Today"
          : d.toLocaleDateString("en", { weekday: "short" }),
      });
    }
    return { days: dayList, hourlyLookup: lookup };
  }, [weeklyHourlyUsage]);

  return (
    <Cell
      className="lg:col-span-8 bg-card p-6 sm:p-8 flex flex-col gap-6 border border-border"
    >
      <header
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 gap-1 border-b border-border"
      >
        <h3 className="font-serif text-lg text-foreground font-normal">
          Intensity Matrix
        </h3>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
          Past 7 Days
        </span>
      </header>

      <div className="flex-1 flex flex-col justify-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1.5 w-full min-w-[320px]">
          {days.map(({ date: dateStr, label: dayLabel }, r) => (
            <div key={dateStr} className="flex gap-1 items-center w-full">
              <span className="font-mono text-[0.55rem] text-muted-foreground w-8 shrink-0 uppercase tracking-[0.05em]">
                {dayLabel}
              </span>
              <div className="flex gap-0.5 flex-1 w-full">
                {Array.from({ length: COLS }, (_, c) => {
                  const seconds = hourlyLookup.get(`${dateStr}-${c}`) ?? 0;
                  const startHour = String(Math.floor(c / 2)).padStart(2, "0");
                  const startMin = c % 2 === 0 ? "00" : "30";
                  const endC = c + 1;
                  const endHour = String(Math.floor(endC / 2)).padStart(2, "0");
                  const endMin = endC % 2 === 0 ? "00" : "30";
                  return (
                    <div
                      key={c}
                      data-cell
                      data-row={r}
                      data-col={c}
                      title={`${dayLabel} ${startHour}:${startMin} - ${endHour}:${endMin} — ${formatDuration(seconds)}`}
                      className="flex-1 min-w-[4px] aspect-square rounded-[3px] cursor-crosshair opacity-90 hover:opacity-100 transition-opacity duration-100 hover:outline hover:outline-1 hover:outline-primary outline-none"
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

        <div className="flex justify-between mt-3 pl-9 w-full font-mono text-[0.6rem] text-muted-foreground">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pl-9 w-full">
          <span className="font-mono text-[0.55rem] text-muted-foreground mr-1">
            Less
          </span>
          {LEGEND_SWATCHES.map((swatch) => (
            <div key={swatch.label} className="flex items-center gap-1">
              <div
                className="w-3 h-3 shrink-0 border border-border rounded-[3px]"
                style={{ backgroundColor: swatch.color }}
              />
              <span className="font-mono text-[0.55rem] text-muted-foreground">
                {swatch.label}
              </span>
            </div>
          ))}
          <span className="font-mono text-[0.55rem] text-muted-foreground ml-1">
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
      className="lg:col-span-4 bg-card p-6 sm:p-8 flex flex-col gap-6 border border-border"
    >
      <header className="flex justify-between items-center pb-4 border-b border-border">
        <h3 className="font-serif text-lg text-foreground font-normal">
          Top Applications
        </h3>
        <Icon name="warning" size={16} className="text-muted-foreground" />
      </header>
      {items.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-8">
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
        <span className="group-hover:text-primary text-foreground font-medium transition-colors duration-150 overflow-hidden text-ellipsis whitespace-nowrap">
          {entry.name}
        </span>
        <span className="text-muted-foreground shrink-0">
          {entry.time}
        </span>
      </div>
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary"
          style={{
            width: `${entry.pct}%`,
            transition: "width 0.4s ease-out",
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
    <Cell className="lg:col-span-12 bg-card p-6 sm:p-8 border border-border">
      <header className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-lg text-foreground font-normal">
          Process Ledger
        </h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[500px]">
          <thead>
            <tr className="border-b border-border">
              {[
                "Application",
                "Category",
                "Sessions",
                "Time Spent",
                "% Impact",
              ].map((col, i) => (
                <th
                  key={col}
                  className="font-sans text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground p-3 font-bold whitespace-nowrap"
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
                  className="font-sans text-sm text-muted-foreground text-center p-8"
                >
                  No data available for today
                </td>
              </tr>
            ) : (
              apps.map((row) => (
                <tr
                  key={row.app_name}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors duration-100 cursor-default"
                >
                  <td className="font-mono text-xs text-foreground p-4 pl-0 font-medium">
                    {row.app_name}
                  </td>
                  <td className="font-mono text-xs text-muted-foreground p-4">
                    {row.category || "Uncategorized"}
                  </td>
                  <td className="font-mono text-xs text-foreground p-4 text-right">
                    {row.session_count}
                  </td>
                  <td className="font-mono text-xs text-foreground p-4 text-right">
                    {formatDuration(row.duration_seconds)}
                  </td>
                  <td className="font-mono text-xs text-foreground p-4 pr-0 text-right font-bold">
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
    <Cell className="lg:col-span-12 bg-card p-6 sm:p-8 border border-border">
      <header className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-lg text-foreground font-normal">
          Session Telemetry
        </h3>
        <LiveDot />
      </header>
      {recent.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-8">
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
        className="absolute inset-0 bg-primary opacity-75 rounded-none"
        style={{
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
        }}
      />
      <span className="relative w-2 h-2 bg-primary" />
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
      className={`group flex flex-col gap-4 p-5 border border-border bg-background transition-all duration-150 cursor-default ${session.completed ? 'hover:border-primary opacity-100' : 'opacity-60'}`}
    >
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-muted-foreground">
          {session.date}
        </span>
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] px-2 py-1 border border-border ${session.completed ? 'bg-secondary text-foreground' : 'bg-muted text-muted-foreground line-through'}`}
        >
          {session.completed ? "Completed" : "Interrupted"}
        </span>
      </div>
      <div>
        <span className="font-mono text-2xl text-foreground font-bold block">
          {durationStr}
        </span>
        <span className="font-sans text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-bold">
          Focus Session
        </span>
      </div>
    </div>
  );
}

function BlueprintGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-px bg-border border border-border">
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
