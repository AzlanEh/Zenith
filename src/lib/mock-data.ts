export type ActivityMetric = {
  label: string;
  value: string;
  max: number;
  current: number;
  color: string;
  icon: string;
};

export type Insight = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
};

export type ProgressItem = {
  id: string;
  label: string;
  value: string;
  progress: number;
  color: string;
};

export type RecentEntry = {
  id: string;
  title: string;
  time: string;
  duration: string;
  category: string;
  icon: string;
  color: string;
};

export const activityMetrics: ActivityMetric[] = [
  { label: 'Deep Work', value: '4h 20m', max: 8, current: 4.33, color: 'text-chart-1', icon: 'bolt' },
  { label: 'Mindfulness', value: '15m', max: 30, current: 15, color: 'text-chart-2', icon: 'self_improvement' },
  { label: 'Breaks', value: '45m', max: 60, current: 45, color: 'text-chart-3', icon: 'coffee' }
];

export const insights: Insight[] = [
  {
    id: '1',
    title: 'Peak Focus Time',
    description: 'You are most productive between 10 AM and 12 PM. Try scheduling complex tasks then.',
    icon: 'tips_and_updates',
    color: 'text-chart-3'
  },
  {
    id: '2',
    title: 'Break Suggestion',
    description: 'You have been working for 90 minutes. A 5-minute break could improve focus.',
    icon: 'battery_charging_50',
    color: 'text-chart-2'
  }
];

export const progressItems: ProgressItem[] = [
  { id: '1', label: 'Screen Time Limit', value: '2h 15m / 4h', progress: 56, color: 'bg-chart-1' },
  { id: '2', label: 'Tasks Completed', value: '5 / 8', progress: 62, color: 'bg-chart-4' },
  { id: '3', label: 'Hydration', value: '3 / 8 glasses', progress: 37, color: 'bg-chart-5' }
];

export const recentEntries: RecentEntry[] = [
  {
    id: '1',
    title: 'Coding Session',
    time: '10:00 AM - 11:30 AM',
    duration: '1h 30m',
    category: 'Deep Work',
    icon: 'code',
    color: 'bg-chart-1'
  },
  {
    id: '2',
    title: 'Meditation',
    time: '09:00 AM - 09:15 AM',
    duration: '15m',
    category: 'Mindfulness',
    icon: 'self_improvement',
    color: 'bg-chart-2'
  },
  {
    id: '3',
    title: 'Morning Walk',
    time: '08:00 AM - 08:30 AM',
    duration: '30m',
    category: 'Activity',
    icon: 'directions_walk',
    color: 'bg-chart-5'
  }
];
