import { useAchievements } from "@/queries";

export function AchievementsPanel() {
  const { data: achievements } = useAchievements();

  if (!achievements || achievements.length === 0) return null;

  const earned = achievements.filter((a) => !!a.earned_at);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-sm mb-3">Achievements</h3>
      <div className="grid grid-cols-3 gap-2">
        {achievements.slice(0, 9).map((a) => {
          const isEarned = !!a.earned_at;
          return (
            <div
              key={a.id}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center gap-1 p-1 border transition-colors ${
                isEarned
                  ? "bg-muted border-border"
                  : "bg-muted/30 border-dashed border-border/50 opacity-50 grayscale"
              }`}
              title={a.name}
            >
              <span className="text-lg">{isEarned ? "🏆" : "🔒"}</span>
              <span className="text-[9px] leading-tight font-medium text-muted-foreground line-clamp-2">
                {a.name}
              </span>
            </div>
          );
        })}
      </div>
      {earned.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {earned.length} / {achievements.length} earned
        </p>
      )}
    </div>
  );
}
