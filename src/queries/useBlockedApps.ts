import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export function useBlockedApps() {
  return useQuery<string[]>({
    queryKey: ["blockedApps"],
    queryFn: () => api.getBlockedApps(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}