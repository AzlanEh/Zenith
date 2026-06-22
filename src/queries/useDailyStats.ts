import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { DailyStats } from "../types";

export function useDailyStats() {
  return useQuery<DailyStats>({
    queryKey: ["dailyStats"],
    queryFn: () => api.getDailyUsage(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}