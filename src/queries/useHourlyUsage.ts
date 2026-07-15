import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { HourlyUsage } from "../types";

export function useHourlyUsage() {
  return useQuery<HourlyUsage[]>({
    queryKey: ["hourlyUsage"],
    queryFn: () => api.getHourlyUsage(),
  });
}