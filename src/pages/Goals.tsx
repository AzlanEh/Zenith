import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { GoalEditor } from "../components/Goals/GoalEditor";
import { useFocusHistory } from "../hooks/useFocusHistory";
import {
  useAchievements,
  useAddGoal,
  useGoals,
  useGoalsProgress,
  useGoalsStats,
  useUpdateGoal,
} from "../queries";
import type { Achievement, Goal, GoalProgress } from "../types";

const Icon = ({
  name,
  style = {},
  className = "",
}: {
  name: string;
  style?: React.CSSProperties;
  className?: string;
}) => (
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

const ProgressBar = ({ item }: { item: GoalProgress }) => (
  <div>
    <div className="flex justify-between items-baseline mb-4">
      <span className="font-sans text-sm tracking-[0.15em] font-bold uppercase">
        {item.goal_name}
      </span>
      <span className="font-mono text-3xl font-bold text-[oklch(0.98_0.01_106)]">
        {item.progress_percent}%
      </span>
    </div>
    <div className="h-6 bg-[#353535] border-2 border-[#474747] overflow-hidden">
      <div
        style={{
          height: "100%",
          backgroundColor: "oklch(0.98 0.01 106)",
          width: `${item.progress_percent}%`,
          transition: "width 1s ease-out",
        }}
      />
    </div>
    <div className="flex justify-between mt-2 font-mono text-[0.72rem] text-[#c6c6c6] uppercase font-bold">
      <span>Target: {item.target_minutes}m</span>
      <span style={item.is_met ? { color: "oklch(0.98 0.01 106)" } : {}}>
        {item.current_minutes}m
      </span>
    </div>
  </div>
);

const DailyProgress = ({ progress }: { progress: GoalProgress[] }) => (
  <div className="lg:col-span-8 bg-[#1b1b1b] p-10 border-4 border-[#474747] shadow-[12px_12px_0_rgba(255,255,255,0.04)]">
    <div className="flex justify-between items-center mb-12 pb-4 border-b-2 border-[#474747]">
      <h2 className="font-serif text-2xl uppercase tracking-[0.05em] text-[#e2e2e2]">
        Daily Progress
      </h2>
      <span className="font-mono text-[oklch(0.98_0.01_106)] text-[0.72rem] font-bold uppercase tracking-[0.1em]">
        Updated live
      </span>
    </div>
    <div className="flex flex-col gap-12">
      {progress.length === 0 ? (
        <p className="text-[#c6c6c6] text-center font-sans">
          No goals set for today
        </p>
      ) : (
        progress.map((item) => <ProgressBar key={item.goal_id} item={item} />)
      )}
    </div>
  </div>
);

const PersonalRecords = ({ longestSession }: { longestSession: string }) => (
  <div className="lg:col-span-4 flex flex-col gap-8">
    <div className="bg-[oklch(0.98_0.01_106)] text-[#131313] p-10 border-4 border-[oklch(0.98_0.01_106)] flex-1 shadow-[8px_8px_0_rgba(255,255,255,0.15)]">
      <div className="flex justify-between items-start pb-4 mb-8 border-b-2 border-[#131313]">
        <Icon name="trophy" className="text-5xl text-[#131313]" />
        <span className="font-mono text-[#131313] text-[0.7rem] tracking-[0.15em] font-bold uppercase">
          Hall of Fame
        </span>
      </div>
      <h3 className="font-sans text-[#131313] text-[0.8rem] tracking-[0.2em] font-bold uppercase mb-4">
        Longest Focus Session
      </h3>
      <p className="font-mono text-[3.5rem] font-bold tracking-[-0.05em] text-[#131313] leading-none mb-4">
        {longestSession}
      </p>
      <p className="font-serif text-[#131313] text-base italic border-l-4 border-[#131313] pl-4">
        Your peak focus achievement
      </p>
    </div>

    <div className="bg-[#2a2a2a] p-10 border-4 border-[#474747] flex-1">
      <h3 className="font-sans text-[#c6c6c6] text-[0.8rem] tracking-[0.2em] font-bold uppercase mb-4">
        Focus Sessions Completed
      </h3>
      <p className="font-mono text-[oklch(0.98_0.01_106)] text-[2.75rem] font-bold tracking-[-0.05em]">
        {longestSession === "00:00" ? 0 : "—"}
      </p>
    </div>
  </div>
);

const MilestoneCard = ({
  goal,
  progress,
}: {
  goal: Goal;
  progress?: GoalProgress;
}) => {
  const pct = progress?.progress_percent ?? 0;

  const nSegs = 5;
  const filledSegs = Math.round((pct / 100) * nSegs);

  return (
    <div className="group bg-[#2a2a2a] p-8 border-4 border-[#474747] group-hover:border-[oklch(0.98_0.01_106)] transition-all duration-300 hover:-translate-y-2 cursor-pointer shadow-[8px_8px_0_rgba(255,255,255,0.04)]">
      <div className="flex justify-between mb-8">
        <Icon name="flag" className="text-[oklch(0.98_0.01_106)] text-3xl" />
        <span className="font-mono text-[oklch(0.98_0.01_106)] text-lg font-bold">
          {pct}%
        </span>
      </div>
      <h4 className="font-serif text-2xl uppercase text-[#e2e2e2] mb-2">
        {goal.name}
      </h4>
      <p className="font-sans text-[#c6c6c6] text-xs tracking-[0.15em] font-bold uppercase mb-6">
        {goal.target_minutes} min / day
      </p>
      <div className="flex gap-2">
        {Array.from({ length: nSegs }, (_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 border ${i < filledSegs ? "bg-[oklch(0.98_0.01_106)] border-[oklch(0.98_0.01_106)]" : "bg-[#0e0e0e] border-[#474747]"}`}
          />
        ))}
      </div>
    </div>
  );
};

const ActiveChallenges = ({
  goals,
  progress,
}: {
  goals: Goal[];
  progress: GoalProgress[];
}) => {
  const progressMap = useMemo(() => {
    const m = new Map<string, GoalProgress>();
    for (const p of progress) m.set(p.goal_id, p);
    return m;
  }, [progress]);

  return (
    <div className="lg:col-span-12 mt-8">
      <div className="flex justify-between items-end mb-10 pb-4 border-b-4 border-[#474747]">
        <h2 className="font-serif text-5xl uppercase text-[#e2e2e2]">
          Active Challenges
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {goals.length === 0 ? (
          <p className="text-[#c6c6c6] col-span-full text-center font-sans">
            No goals yet. Create one to start tracking.
          </p>
        ) : (
          goals
            .slice(0, 6)
            .map((g) => (
              <MilestoneCard
                key={g.id}
                goal={g}
                progress={progressMap.get(g.id)}
              />
            ))
        )}
      </div>
    </div>
  );
};

const BadgeItem = ({ achievement }: { achievement: Achievement }) => {
  const earned = !!achievement.earned_at;

  if (earned) {
    return (
      <div className="group aspect-square p-4 cursor-pointer transition-all duration-300 shadow-[4px_4px_0_rgba(255,255,255,0.07)] border-4 border-[#474747] group-hover:border-[oklch(0.98_0.01_106)] bg-[#2a2a2a] group-hover:bg-[oklch(0.98_0.01_106)] flex flex-col items-center justify-center">
        <Icon
          name={achievement.icon || "auto_awesome"}
          className="text-[2.75rem] mb-3 text-[oklch(0.98_0.01_106)] group-hover:text-[#131313]"
        />
        <span className="font-mono text-[0.65rem] tracking-[0.08em] font-bold uppercase text-center text-[#e2e2e2] group-hover:text-[#131313]">
          {achievement.name}
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-[#131313] border-4 border-dashed border-[#474747] flex flex-col items-center justify-center p-4 opacity-45 grayscale">
      <Icon name="lock" className="text-[2.25rem] mb-3" />
      <span className="font-mono text-[0.6rem] tracking-[0.08em] font-bold uppercase text-center text-[#e2e2e2]">
        {achievement.name}
      </span>
    </div>
  );
};

const BadgesGallery = ({ achievements }: { achievements: Achievement[] }) => (
  <div className="lg:col-span-12 pt-16">
    <h2 className="font-serif text-5xl uppercase text-[#e2e2e2] mb-12 pb-4 border-b-4 border-[#474747]">
      Achievements
    </h2>
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
      {achievements.length === 0 ? (
        <p className="text-[#c6c6c6] col-span-full text-center font-sans">
          No achievements yet
        </p>
      ) : (
        achievements.map((a) => <BadgeItem key={a.id} achievement={a} />)
      )}
    </div>
  </div>
);

export function Goals() {
  const { data: goals = [] } = useGoals();
  const { data: progress = [] } = useGoalsProgress();
  const { data: stats } = useGoalsStats();
  const { data: achievements = [] } = useAchievements();
  const { sessions } = useFocusHistory();
  const addGoal = useAddGoal();
  const updateGoal = useUpdateGoal();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);

  const handleAdd = useCallback(() => {
    setEditingGoal(undefined);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(
    (goal: Goal) => {
      if (editingGoal) {
        updateGoal.mutate(goal, {
          onSuccess: () => toast.success("Goal updated"),
          onError: () => toast.error("Failed to update goal"),
        });
      } else {
        addGoal.mutate(goal, {
          onSuccess: () => toast.success("Goal added"),
          onError: () => toast.error("Failed to add goal"),
        });
      }
    },
    [editingGoal, addGoal, updateGoal],
  );

  const longestSession = useMemo(() => {
    const completed = sessions.filter((s) => s.completed);
    if (completed.length === 0) return "00:00";
    const maxMin = Math.max(...completed.map((s) => s.duration_minutes));
    const h = Math.floor(maxMin / 60);
    const m = maxMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  }, [sessions]);

  return (
    <div className="p-4 md:p-8 lg:p-10 xl:p-16 flex-1 relative overflow-hidden">
      <header className="mb-16">
        <div className="flex flex-col sm:flex-row justify-between items-end pb-8 border-b-4 border-[oklch(0.98_0.01_106)] gap-4">
          <div>
            <h1
              className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] text-[oklch(0.98_0.01_106)] uppercase leading-none mb-4 tracking-[-0.01em]"
            >
              Goals &amp; Milestones
            </h1>
            <p className="text-[#c6c6c6] max-w-xl text-base leading-relaxed border-l-4 border-[oklch(0.98_0.01_106)] pl-4">
              Track your journey to cognitive sovereignty
            </p>
          </div>
          {stats && (
            <div className="bg-[oklch(0.98_0.01_106)] text-[#131313] p-6 border-4 border-[oklch(0.98_0.01_106)] text-right shadow-[8px_8px_0_rgba(255,255,255,0.08)] shrink-0">
              <span className="font-mono text-xs tracking-[0.12em] font-bold uppercase block">
                Current Streak
              </span>
              <div className="font-mono text-4xl font-bold mt-2">
                {stats.current_streak} days
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <DailyProgress progress={progress} />
        <PersonalRecords longestSession={longestSession} />
        <ActiveChallenges goals={goals} progress={progress} />
        <BadgesGallery achievements={achievements} />
      </div>

      <div className="fixed -bottom-40 -right-40 w-[37.5rem] h-[37.5rem] bg-[oklch(0.98_0.01_106)] opacity-[0.06] blur-[100px] pointer-events-none rotate-45" />
      <div className="fixed top-20 left-72 w-[25rem] h-[25rem] bg-[#474747] opacity-[0.08] blur-[80px] pointer-events-none -rotate-12" />

      <button
        onClick={handleAdd}
        className="fixed bottom-8 right-8 z-[100] w-16 h-16 rounded-full bg-[oklch(0.98_0.01_106)] text-[#131313] border-3 border-[oklch(0.98_0.01_106)] flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-110"
      >
        <span
          className="material-symbols-outlined text-[2rem]"
          style={{
            fontVariationSettings:
              "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24",
          }}
        >
          add
        </span>
      </button>

      <GoalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        initial={editingGoal}
        goals={goals}
        progress={progress}
      />
    </div>
  );
}
