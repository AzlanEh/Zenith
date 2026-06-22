import { memo, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, type TooltipProps, type BarProps } from "recharts";
import { formatTime } from "../../lib/utils";

interface ChartDataItem {
  day: string;
  fullDate: string;
  seconds: number;
  hours: number;
}

interface WeeklyActivityChartProps {
  chartData: ChartDataItem[];
  maxHours: number;
  onDayClick?: (date: string) => void;
}

function TooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-1">{data.fullDate}</p>
        <p className="text-primary font-bold">{formatTime(data.seconds)}</p>
      </div>
    );
  }
  return null;
}

const WeeklyActivityChart = memo(function WeeklyActivityChart({
  chartData,
  maxHours,
  onDayClick,
}: WeeklyActivityChartProps) {
  const cellClassName = useMemo(() => (index: number) =>
    `fill-current transition-all duration-500 cursor-pointer ${
      index === chartData.length - 1 ? "text-primary" : "text-primary/40 hover:text-primary/80"
    }`, [chartData.length]);

  const handleBarClick: BarProps["onClick"] = (data) => {
    const d = data as { payload?: ChartDataItem };
    if (d.payload?.fullDate) onDayClick?.(d.payload.fullDate);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(value) => `${value}h`}
          domain={[0, Math.ceil(maxHours)]}
        />
        <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }} content={<TooltipContent />} />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={4} onClick={handleBarClick}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill="" className={cellClassName(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export { WeeklyActivityChart };