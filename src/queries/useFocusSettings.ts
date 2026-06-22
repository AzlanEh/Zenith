import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { FocusSettings } from "../types";

export function useFocusSettings() {
  return useQuery<FocusSettings>({
    queryKey: ["focusSettings"],
    queryFn: () => api.getFocusSettings(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateFocusSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<FocusSettings>) =>
      api.setFocusSettings({ ...queryClient.getQueryData<FocusSettings>(["focusSettings"])!, ...updates } as FocusSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSettings"] });
    },
  });
}