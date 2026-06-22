import { useState } from "react";
import type { FocusSchedule } from "../types";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface FocusScheduleEditorProps {
  schedules: FocusSchedule[];
  onSave: (schedules: FocusSchedule[]) => Promise<void>;
}

function emptySchedule(): FocusSchedule {
  return {
    id: crypto.randomUUID(),
    name: "",
    days: [],
    start_time: "09:00",
    end_time: "12:00",
    blocked_apps: [],
    enabled: true,
  };
}

export function FocusScheduleEditor({ schedules, onSave }: FocusScheduleEditorProps) {
  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<FocusSchedule>(emptySchedule());

  const handleOpen = (idx: number | null) => {
    if (idx !== null) {
      setDraft({ ...schedules[idx] });
    } else {
      setDraft(emptySchedule());
    }
    setEditIdx(idx);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Schedule name is required");
      return;
    }
    if (draft.days.length === 0) {
      toast.error("Select at least one day");
      return;
    }

    const next = [...schedules];
    if (editIdx !== null) {
      next[editIdx] = draft;
    } else {
      next.push(draft);
    }
    await onSave(next);
    setOpen(false);
  };

  const handleDelete = async (idx: number) => {
    const next = schedules.filter((_, i) => i !== idx);
    await onSave(next);
  };

  const toggleDay = (day: number) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  };

  if (schedules.length === 0 && !open) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-xl">
        <p className="text-sm text-muted-foreground mb-4">No focus schedules configured</p>
        <button
          onClick={() => handleOpen(null)}
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule, idx) => {
        const dayLabels = schedule.days.length === 7
          ? "Every day"
          : schedule.days.map((d) => DAYS[d]).join(", ");

        return (
          <div
            key={schedule.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              schedule.enabled
                ? "border-border bg-secondary/10"
                : "border-border/50 bg-secondary/5 opacity-50"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{schedule.name}</span>
                {!schedule.enabled && (
                  <span className="text-[0.6rem] font-mono uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {schedule.start_time} - {schedule.end_time} · {dayLabels}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <button
                onClick={() => handleOpen(idx)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit schedule"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(idx)}
                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                aria-label="Delete schedule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => handleOpen(null)}
        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
      >
        <Plus className="w-4 h-4" />
        Add Schedule
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-serif-accent text-foreground">
                {editIdx !== null ? "Edit Schedule" : "New Schedule"}
              </DialogTitle>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Morning Focus"
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Days</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(i)}
                    className={`w-10 h-10 text-xs font-medium rounded-full transition-colors ${
                      draft.days.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Start</label>
                <input
                  type="time"
                  value={draft.start_time}
                  onChange={(e) => setDraft((p) => ({ ...p, start_time: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">End</label>
                <input
                  type="time"
                  value={draft.end_time}
                  onChange={(e) => setDraft((p) => ({ ...p, end_time: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Enabled</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={draft.enabled}
                  onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {editIdx !== null ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
