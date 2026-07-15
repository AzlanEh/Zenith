import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { AppLimit } from "../types";

export function useAppLimits() {
  return useQuery<AppLimit[]>({
    queryKey: ["appLimits"],
    queryFn: () => api.getAppLimits(),
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

