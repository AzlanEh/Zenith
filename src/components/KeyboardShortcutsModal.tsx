import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const shortcuts = [
  { keys: ["Ctrl", "D"], label: "Dashboard" },
  { keys: ["Ctrl", "F"], label: "Focus Mode" },
  { keys: ["Ctrl", "G"], label: "Goals" },
  { keys: ["Ctrl", "A"], label: "Analytics" },
  { keys: ["Ctrl", "L"], label: "Limits" },
  { keys: ["Ctrl", ","], label: "Settings" },
  { keys: ["Ctrl", "Shift", "F"], label: "Quick focus toggle" },
  { keys: ["?"], label: "Toggle this modal" },
  { keys: ["Esc"], label: "Close modal / overlay" },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate Zenith faster with these shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
