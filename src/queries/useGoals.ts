import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Goal, GoalProgress, GoalsStats, Achievement } from "../types";

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api.getGoals(),
  });
}

export function useGoalsProgress() {
  return useQuery<GoalProgress[]>({
    queryKey: ["goalsProgress"],
    queryFn: () => api.getGoalsProgress(),
  });
}

export function useGoalsStats() {
  return useQuery<GoalsStats>({
    queryKey: ["goalsStats"],
    queryFn: () => api.getGoalsStats(),
  });
}

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: ["achievements"],
    queryFn: () => api.getAchievements(),
  });
}

export function useAddGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Goal) => api.addGoal(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goalsProgress"] });
      queryClient.invalidateQueries({ queryKey: ["goalsStats"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Goal) => api.updateGoal(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goalsProgress"] });
      queryClient.invalidateQueries({ queryKey: ["goalsStats"] });
    },
  });
}
