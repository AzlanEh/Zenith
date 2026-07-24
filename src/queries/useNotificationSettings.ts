import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { NotificationSettings } from "../types";

export function useNotificationSettings() {
  return useQuery<NotificationSettings>({
    queryKey: ["notificationSettings"],
    queryFn: () => api.getNotificationSettings(),
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<NotificationSettings>) => {
      const current = queryClient.getQueryData<NotificationSettings>(["notificationSettings"]);
      if (!current) return Promise.reject(new Error("Notification settings not loaded yet"));
      return api.setNotificationSettings({ ...current, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationSettings"] });
    },
  });
}