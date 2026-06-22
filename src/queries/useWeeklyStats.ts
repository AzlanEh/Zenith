import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { WeeklyStats } from "../types";

export function useWeeklyStats() {
  return useQuery<WeeklyStats>({
    queryKey: ["weeklyStats"],
    queryFn: () => api.getWeeklyStats(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}