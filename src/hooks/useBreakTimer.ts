import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { logger } from "@/utils/logger";
import type { BreakStatus } from "@/types";

interface BreakTimerState {
  is_on_break: boolean;
  minutes_worked: number;
  seconds_remaining: number;
  total_seconds: number;
  loading: boolean;
  endBreak: () => void;
}

export function useBreakTimer(): BreakTimerState {
  const [status, setStatus] = useState<BreakStatus | null>(null);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [localSeconds, setLocalSeconds] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const prevBreakRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const [s, cfg] = await Promise.all([
          api.getBreakStatus(),
          api.getBreakSettings(),
        ]);
        if (!mounted) return;
        setStatus(s);
        setBreakMinutes(cfg.break_minutes);
        setLoading(false);

        if (s.is_on_break && !prevBreakRef.current) {
          setIsOnBreak(true);
          setLocalSeconds(cfg.break_minutes * 60);
        } else if (!s.is_on_break && prevBreakRef.current) {
          setIsOnBreak(false);
          setLocalSeconds(0);
        }
        prevBreakRef.current = s.is_on_break;
      } catch {
        if (mounted) setLoading(false);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!isOnBreak) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setLocalSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnBreak]);

  const endBreak = async () => {
    try {
      await api.endBreak();
      setIsOnBreak(false);
      setLocalSeconds(0);
    } catch (err) {
      logger.error("Failed to end break:", err);
    }
  };

  return {
    is_on_break: isOnBreak,
    minutes_worked: status?.minutes_worked ?? 0,
    seconds_remaining: localSeconds,
    total_seconds: breakMinutes * 60,
    loading,
    endBreak,
  };
}
