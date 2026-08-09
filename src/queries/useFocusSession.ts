import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { api } from "../services/api";
import type { FocusSession } from "../types";

export function useFocusSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<FocusSession>("focus-session-changed", () => {
      queryClient.invalidateQueries({ queryKey: ["focusSession"] });
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [queryClient]);

  return useQuery<FocusSession>({
    queryKey: ["focusSession"],
    queryFn: () => api.getFocusSession(),
    refetchInterval: 5000,
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => api.startFocusSession(durationMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSession"] });
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}

export function useStopFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.stopFocusSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSession"] });
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}