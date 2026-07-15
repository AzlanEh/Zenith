import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Theme } from "../types";

export function useTheme() {
  return useQuery<Theme>({
    queryKey: ["theme"],
    queryFn: () => api.getTheme(),
  });
}