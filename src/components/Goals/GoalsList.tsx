import { memo } from "react";
import { ProgressBar } from "./ProgressBar";
import { Switch } from "@/components/ui/switch";
import {
  Monitor,
  Clock,
  Package,
  Target,
  Trash2,
  Pencil,
} from "lucide-react";
import type { Goal, GoalProgress, GoalType } from "@/types";
import { cn } from "@/lib/utils";

interface GoalsListProps {
  goals: Goal[];
  progress: GoalProgress[];
  onToggle: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  on_track: "bg-chart-1",
  warning: "bg-chart-5",
  exceeded: "bg-destructive",
  achieved: "bg-chart-2",
  not_started: "bg-muted-foreground/30",
};

const statusText: Record<string, string> = {
  on_track: "On track",
  warning: "Warning",
  exceeded: "Exceeded",
  achieved: "Achieved",
  not_started: "Not started",
};

function getTypeIcon(gt: GoalType) {
  if ("daily_limit" in gt) return <Clock className="w-4 h-4" />;
  if ("app_limit" in gt) return <Monitor className="w-4 h-4" />;
  if ("category_limit" in gt) return <Package className="w-4 h-4" />;
  return <Target className="w-4 h-4" />;
}

function getTypeLabel(gt: GoalType): string {
  if ("daily_limit" in gt) return "Daily screen time";
  if ("app_limit" in gt) return `App: ${gt.app_limit.app_name}`;
  if ("category_limit" in gt) return `Category: ${gt.category_limit.category}`;
  return "Minimum productive";
}

function getProgressForGoal(goal: Goal, progress: GoalProgress[]): GoalProgress | undefined {
  return progress.find((p) => p.goal_id === goal.id);
}

export const GoalsList = memo(function GoalsList({ goals, progress, onToggle, onEdit, onDelete }: GoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No goals set</h3>
        <p className="text-sm text-muted-foreground/60 max-w-sm">
          Add your first goal to start your journey to cognitive sovereignty.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const gp = getProgressForGoal(goal, progress);
        const pct = gp?.progress_percent ?? 0;
        const status = gp?.status ?? "not_started";
        const currentMin = gp?.current_minutes ?? 0;

        return (
          <div
            key={goal.id}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground">{getTypeIcon(goal.goal_type)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">{getTypeLabel(goal.goal_type)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  status === "on_track" && "text-chart-1 bg-chart-1/10",
                  status === "warning" && "text-chart-5 bg-chart-5/10",
                  status === "exceeded" && "text-destructive bg-destructive/10",
                  status === "achieved" && "text-chart-2 bg-chart-2/10",
                  status === "not_started" && "text-muted-foreground bg-muted",
                )}>
                  {statusText[status]}
                </span>
                <button onClick={() => onEdit(goal)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(goal.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mb-2">
              <ProgressBar
                value={pct}
                size="sm"
                barClassName={statusColors[status]}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentMin} min / {goal.target_minutes} min</span>
              <span className="font-mono">{Math.round(pct)}%</span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-5 h-5 rounded text-[10px] flex items-center justify-center font-medium",
                      goal.days.length === 0 || goal.days.includes(i)
                        ? "bg-muted text-muted-foreground"
                        : "text-muted-foreground/30",
                    )}
                  >
                    {["S", "M", "T", "W", "T", "F", "S"][i]}
                  </span>
                ))}
              </div>
              <Switch
                checked={goal.enabled}
                onCheckedChange={() => onToggle(goal)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});
