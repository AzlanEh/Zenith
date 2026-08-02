import { useMemo, useState } from "react";
import {
  BarChart3,
  CircleDot,
  Cpu,
  List,
  Lock,
  Medal,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useFocusHistory } from "../hooks/useFocusHistory";
import { cn } from "../lib/utils";
import { formatDuration } from "../utils/formatters";
import {
  useAchievements,
  useDailyStats,
  useGoalsProgress,
  useWeeklyStats,
} from "../queries";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  donut_large: CircleDot,
  tune: SlidersHorizontal,
  bar_chart: BarChart3,
  memory: Cpu,
  list_alt: List,
  military_tech: Medal,
  lock: Lock,
  auto_awesome: Sparkles,
};

function Icon({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} style={style} />;
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="font-mono text-xs tracking-[0.1em] uppercase text-foreground border-b border-border pb-1 font-bold">
        {title}
      </h2>
      <Icon name={icon} className="text-muted-foreground" />
    </div>
  );
}

interface Achievement {
  icon: string;
  label: string;
  unlocked: boolean;
  active?: boolean;
}

function CognitiveLoadDial({
  totalSeconds,
  apps,
}: {
  totalSeconds: number;
  apps: {
    app_name: string;
    duration_seconds: number;
    category: string | null;
  }[];
}) {
  const productive = useMemo(() => {
    return apps
      .filter(
        (a) => a.category === "Productivity" || a.category === "Development",
      )
      .reduce((s, a) => s + a.duration_seconds, 0);
  }, [apps]);

  const distracted = useMemo(() => {
    return apps
      .filter(
        (a) =>
          a.category === "Social Media" ||
          a.category === "Entertainment" ||
          a.category === "Gaming",
      )
      .reduce((s, a) => s + a.duration_seconds, 0);
  }, [apps]);

  const focusScore =
    totalSeconds > 0 ? Math.round((productive / totalSeconds) * 100) : 0;
  const hasCategories = apps.some((a) => a.category);

  return (
    <section className="p-6 md:p-8 bg-card border-b border-border">
      <SectionHeader title="Cognitive Load" icon="donut_large" />
      <div className="flex justify-center items-center py-6 relative">
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 border-4 border-border rounded-full flex items-center justify-center">
          <div
            className="absolute inset-0 border-4 border-primary rounded-full"
            style={{
              clipPath: `polygon(50% 50%, 50% 0, 100% 0, 100% ${focusScore}%, 50% 50%)`,
            }}
          />
          <div className="text-center bg-card p-6 rounded-full w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center border border-border z-10">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-foreground">
              {totalSeconds === 0 ? "—" : `${focusScore}%`}
            </span>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground mt-1">
              {totalSeconds === 0
                ? "No Data"
                : focusScore >= 70
                  ? "Optimal"
                  : focusScore >= 40
                    ? "Moderate"
                    : totalSeconds > 0
                      ? "Low"
                      : "—"}
            </span>
          </div>
          <div className="absolute top-0 left-1/2 w-1 h-2 bg-primary -translate-x-1/2 -translate-y-full" />
          <div className="absolute bottom-0 left-1/2 w-1 h-2 bg-border -translate-x-1/2 translate-y-full" />
          <div className="absolute left-0 top-1/2 h-1 w-2 bg-border -translate-y-1/2 -translate-x-full" />
          <div className="absolute right-0 top-1/2 h-1 w-2 bg-primary -translate-y-1/2 translate-x-full" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-6 border-t border-dashed border-border">
        {[
          {
            value: hasCategories
              ? formatDuration(productive)
              : formatDuration(totalSeconds),
            label: hasCategories ? "Deep Work" : "Total Today",
          },
          {
            value: hasCategories ? formatDuration(distracted) : "—",
            label: hasCategories ? "Distracted" : "Uncategorized",
          },
          {
            value: hasCategories ? `${focusScore}` : "—",
            label: "Focus Score",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="text-center px-1"
            style={{
              borderLeft: i > 0 ? "1px solid var(--border)" : undefined,
              borderRight: i < 2 ? "1px solid var(--border)" : undefined,
            }}
          >
            <div className="font-mono text-base sm:text-lg text-foreground font-bold truncate">
              {stat.value}
            </div>
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground mt-1 truncate">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubroutineStatus({
  progress,
}: {
  progress: {
    goal_id: string;
    goal_name: string;
    progress_percent: number;
    target_minutes: number;
    current_minutes: number;
    is_met: boolean;
  }[];
}) {
  return (
    <section className="p-6 md:p-8 bg-card flex-1">
      <SectionHeader title="Today's Goals" icon="tune" />
      {progress.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-8">
          No goals set for today
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {progress.slice(0, 4).map((bar) => (
            <div key={bar.goal_id}>
              <div className="flex justify-between font-mono text-xs uppercase tracking-[0.1em] mb-2">
                <span className="text-foreground font-bold">{bar.goal_name}</span>
                <span className="text-foreground">{bar.progress_percent}%</span>
              </div>
              <div className="h-2 w-full bg-muted border border-border relative">
                <div
                  className="h-full bg-primary relative transition-all duration-300"
                  style={{
                    width: `${Math.min(bar.progress_percent, 100)}%`,
                  }}
                >
                  {bar.progress_percent < 100 && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-card" />
                  )}
                </div>
              </div>
              <div className="font-mono text-[0.625rem] text-muted-foreground mt-1 text-right">
                {bar.is_met
                  ? `Target: ${bar.target_minutes}m | Done`
                  : `Target: ${bar.target_minutes}m | Cur: ${bar.current_minutes}m`}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WeeklyTelemetry({
  days,
}: {
  days: { date: string; total_seconds: number }[];
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const bars = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const d of days) dayMap.set(d.date, d.total_seconds / 3600);

    const result: { day: string; hours: number; filled: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
      const hours = dayMap.get(key) ?? 0;
      result.push({ day: dayLabel, hours, filled: hours > 0 });
    }
    return result;
  }, [days]);

  const maxHours = Math.max(...bars.map((b) => b.hours), 1);

  return (
    <section className="p-6 md:p-8 bg-card border-b border-border">
      <SectionHeader title="Weekly Activity" icon="bar_chart" />
      {days.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-16">
          No data this week
        </p>
      ) : (
        <>
          <div className="h-56 sm:h-64 flex items-end justify-between gap-2 border-b border-border pb-2 relative">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(i / 4) * 100}%`,
                  borderTop: "1px dashed var(--border)",
                }}
              />
            ))}
            {bars.map((bar, i) => {
              const heightPct = (bar.hours / maxHours) * 100;
              const isHovered = hoveredBar === i;
              return (
                <div
                  key={bar.day}
                  className="flex-1 relative cursor-pointer transition-all duration-200"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: bar.filled
                      ? isHovered
                        ? "var(--primary)"
                        : "var(--foreground)"
                      : "transparent",
                    border: bar.filled ? "none" : "1px solid var(--border)",
                    ...(!bar.filled && isHovered
                      ? { backgroundColor: "var(--muted)" }
                      : {}),
                  }}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {isHovered && (
                    <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.625rem] bg-popover text-popover-foreground border border-border px-1.5 py-0.5 whitespace-nowrap top-[-1.75rem] z-20">
                      {bar.hours.toFixed(1)}h
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.1em] mt-2">
            {bars.map((b) => (
              <span key={b.day}>{b.day}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SystemAnalysis({
  days,
}: {
  days: { date: string; total_seconds: number }[];
}) {
  const insight = useMemo(() => {
    if (days.length === 0) return null;
    const maxDay = days.reduce(
      (max, d) => (d.total_seconds > max.total_seconds ? d : max),
      days[0],
    );
    const avg = days.reduce((s, d) => s + d.total_seconds, 0) / days.length;
    const today = days[days.length - 1];
    return { maxDay, avg, today };
  }, [days]);

  return (
    <section className="p-6 md:p-8 bg-card flex-1">
      <SectionHeader title="System Analysis" icon="memory" />
      <div className="bg-background border border-border p-6 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground" />
        {insight ? (
          <>
            <p className="font-sans text-sm leading-relaxed text-foreground mb-4 flex gap-2">
              <span className="font-mono text-primary font-bold shrink-0">
                &gt;
              </span>
              <span>
                Your most productive day was{" "}
                {new Date(insight.maxDay.date).toLocaleDateString("en", {
                  weekday: "long",
                })}{" "}
                with {formatDuration(insight.maxDay.total_seconds)} of screen time
                tracked. Weekly average: {formatDuration(Math.round(insight.avg))}.
              </span>
            </p>
            <p className="font-sans text-sm leading-relaxed text-foreground flex gap-2">
              <span className="font-mono text-primary font-bold shrink-0">
                &gt;
              </span>
              <span>
                Today's usage is{" "}
                {insight.today.total_seconds > insight.avg ? "above" : "below"}{" "}
                your weekly average.{" "}
                {insight.today.total_seconds > insight.avg * 1.2
                  ? "Consider scheduling a digital break to maintain balance."
                  : "Good consistency in your digital habits."}
              </span>
            </p>
          </>
        ) : (
          <p className="font-sans text-sm leading-relaxed text-muted-foreground flex gap-2">
            <span className="font-mono text-primary font-bold shrink-0">
              &gt;
            </span>
            <span>
              Insufficient data for analysis. Start tracking your digital
              activity to receive insights.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

function ActivityLog({
  sessions,
  apps,
}: {
  sessions: {
    date: string;
    duration_minutes: number;
    completed: boolean;
    timestamp: number;
  }[];
  apps: { app_name: string; duration_seconds: number }[];
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const entries = useMemo(() => {
    const result: {
      title: string;
      time: string;
      description: string;
      xp?: number;
      isError?: boolean;
    }[] = [];
    const todaySessions = sessions
      .filter((s) => s.date === todayStr)
      .slice(0, 3);
    for (const s of todaySessions) {
      result.push({
        title: s.completed ? "Focus Session" : "Cancelled Focus",
        time: new Date(s.timestamp).toLocaleTimeString("en", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        description: `${s.duration_minutes} minute ${s.completed ? "completed" : "cancelled"} session`,
        xp: s.completed ? s.duration_minutes * 2 : undefined,
        isError: !s.completed,
      });
    }
    const topApps = apps
      .sort((a, b) => b.duration_seconds - a.duration_seconds)
      .slice(0, 3);
    for (const a of topApps) {
      result.push({
        title: a.app_name,
        time: "today",
        description: `Used for ${formatDuration(a.duration_seconds)}`,
      });
    }
    return result;
  }, [sessions, apps, todayStr]);

  return (
    <section
      className="p-6 md:p-8 bg-card border-b border-border max-h-96 lg:max-h-full overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-card pt-1 pb-2 z-10">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-foreground border-b border-border pb-1 font-bold">
          Activity Log
        </h2>
        <Icon name="list_alt" className="text-muted-foreground" />
      </div>
      {entries.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-8">
          No activity recorded today
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="pl-4 pt-2 pb-2 cursor-pointer transition-colors duration-200 hover:bg-muted/50"
              style={{
                borderLeft: `2px solid ${entry.isError ? "var(--destructive)" : entry.xp ? "var(--primary)" : "var(--border)"}`,
                opacity: entry.isError ? 0.7 : 1,
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "font-mono text-xs font-bold text-foreground uppercase",
                    entry.isError && "line-through text-destructive",
                  )}
                >
                  {entry.title}
                </span>
                <span
                  className={cn(
                    "font-mono text-[0.625rem]",
                    entry.isError ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {entry.time}
                </span>
              </div>
              <div className="font-sans text-xs text-muted-foreground overflow-hidden truncate whitespace-nowrap">
                {entry.description}
              </div>
              {entry.xp && (
                <div
                  className="mt-2 font-mono text-[0.5625rem] text-foreground inline-block px-1.5 py-0.5 bg-primary/10 border border-primary/20"
                >
                  +{entry.xp} XP
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const [hovered, setHovered] = useState(false);
  const { icon, label, unlocked, active } = achievement;

  return (
    <div
      className={cn(
        "p-4 flex flex-col items-center justify-center text-center transition-all duration-200 border",
        !unlocked
          ? "border-dashed border-border opacity-40 cursor-default"
          : active || hovered
            ? "border-primary bg-primary/10 cursor-pointer"
            : "border-border bg-background cursor-pointer",
      )}
      onMouseEnter={() => unlocked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        name={icon}
        className={cn(
          "text-2xl mb-2",
          !unlocked
            ? "text-muted-foreground"
            : active || hovered
              ? "text-primary"
              : "text-foreground",
        )}
      />
      <span
        className={cn(
          "font-mono text-[0.5625rem] uppercase tracking-[0.1em] font-bold",
          !unlocked ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Milestones({
  achievements: raw,
}: {
  achievements: {
    id: string;
    name: string;
    icon: string;
    earned_at: string | null;
  }[];
}) {
  const items: Achievement[] = useMemo(() => {
    const earned = raw
      .filter((a) => a.earned_at)
      .slice(0, 2)
      .map((a) => ({
        icon: a.icon || "auto_awesome",
        label: a.name,
        unlocked: true,
        active: true,
      }));
    const locked = raw
      .filter((a) => !a.earned_at)
      .slice(0, 1)
      .map((a) => ({ icon: "lock", label: a.name, unlocked: false }));
    return [...earned, ...locked];
  }, [raw]);

  return (
    <section className="p-6 md:p-8 bg-card flex-1">
      <SectionHeader title="Achievements" icon="military_tech" />
      <div className="grid grid-cols-2 gap-4">
        {items.length === 0 ? (
          <p className="font-sans text-xs text-muted-foreground col-span-full text-center">
            No achievements yet
          </p>
        ) : (
          items.map((ach) => (
            <AchievementBadge key={ach.label} achievement={ach} />
          ))
        )}
      </div>
    </section>
  );
}

export function Dashboard() {
  const { data: dailyStats } = useDailyStats();
  const { data: weeklyStats } = useWeeklyStats();
  const { data: goalProgress = [] } = useGoalsProgress();
  const { data: achievements = [] } = useAchievements();
  const { sessions } = useFocusHistory();

  return (
    <div className="p-4 md:p-8 lg:p-12 xl:p-16 relative overflow-hidden flex-1">
      <header className="mb-12 border-b border-border pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1
              className="font-serif tracking-tight text-foreground leading-none uppercase m-0"
              style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}
            >
              System Status
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground font-mono text-xs uppercase tracking-[0.1em] flex-wrap mt-3">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary inline-block" />
                Live Telemetry
              </span>
              <span className="text-border">|</span>
              <span>
                {
                  sessions.filter(
                    (s) => s.date === new Date().toISOString().slice(0, 10),
                  ).length
                }{" "}
                sessions today
              </span>
            </div>
          </div>
          <div className="text-right border border-border p-4 bg-card w-full sm:w-auto">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground block">
              Today's Usage
            </span>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">
              {dailyStats ? formatDuration(dailyStats.total_seconds) : "—"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[4fr_5fr_3fr] gap-px bg-border border border-border relative z-10">
        <div className="bg-card flex flex-col gap-px">
          <CognitiveLoadDial
            totalSeconds={dailyStats?.total_seconds ?? 0}
            apps={dailyStats?.apps ?? []}
          />
          <SubroutineStatus progress={goalProgress} />
        </div>
        <div className="bg-card flex flex-col gap-px">
          <WeeklyTelemetry days={weeklyStats?.days ?? []} />
          <SystemAnalysis days={weeklyStats?.days ?? []} />
        </div>
        <div className="bg-card flex flex-col gap-px">
          <ActivityLog sessions={sessions} apps={dailyStats?.apps ?? []} />
          <Milestones achievements={achievements} />
        </div>
      </div>
    </div>
  );
}
