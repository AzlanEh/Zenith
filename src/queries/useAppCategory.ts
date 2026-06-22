import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useSetAppCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appName, category }: { appName: string; category: string }) =>
      api.setAppCategory(appName, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyStats"] });
      queryClient.invalidateQueries({ queryKey: ["categoryUsage"] });
    },
  });
}