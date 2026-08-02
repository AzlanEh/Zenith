import { useState } from "react";
import { Pen, Trash2, X } from "lucide-react";
import type { Goal, GoalProgress } from "@/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

const CONSTRAINT_TYPES = [
  "Daily Screen Time",
  "App Limit",
  "Category Limit",
  "Minimum Productive Time",
] as const;

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DEFAULT_ACTIVE_DAYS = [false, true, true, true, true, true, false];

interface GoalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: Goal) => void;
  initial?: Goal;
  goals?: Goal[];
  progress?: GoalProgress[];
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  edit: Pen,
  delete: Trash2,
  close: X,
};

function Icon({ name, size = 24, style: s }: { name: string; size?: number; style?: React.CSSProperties }) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} style={s} />;
}

function HoverButton({
  children,
  onClick,
  variant = "primary",
  className: extraClasses,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline-primary" | "ghost";
  className?: string;
}) {
  const baseClasses =
    "font-sans uppercase tracking-[0.2em] text-[0.7rem] font-bold cursor-pointer p-4 w-full transition-all duration-200 border-2";
  const variantClasses: Record<string, string> = {
    primary: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
    "outline-primary": "bg-transparent text-foreground border-border hover:bg-muted hover:border-foreground",
    ghost: "bg-transparent text-muted-foreground border-transparent hover:text-foreground",
  };
  return (
    <button onClick={onClick} className={cn(baseClasses, variantClasses[variant], extraClasses)}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    on_track: {
      label: "On Track",
      className: "bg-primary/10 text-foreground border-primary/30",
    },
    exceeded: {
      label: "Exceeded",
      className: "bg-destructive/10 text-destructive border-destructive/30",
    },
    achieved: {
      label: "Achieved",
      className: "bg-primary text-primary-foreground border-primary",
    },
    warning: {
      label: "Warning",
      className: "bg-destructive/10 text-destructive border-destructive/30",
    },
    not_started: {
      label: "Not Started",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const s = map[status] ?? map.not_started;
  return (
    <span
      className={cn("font-mono text-[0.625rem] uppercase tracking-[0.1em] font-bold px-2 py-1 border", s.className)}
    >
      {s.label}
    </span>
  );
}

function IconBtn({ icon, onClick }: { icon: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none cursor-pointer p-1 flex transition-colors duration-200 text-muted-foreground hover:text-foreground"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-xs uppercase tracking-[0.1em] font-bold mb-2 text-foreground">{label}</label>
      {children}
    </div>
  );
}

function DayButton({ day, active, onToggle }: { day: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex-1 aspect-square flex items-center justify-center font-mono text-xs font-bold p-0 cursor-pointer transition-all duration-200 border-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {day}
    </button>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-12 h-6 relative flex items-center cursor-pointer transition-all duration-200 border-2",
        enabled ? "bg-primary border-primary" : "bg-muted border-border"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 ml-1 transition-transform duration-200",
          enabled ? "bg-primary-foreground" : "bg-muted-foreground"
        )}
        style={{ transform: enabled ? "translateX(1.25rem)" : "translateX(0)" }}
      />
    </button>
  );
}

function GoalItem({ goal, progress }: { goal: Goal; progress?: GoalProgress }) {
  const pct = progress?.progress_percent ?? 0;
  const status = progress?.status ?? "not_started";
  const currentMin = progress?.current_minutes ?? 0;

  const borderLeftClass =
    status === "exceeded"
      ? "border-l-destructive"
      : status === "achieved"
        ? "border-l-primary"
        : "border-l-border";
  const progressColorClass = status === "exceeded" ? "bg-destructive" : "bg-primary";

  return (
    <div className={cn("group bg-card border-2 border-border p-5 border-l-4", borderLeftClass)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-serif text-xl uppercase mb-1 text-foreground">{goal.name}</h4>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.1em] font-bold">
            {goal.target_minutes} min / day
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <IconBtn icon="edit" />
            <IconBtn icon="delete" />
          </div>
        </div>
      </div>
      <ProgressBar value={pct} size="sm" className="border border-border" barClassName={progressColorClass} />
      <div className="flex justify-between font-mono text-[0.625rem] uppercase font-bold text-muted-foreground mt-2">
        <span>Current: {currentMin}m</span>
        <span>Target: {goal.target_minutes}m</span>
      </div>
    </div>
  );
}

function getConstraintType(gt: Goal["goal_type"]): string {
  if ("daily_limit" in gt) return "Daily Screen Time";
  if ("app_limit" in gt) return "App Limit";
  if ("category_limit" in gt) return "Category Limit";
  return "Minimum Productive Time";
}

export function GoalEditor({ open, onOpenChange, onSave, initial, goals = [], progress = [] }: GoalEditorProps) {
  const [name, setName] = useState(initial?.name ?? "New Directive");
  const [constraintType, setConstraintType] = useState<string>(
    initial ? getConstraintType(initial.goal_type) : CONSTRAINT_TYPES[0]
  );
  const [targetMinutes, setTargetMinutes] = useState(initial?.target_minutes ?? 120);
  const [activeDays, setActiveDays] = useState<boolean[]>(
    initial?.days?.length
      ? DAYS.map((_, i) => initial.days!.includes(i))
      : DEFAULT_ACTIVE_DAYS
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [extraValue, setExtraValue] = useState("");

  const needsExtra =
    constraintType === "App Limit" ||
    constraintType === "Category Limit" ||
    constraintType === "Minimum Productive Time";
  const extraLabel = constraintType === "App Limit" ? "App name" : "Category";

  const progressMap = new Map<string, GoalProgress>();
  for (const p of progress) progressMap.set(p.goal_id, p);

  const toggleDay = (i: number) => {
    setActiveDays((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const trimmed = extraValue.trim();
    let goal_type: Goal["goal_type"] = { daily_limit: {} };
    switch (constraintType) {
      case "App Limit":
        goal_type = { app_limit: { app_name: trimmed || "" } };
        break;
      case "Category Limit":
        goal_type = { category_limit: { category: trimmed || "" } };
        break;
      case "Minimum Productive Time":
        goal_type = { minimum_productive: { category: trimmed || "" } };
        break;
    }
    const days = activeDays.map((a, i) => (a ? i : -1)).filter((d) => d >= 0);
    const goal: Goal = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      goal_type,
      target_minutes: targetMinutes,
      days,
      enabled,
      created_at: initial?.created_at ?? new Date().toISOString(),
    };
    onSave(goal);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-card border-4 border-border w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 flex justify-between items-center border-b-2 border-border shrink-0 bg-card">
          <h2
            className="font-serif tracking-tight uppercase text-foreground"
            style={{ fontSize: "clamp(1.25rem, 3vw, 2.25rem)" }}
          >
            Directive Management
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close directive manager"
            className="bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200 p-0"
          >
            <Icon name="close" size={28} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Goals List */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-border flex flex-col gap-6 overflow-y-auto min-h-0 bg-card">
            <div className="flex justify-between items-end mb-2 shrink-0">
              <h3 className="font-sans text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground">
                Active Directives
              </h3>
              <span className="font-mono text-xs text-foreground font-bold">{goals.length} Total</span>
            </div>
            {goals.length === 0 ? (
              <p className="text-muted-foreground font-sans text-center py-8">No goals yet</p>
            ) : (
              goals.map((g) => <GoalItem key={g.id} goal={g} progress={progressMap.get(g.id)} />)
            )}
          </div>

          {/* Editor */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-background flex flex-col gap-6 overflow-y-auto min-h-0">
            <h3 className="font-sans text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">
              Configure Directive
            </h3>
            <div className="flex flex-col gap-6">
              <FormField label="Directive Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-card border-2 border-border p-3 font-sans text-foreground outline-none text-base box-border focus:border-primary"
                />
              </FormField>

              <FormField label="Constraint Type">
                <select
                  value={constraintType}
                  onChange={(e) => setConstraintType(e.target.value)}
                  className="w-full bg-card border-2 border-border p-3 font-sans text-foreground outline-none text-base appearance-none rounded-none cursor-pointer focus:border-primary"
                >
                  {CONSTRAINT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              {needsExtra && (
                <FormField label={extraLabel}>
                  <input
                    type="text"
                    value={extraValue}
                    onChange={(e) => setExtraValue(e.target.value)}
                    placeholder={`Enter ${extraLabel.toLowerCase()}`}
                    className="w-full bg-card border-2 border-border p-3 font-sans text-foreground outline-none text-base box-border focus:border-primary"
                  />
                </FormField>
              )}

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="font-mono text-xs uppercase tracking-[0.1em] font-bold text-foreground">
                    Target Duration
                  </label>
                  <span className="font-mono text-lg text-foreground font-bold">{targetMinutes}m</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={480}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.1em] font-bold mb-3 text-foreground">
                  Active Cycles
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day, i) => (
                    <DayButton key={i} day={day} active={activeDays[i]} onToggle={() => toggleDay(i)} />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t-2 border-border">
                <label className="font-mono text-xs uppercase tracking-[0.1em] font-bold text-foreground">
                  System Status
                </label>
                <ToggleSwitch enabled={enabled} onToggle={() => setEnabled((v) => !v)} />
              </div>

              <div className="pt-4">
                <HoverButton variant="primary" onClick={handleSave}>
                  Enforce Directive
                </HoverButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
