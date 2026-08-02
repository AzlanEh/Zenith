import { useCallback, useMemo, useState } from "react";
import { Plus, Trophy, Flag, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GoalEditor } from "../components/Goals/GoalEditor";
import { ProgressBar } from "../components/Goals/ProgressBar";
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  trophy: Trophy,
  flag: Flag,
  lock: Lock,
  auto_awesome: Sparkles,
};

const Icon = ({
  name,
  style = {},
  className = "",
}: {
  name: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} style={style} />;
};

const ProgressBarCard = ({ item }: { item: GoalProgress }) => (
  <div>
    <div className="flex justify-between items-baseline mb-4">
      <span className="font-sans text-sm tracking-[0.15em] font-bold uppercase text-foreground">
        {item.goal_name}
      </span>
      <span className="font-mono text-3xl font-bold text-foreground">
        {item.progress_percent}%
      </span>
    </div>
    <ProgressBar value={item.progress_percent} size="xl" className="border-2 border-border" />
    <div className="flex justify-between mt-2 font-mono text-[0.72rem] text-muted-foreground uppercase font-bold">
      <span>Target: {item.target_minutes}m</span>
      <span className={item.is_met ? "text-primary font-bold" : "text-muted-foreground"}>
        {item.current_minutes}m
      </span>
    </div>
  </div>
);

const DailyProgress = ({ progress }: { progress: GoalProgress[] }) => (
  <div className="lg:col-span-8 bg-card p-6 md:p-10 border-4 border-border">
    <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-border">
      <h2 className="font-serif text-2xl uppercase tracking-[0.05em] text-foreground">
        Daily Progress
      </h2>
      <span className="font-mono text-primary text-[0.72rem] font-bold uppercase tracking-[0.1em]">
        Updated live
      </span>
    </div>
    <div className="flex flex-col gap-8">
      {progress.length === 0 ? (
        <p className="text-muted-foreground text-center font-sans">
          No goals set for today
        </p>
      ) : (
        progress.map((item) => <ProgressBarCard key={item.goal_id} item={item} />)
      )}
    </div>
  </div>
);

const PersonalRecords = ({ longestSession }: { longestSession: string }) => (
  <div className="lg:col-span-4 flex flex-col gap-8">
    <div className="bg-primary text-primary-foreground p-6 sm:p-10 border-4 border-primary flex-1">
      <div className="flex justify-between items-start pb-4 mb-8 border-b-2 border-primary-foreground/30">
        <Icon name="trophy" className="text-5xl text-primary-foreground" />
        <span className="font-mono text-[0.7rem] tracking-[0.15em] font-bold uppercase">
          Hall of Fame
        </span>
      </div>
      <h3 className="font-sans text-[0.8rem] tracking-[0.2em] font-bold uppercase mb-4 opacity-90">
        Longest Focus Session
      </h3>
      <p className="font-mono text-[3.5rem] font-bold tracking-[-0.05em] leading-none mb-4">
        {longestSession}
      </p>
      <p className="font-serif text-base italic border-l-4 border-primary-foreground/40 pl-4">
        Your peak focus achievement
      </p>
    </div>

    <div className="bg-card p-6 sm:p-10 border-4 border-border flex-1">
      <h3 className="font-sans text-muted-foreground text-[0.8rem] tracking-[0.2em] font-bold uppercase mb-4">
        Focus Sessions Completed
      </h3>
      <p className="font-mono text-foreground text-[2.75rem] font-bold tracking-[-0.05em]">
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
    <div className="group bg-card p-6 sm:p-8 border-4 border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      <div className="flex justify-between mb-6">
        <Icon name="flag" className="text-primary text-3xl" />
        <span className="font-mono text-foreground text-lg font-bold">
          {pct}%
        </span>
      </div>
      <h4 className="font-serif text-2xl uppercase text-foreground mb-2">
        {goal.name}
      </h4>
      <p className="font-sans text-muted-foreground text-xs tracking-[0.15em] font-bold uppercase mb-6">
        {goal.target_minutes} min / day
      </p>
      <div className="flex gap-2">
        {Array.from({ length: nSegs }, (_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 border ${i < filledSegs ? "bg-primary border-primary" : "bg-muted border-border"}`}
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
    <div className="lg:col-span-12 mt-4">
      <div className="flex justify-between items-end mb-8 pb-4 border-b-4 border-border">
        <h2 className="font-serif text-4xl sm:text-5xl uppercase text-foreground">
          Active Challenges
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {goals.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center font-sans py-8">
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
      <div className="group aspect-square p-4 cursor-pointer transition-all duration-300 border-4 border-border hover:border-primary bg-card hover:bg-primary flex flex-col items-center justify-center">
        <Icon
          name={achievement.icon || "auto_awesome"}
          className="text-[2.5rem] mb-3 text-primary group-hover:text-primary-foreground"
        />
        <span className="font-mono text-[0.65rem] tracking-[0.08em] font-bold uppercase text-center text-foreground group-hover:text-primary-foreground">
          {achievement.name}
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-background border-4 border-dashed border-border flex flex-col items-center justify-center p-4 opacity-40">
      <Icon name="lock" className="text-[2rem] mb-3 text-muted-foreground" />
      <span className="font-mono text-[0.6rem] tracking-[0.08em] font-bold uppercase text-center text-muted-foreground">
        {achievement.name}
      </span>
    </div>
  );
};

const BadgesGallery = ({ achievements }: { achievements: Achievement[] }) => (
  <div className="lg:col-span-12 pt-12">
    <h2 className="font-serif text-4xl sm:text-5xl uppercase text-foreground mb-8 pb-4 border-b-4 border-border">
      Achievements
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
      {achievements.length === 0 ? (
        <p className="text-muted-foreground col-span-full text-center font-sans py-8">
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
      <header className="mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-8 border-b-4 border-primary gap-4">
          <div>
            <h1
              className="font-serif text-[clamp(2.25rem,5vw,4.5rem)] text-foreground uppercase leading-none mb-4 tracking-[-0.01em]"
            >
              Goals &amp; Milestones
            </h1>
            <p className="text-muted-foreground max-w-xl text-base leading-relaxed border-l-4 border-primary pl-4">
              Track your journey to cognitive sovereignty
            </p>
          </div>
          {stats && (
            <div className="bg-primary text-primary-foreground p-6 border-4 border-primary text-right shrink-0 w-full sm:w-auto">
              <span className="font-mono text-xs tracking-[0.12em] font-bold uppercase block">
                Current Streak
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-bold mt-2">
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

      <button
        onClick={handleAdd}
        aria-label="Add goal"
        className="fixed bottom-8 right-8 z-[100] w-16 h-16 rounded-none bg-primary text-primary-foreground border-2 border-primary flex items-center justify-center cursor-pointer shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Plus size={32} />
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
