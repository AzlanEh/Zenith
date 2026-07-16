import { useState } from "react";
import { Pen, Trash2, X } from "lucide-react";
import type { Goal, GoalProgress } from "@/types";
import { cn } from "@/lib/utils";

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

function ProgressBar({ pct, color = "#f5f5e8", height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="w-full bg-[#353535] border border-[#474747] overflow-hidden" style={{ height }}>
      <div
        className="h-full"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, transition: "width 1s ease-out" }}
      />
    </div>
  );
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
    "font-sans uppercase tracking-[0.2em] text-[0.7rem] font-bold cursor-pointer p-4 w-full transition-all duration-200 border-2 border-[#f5f5e8]";
  const variantClasses: Record<string, string> = {
    primary: "bg-[#f5f5e8] text-[#131313] hover:bg-transparent hover:text-[#f5f5e8]",
    "outline-primary": "bg-transparent text-[#f5f5e8] hover:bg-[#f5f5e8] hover:text-[#131313]",
    ghost: "bg-transparent text-[#c6c6c6] border-none hover:text-[#f5f5e8]",
  };
  return (
    <button onClick={onClick} className={cn(baseClasses, variantClasses[variant], extraClasses)}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    on_track: {
      label: "On Track",
      bg: "rgba(245,245,232,0.1)",
      color: "#f5f5e8",
      border: "rgba(245,245,232,0.3)",
    },
    exceeded: {
      label: "Exceeded",
      bg: "rgba(255,180,171,0.1)",
      color: "#ffb4ab",
      border: "rgba(255,180,171,0.3)",
    },
    achieved: {
      label: "Achieved",
      bg: "#f5f5e8",
      color: "#131313",
      border: "#f5f5e8",
    },
    warning: {
      label: "Warning",
      bg: "rgba(255,180,171,0.1)",
      color: "#ffb4ab",
      border: "rgba(255,180,171,0.3)",
    },
    not_started: {
      label: "Not Started",
      bg: "rgba(145,145,145,0.1)",
      color: "#c6c6c6",
      border: "rgba(145,145,145,0.3)",
    },
  };
  const s = map[status] ?? map.not_started;
  return (
    <span
      className="font-mono text-[0.625rem] uppercase tracking-[0.1em] font-bold px-2 py-1"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

function IconBtn({ icon, hoverColor }: { icon: string; hoverColor: string }) {
  return (
    <button
      className="bg-transparent border-none cursor-pointer p-0 flex transition-colors duration-200 text-[#c6c6c6] hover:text-[var(--hover-color)]"
      style={{ "--hover-color": hoverColor } as React.CSSProperties}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-xs uppercase tracking-[0.1em] font-bold mb-2">{label}</label>
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
          ? "border-[#f5f5e8] bg-[#f5f5e8] text-[#131313]"
          : "border-[#474747] bg-transparent text-[#c6c6c6] hover:border-[#f5f5e8] hover:text-[#f5f5e8]"
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
        enabled ? "bg-[#f5f5e8] border-[#f5f5e8]" : "bg-[#2a2a2a] border-[#474747]"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 ml-1 transition-transform duration-200",
          enabled ? "bg-[#131313]" : "bg-[#c6c6c6]"
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

  const borderLeftColor =
    status === "exceeded" ? "#ffb4ab" : status === "achieved" ? "#f5f5e8" : "#474747";
  const progressColor = status === "exceeded" ? "#ffb4ab" : "#f5f5e8";

  return (
    <div className="group bg-[#1b1b1b] border-2 border-[#474747] p-6" style={{ borderLeft: `4px solid ${borderLeftColor}` }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-serif text-xl uppercase mb-1">{goal.name}</h4>
          <p className="font-mono text-xs text-[#c6c6c6] uppercase tracking-[0.1em] font-bold">
            {goal.target_minutes} min / day
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={status} />
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <IconBtn icon="edit" hoverColor="#f5f5e8" />
            <IconBtn icon="delete" hoverColor="#ffb4ab" />
          </div>
        </div>
      </div>
      <ProgressBar pct={pct} color={progressColor} />
      <div className="flex justify-between font-mono text-[0.625rem] uppercase font-bold text-[#c6c6c6] mt-2">
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(19,19,19,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-[#131313] border-4 border-[#474747] w-full max-w-[72rem] flex flex-col max-h-[90vh] overflow-hidden"
        style={{ boxShadow: "16px 16px 0px 0px rgba(255,255,255,0.05)" }}
      >
        <div className="p-6 md:p-8 flex justify-between items-center border-b-2 border-[#474747] shrink-0">
          <h2
            className="font-serif tracking-tight uppercase"
            style={{ fontSize: "clamp(1.25rem, 3vw, 2.25rem)" }}
          >
            Directive Management
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-none cursor-pointer text-[#c6c6c6] hover:text-[#f5f5e8] transition-colors duration-200 p-0"
          >
            <Icon name="close" size={32} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[7fr_5fr]">
          {/* Goals List */}
          <div className="p-8 border-r-2 border-[#474747] flex flex-col gap-8 overflow-y-auto min-h-0">
            <div className="flex justify-between items-end mb-4 shrink-0">
              <h3 className="font-sans text-sm uppercase tracking-[0.2em] font-bold text-[#c6c6c6]">
                Active Directives
              </h3>
              <span className="font-mono text-xs text-[#f5f5e8] font-bold">{goals.length} Total</span>
            </div>
            {goals.length === 0 ? (
              <p className="text-[#c6c6c6] font-sans text-center">No goals yet</p>
            ) : (
              goals.map((g) => <GoalItem key={g.id} goal={g} progress={progressMap.get(g.id)} />)
            )}
          </div>

          {/* Editor */}
          <div className="p-8" style={{ backgroundColor: "rgba(27,27,27,0.5)" }}>
            <h3 className="font-sans text-sm uppercase tracking-[0.2em] font-bold text-[#c6c6c6] mb-8">
              Configure Directive
            </h3>
            <div className="flex flex-col gap-6">
              <FormField label="Directive Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#131313] border-2 border-[#474747] p-3 font-sans text-[#e2e2e2] outline-none text-base box-border focus:border-[#f5f5e8]"
                />
              </FormField>

              <FormField label="Constraint Type">
                <select
                  value={constraintType}
                  onChange={(e) => setConstraintType(e.target.value)}
                  className="w-full bg-[#131313] border-2 border-[#474747] p-3 font-sans text-[#e2e2e2] outline-none text-base appearance-none rounded-none cursor-pointer focus:border-[#f5f5e8]"
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
                    className="w-full bg-[#131313] border-2 border-[#474747] p-3 font-sans text-[#e2e2e2] outline-none text-base box-border focus:border-[#f5f5e8]"
                  />
                </FormField>
              )}

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="font-mono text-xs uppercase tracking-[0.1em] font-bold">
                    Target Duration
                  </label>
                  <span className="font-mono text-lg text-[#f5f5e8] font-bold">{targetMinutes}m</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={480}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="w-full h-2 bg-[#353535] appearance-none border border-[#474747] cursor-pointer"
                  style={{ accentColor: "#f5f5e8" }}
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.1em] font-bold mb-3">
                  Active Cycles
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day, i) => (
                    <DayButton key={i} day={day} active={activeDays[i]} onToggle={() => toggleDay(i)} />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t-2 border-[#474747]">
                <label className="font-mono text-xs uppercase tracking-[0.1em] font-bold">
                  System Status
                </label>
                <ToggleSwitch enabled={enabled} onToggle={() => setEnabled((v) => !v)} />
              </div>

              <div className="pt-6">
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
