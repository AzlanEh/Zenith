import { useState, useCallback } from "react";

type SessionRecord = {
  date: string;
  duration_minutes: number;
  completed: boolean;
  scheduled: boolean;
  timestamp: number;
};

export function useFocusHistory() {
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("focus_history") || "[]");
    } catch {
      return [];
    }
  });

  const addSession = useCallback((record: Omit<SessionRecord, "timestamp">) => {
    const entry = { ...record, timestamp: Date.now() };
    setSessions((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      localStorage.setItem("focus_history", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
    localStorage.removeItem("focus_history");
  }, []);

  return { sessions, addSession, clearHistory };
}
