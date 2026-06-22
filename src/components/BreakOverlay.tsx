import { useBreakTimer } from "@/hooks/useBreakTimer";
import { Button } from "@/components/ui/button";

const quotes = [
  "Take a moment to breathe.",
  "Rest is not idle; it's productive.",
  "A pause clears the path forward.",
  "Step away to see the bigger picture.",
  "Recharge. Refocus. Return stronger.",
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function BreakOverlay() {
  const { is_on_break, seconds_remaining, total_seconds, endBreak } = useBreakTimer();

  if (!is_on_break) return null;

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="text-center space-y-8 max-w-md px-6">
        <div className="space-y-3">
          <h2 className="text-4xl font-serif-accent font-bold tracking-tight">
            Time for a break
          </h2>
          <p className="text-muted-foreground text-lg">{quote}</p>
        </div>

        <div className="text-7xl font-mono font-bold tracking-tighter text-foreground">
          {formatTime(seconds_remaining)}
        </div>

        <div className="h-2 w-full bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-foreground transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${total_seconds > 0 ? (seconds_remaining / total_seconds) * 100 : 0}%` }}
          />
        </div>

        <Button variant="outline" size="lg" onClick={endBreak}>
          End Break Early
        </Button>
      </div>
    </div>
  );
}
