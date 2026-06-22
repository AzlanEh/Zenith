import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { HourlyUsage } from "../types";

export function useHourlyUsage() {
  return useQuery<HourlyUsage[]>({
    queryKey: ["hourlyUsage"],
    queryFn: () => api.getHourlyUsage(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}