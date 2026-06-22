import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { NotificationSettings } from "../types";

export function useNotificationSettings() {
  return useQuery<NotificationSettings>({
    queryKey: ["notificationSettings"],
    queryFn: () => api.getNotificationSettings(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<NotificationSettings>) =>
      api.setNotificationSettings({ ...queryClient.getQueryData<NotificationSettings>(["notificationSettings"])!, ...updates } as NotificationSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationSettings"] });
    },
  });
}