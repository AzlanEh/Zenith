import { memo, useMemo } from "react";

interface ActivityRingChartProps {
  activityMetrics: {
    label: string;
    value: string;
    max: number;
    current: number;
    color: string;
    icon: string;
  }[];
  mounted: boolean;
}

const ActivityRingChart = memo(function ActivityRingChart({
  activityMetrics,
  mounted,
}: ActivityRingChartProps) {
  const circles = useMemo(() =>
    activityMetrics.map((metric, idx) => {
      const r = 42 - idx * 10;
      if (r < 10) return null;
      const c = 2 * Math.PI * r;
      const percentage = Math.min(1, metric.current / metric.max);
      const dashoffset = c - percentage * c;
      return (
        <circle
          key={metric.label + idx}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className={`stroke-current ${metric.color} transition-all duration-1000 ease-out`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={mounted ? dashoffset : c}
        />
      );
    }),
    [activityMetrics, mounted]
  );

  return (
    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" className="stroke-secondary" strokeWidth="6" />
      <circle cx="50" cy="50" r="32" fill="none" className="stroke-secondary" strokeWidth="6" />
      <circle cx="50" cy="50" r="22" fill="none" className="stroke-secondary" strokeWidth="6" />
      {circles}
    </svg>
  );
});

export { ActivityRingChart };