import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FocusSessionNotesProps {
  open: boolean;
  onClose: () => void;
  durationMinutes: number;
}

export function FocusSessionNotes({ open, onClose, durationMinutes }: FocusSessionNotesProps) {
  const [note, setNote] = useState("");

  const handleSave = () => {
    const today = new Date().toISOString().split("T")[0];
    const existing = JSON.parse(localStorage.getItem("focus_notes") || "{}");
    existing[today] = { note: note.trim(), duration_minutes: durationMinutes };
    localStorage.setItem("focus_notes", JSON.stringify(existing));
    setNote("");
    onClose();
  };

  const handleSkip = () => {
    setNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Complete</DialogTitle>
          <DialogDescription>
            Great focus session! How did it go?
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any distractions? What did you accomplish?"
          className="w-full h-24 p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
