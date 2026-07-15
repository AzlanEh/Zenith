import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { WeeklyStats } from "../types";

export function useWeeklyStats() {
  return useQuery<WeeklyStats>({
    queryKey: ["weeklyStats"],
    queryFn: () => api.getWeeklyStats(),
  });
}