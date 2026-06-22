import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";

export function useBlockedAppCheck() {
  const [blockedApp, setBlockedApp] = useState<string | null>(null);
  const [emergencyRemaining, setEmergencyRemaining] = useState(0);
  const [showLimitReached, setShowLimitReached] = useState(false);

  const dismiss = useCallback(() => {
    setShowLimitReached(false);
    setBlockedApp(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const apps = await api.getBlockedApps();
        if (!mounted) return;
        if (apps.length > 0) {
          const app = apps[0];
          setBlockedApp(app);
          const remaining = await api.getEmergencyAccessRemaining(app);
          if (mounted) {
            setEmergencyRemaining(remaining);
            setShowLimitReached(true);
          }
        } else if (showLimitReached) {
          setShowLimitReached(false);
          setBlockedApp(null);
        }
      } catch {
        // silent
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [showLimitReached]);

  return { blockedApp, emergencyRemaining, showLimitReached, dismiss };
}
