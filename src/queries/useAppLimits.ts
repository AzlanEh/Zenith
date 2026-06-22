import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { AppLimit } from "../types";

export function useAppLimits() {
  return useQuery<AppLimit[]>({
    queryKey: ["appLimits"],
    queryFn: () => api.getAppLimits(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useSetAppLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appName, minutes, blockWhenExceeded }: { appName: string; minutes: number; blockWhenExceeded?: boolean }) =>
      api.setAppLimit(appName, minutes, blockWhenExceeded),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appLimits"] });
    },
  });
}

export function useRemoveAppLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appName: string) => api.removeAppLimit(appName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appLimits"] });
    },
  });
}