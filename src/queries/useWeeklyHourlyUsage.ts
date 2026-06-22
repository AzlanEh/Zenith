import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { WeeklyHourlyUsage } from "../types";

export function useWeeklyHourlyUsage() {
  return useQuery<WeeklyHourlyUsage[]>({
    queryKey: ["weeklyHourlyUsage"],
    queryFn: () => api.getWeeklyHourlyUsage(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}