import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { DailyStats } from "../types";

export function useDailyStats() {
  return useQuery<DailyStats>({
    queryKey: ["dailyStats"],
    queryFn: () => api.getDailyUsage(),
  });
}