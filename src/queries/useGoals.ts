import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Goal, GoalProgress, GoalsStats, Achievement } from "../types";

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api.getGoals(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useGoalsProgress() {
  return useQuery<GoalProgress[]>({
    queryKey: ["goalsProgress"],
    queryFn: () => api.getGoalsProgress(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useGoalsStats() {
  return useQuery<GoalsStats>({
    queryKey: ["goalsStats"],
    queryFn: () => api.getGoalsStats(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: ["achievements"],
    queryFn: () => api.getAchievements(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
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

export function useRemoveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.removeGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goalsProgress"] });
      queryClient.invalidateQueries({ queryKey: ["goalsStats"] });
    },
  });
}
