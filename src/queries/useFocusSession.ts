import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { FocusSession } from "../types";

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params?: { durationMinutes?: number; blockedApps?: string[] }) =>
      api.startFocusSession(params?.durationMinutes, params?.blockedApps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}

export function useStopFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.stopFocusSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}

export function useExtendFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (additionalMinutes: number) => api.extendFocusSession(additionalMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}