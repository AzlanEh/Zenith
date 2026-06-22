import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { CategoryUsage } from "../types";

export function useCategoryUsage() {
  return useQuery<CategoryUsage[]>({
    queryKey: ["categoryUsage"],
    queryFn: () => api.getCategoryUsage(),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}