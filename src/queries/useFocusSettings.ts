import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { FocusSettings } from "../types";

export function useFocusSettings() {
  return useQuery<FocusSettings>({
    queryKey: ["focusSettings"],
    queryFn: () => api.getFocusSettings(),
  });
}

export function useUpdateFocusSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<FocusSettings>) => {
      const current = queryClient.getQueryData<FocusSettings>(["focusSettings"]);
      if (!current) return Promise.reject(new Error("Focus settings not loaded yet"));
      return api.setFocusSettings({ ...current, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}

export function useAddFocusBlockedApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appName: string) => api.addFocusBlockedApp(appName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}

export function useRemoveFocusBlockedApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appName: string) => api.removeFocusBlockedApp(appName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}