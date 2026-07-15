import { useMemo, useState } from "react";
import { useFocusHistory } from "../hooks/useFocusHistory";
import { cn } from "../lib/utils";
import { formatDuration } from "../utils/formatters";
import {
  useAchievements,
  useDailyStats,
  useGoalsProgress,
  useWeeklyStats,
} from "../queries";

interface Achievement {
  icon: string;
  label: string;
  unlocked: boolean;
  active?: boolean;
}

function Icon({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="font-mono text-xs tracking-[0.1em] uppercase text-white border-b border-white pb-1">
        {title}
      </h2>
      <Icon name={icon} />
    </div>
  );
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
    <section className="p-8 bg-[#1b1b1b] border-b border-[#474747]">
      <SectionHeader title="Cognitive Load" icon="donut_large" />
      <div className="flex justify-center items-center py-8 relative">
        <div className="relative w-48 h-48 border-4 border-[#474747] rounded-full flex items-center justify-center">
          <div
            className="absolute inset-0 border-4 border-white rounded-full"
            style={{
              clipPath: `polygon(50% 50%, 50% 0, 100% 0, 100% ${focusScore}%, 50% 50%)`,
            }}
          />
          <div className="text-center bg-[#1b1b1b] p-6 rounded-full w-36 h-36 flex flex-col items-center justify-center border border-[#474747] z-10">
            <span className="font-mono text-4xl font-bold text-white">
              {totalSeconds === 0 ? "—" : `${focusScore}%`}
            </span>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[#c6c6c6] mt-2">
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
          <div className="absolute top-0 left-1/2 w-1 h-2 bg-white -translate-x-1/2 -translate-y-full" />
          <div className="absolute bottom-0 left-1/2 w-1 h-2 bg-[#474747] -translate-x-1/2 translate-y-full" />
          <div className="absolute left-0 top-1/2 h-1 w-2 bg-[#474747] -translate-y-1/2 -translate-x-full" />
          <div className="absolute right-0 top-1/2 h-1 w-2 bg-white -translate-y-1/2 translate-x-full" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-dashed border-[#474747]">
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
            className="text-center"
            style={{
              borderLeft: i > 0 ? "1px solid #474747" : undefined,
              borderRight: i < 2 ? "1px solid #474747" : undefined,
            }}
          >
            <div className="font-mono text-lg text-white">
              {stat.value}
            </div>
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-[#c6c6c6] mt-1">
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
    <section className="p-8 bg-[#1b1b1b] flex-1">
      <SectionHeader title="Today's Goals" icon="tune" />
      {progress.length === 0 ? (
        <p className="font-sans text-sm text-[#c6c6c6] text-center py-8">
          No goals set for today
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {progress.slice(0, 4).map((bar) => (
            <div key={bar.goal_id}>
              <div className="flex justify-between font-mono text-xs uppercase tracking-[0.1em] mb-2">
                <span className="text-[#e2e2e2]">{bar.goal_name}</span>
                <span className="text-white">{bar.progress_percent}%</span>
              </div>
              <div className="h-2 w-full bg-[#131313] border border-[#474747] relative">
                <div
                  className="h-full bg-white relative"
                  style={{
                    width: `${Math.min(bar.progress_percent, 100)}%`,
                  }}
                >
                  {bar.progress_percent < 100 && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-[#131313]" />
                  )}
                </div>
              </div>
              <div className="font-mono text-[0.625rem] text-[#c6c6c6] mt-1 text-right">
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
    <section className="p-8 bg-[#1b1b1b] border-b border-[#474747]">
      <SectionHeader title="Weekly Activity" icon="bar_chart" />
      {days.length === 0 ? (
        <p className="font-sans text-sm text-[#c6c6c6] text-center py-16">
          No data this week
        </p>
      ) : (
        <>
          <div className="h-64 flex items-end justify-between gap-2 border-b border-[#474747] pb-2 relative">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(i / 4) * 100}%`,
                  borderTop: "1px dashed rgba(71,71,71,0.3)",
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
                        ? "rgba(255,255,255,0.8)"
                        : "#ffffff"
                      : "transparent",
                    border: bar.filled ? "none" : "1px solid #474747",
                    ...(!bar.filled && isHovered
                      ? { backgroundColor: "#474747" }
                      : {}),
                  }}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {isHovered && (
                    <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.625rem] bg-[#131313] border border-[#474747] px-1 whitespace-nowrap text-[#e2e2e2] top-[-1.5rem]">
                      {bar.hours.toFixed(1)}h
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-mono text-[0.625rem] text-[#c6c6c6] uppercase tracking-[0.1em] mt-2">
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
    <section className="p-8 bg-[#1b1b1b] flex-1">
      <SectionHeader title="System Analysis" icon="memory" />
      <div className="bg-[#131313] border border-[#474747] p-6 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
        {insight ? (
          <>
            <p className="font-sans text-sm leading-relaxed text-[#e2e2e2] mb-4 flex gap-2">
              <span className="font-mono text-white shrink-0">
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
            <p className="font-sans text-sm leading-relaxed text-[#e2e2e2] flex gap-2">
              <span className="font-mono text-white shrink-0">
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
          <p className="font-sans text-sm leading-relaxed text-[#c6c6c6] flex gap-2">
            <span className="font-mono text-white shrink-0">
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
      className="p-8 bg-[#1b1b1b] border-b border-[#474747] h-[60%] overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#1b1b1b] pt-2 pb-2 z-10">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-white border-b border-white pb-1">
          Activity Log
        </h2>
        <Icon name="list_alt" />
      </div>
      {entries.length === 0 ? (
        <p className="font-sans text-sm text-[#c6c6c6] text-center py-8">
          No activity recorded today
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="pl-4 pt-2 pb-2 cursor-pointer transition-colors duration-200 hover:bg-[#131313]"
              style={{
                borderLeft: `2px solid ${entry.isError ? "#ffb4ab" : entry.xp ? "#ffffff" : "#474747"}`,
                opacity: entry.isError ? 0.7 : 1,
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "font-mono text-xs font-bold text-[#e2e2e2] uppercase",
                    entry.isError && "line-through",
                  )}
                >
                  {entry.title}
                </span>
                <span
                  className={cn(
                    "font-mono text-[0.625rem]",
                    entry.isError ? "text-[#ffb4ab]" : "text-[#c6c6c6]",
                  )}
                >
                  {entry.time}
                </span>
              </div>
              <div className="font-sans text-xs text-[#c6c6c6] overflow-hidden truncate whitespace-nowrap">
                {entry.description}
              </div>
              {entry.xp && (
                <div
                  className="mt-2 font-mono text-[0.5625rem] text-white inline-block px-1"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
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

  const borderColor = !unlocked
    ? "rgba(71,71,71,0.5)"
    : active
      ? "#ffffff"
      : hovered
        ? "#ffffff"
        : "#474747";
  const iconColor = !unlocked
    ? "#474747"
    : active
      ? "#ffffff"
      : hovered
        ? "#ffffff"
        : "#474747";
  const labelColor = !unlocked
    ? "#c6c6c6"
    : active
      ? hovered
        ? "#1c1b1b"
        : "#e2e2e2"
      : hovered
        ? "#e2e2e2"
        : "#c6c6c6";
  const bgColor = active && hovered ? "#ffffff" : "transparent";

  return (
    <div
      className="p-4 flex flex-col items-center justify-center text-center transition-all duration-200"
      style={{
        border: `1px solid ${!unlocked ? "rgba(71,71,71,0.5)" : borderColor}`,
        borderStyle: !unlocked ? "dashed" : "solid",
        backgroundColor: bgColor,
        cursor: unlocked ? "pointer" : "default",
        opacity: !unlocked ? 0.5 : 1,
      }}
      onMouseEnter={() => unlocked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        name={icon}
        className="text-2xl mb-2"
        style={{ color: iconColor }}
      />
      <span
        className="font-mono text-[0.5625rem] uppercase tracking-[0.1em]"
        style={{ color: labelColor }}
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
    <section className="p-8 bg-[#1b1b1b] flex-1">
      <SectionHeader title="Achievements" icon="military_tech" />
      <div className="grid grid-cols-2 gap-4">
        {items.length === 0 ? (
          <p className="font-sans text-xs text-[#c6c6c6] col-span-full text-center">
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
    <div className="p-4 md:p-8 lg:p-12 xl:p-20 relative overflow-hidden">
      <header className="mb-16 border-b border-[#474747] pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="font-serif tracking-tight text-white leading-none uppercase m-0"
              style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}
            >
              System Status
            </h1>
            <div className="flex items-center gap-4 text-[#c6c6c6] font-mono text-xs uppercase tracking-[0.1em] flex-wrap">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full" />
                Live Telemetry
              </span>
              <span className="text-[#474747]">|</span>
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
          <div className="text-right border border-[#474747] p-4 bg-[#1b1b1b]">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#c6c6c6] block">
              Today's Usage
            </span>
            <div className="text-2xl font-mono font-bold text-white mt-1">
              {dailyStats ? formatDuration(dailyStats.total_seconds) : "—"}
            </div>
          </div>
        </div>
      </header>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[4fr_5fr_3fr] gap-px bg-[#474747] border border-[#474747] relative z-10"
      >
        <div className="bg-[#131313] flex flex-col gap-px">
          <CognitiveLoadDial
            totalSeconds={dailyStats?.total_seconds ?? 0}
            apps={dailyStats?.apps ?? []}
          />
          <SubroutineStatus progress={goalProgress} />
        </div>
        <div className="bg-[#131313] flex flex-col gap-px">
          <WeeklyTelemetry days={weeklyStats?.days ?? []} />
          <SystemAnalysis days={weeklyStats?.days ?? []} />
        </div>
        <div className="bg-[#131313] flex flex-col gap-px">
          <ActivityLog sessions={sessions} apps={dailyStats?.apps ?? []} />
          <Milestones achievements={achievements} />
        </div>
      </div>
    </div>
  );
}
