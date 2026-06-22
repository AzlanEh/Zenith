import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => api.startFocusSession(durationMinutes),
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