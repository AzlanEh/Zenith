import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { listen } from "@tauri-apps/api/event";

export function useBlockedAppCheck() {
  const [blockedApp, setBlockedApp] = useState<string | null>(null);
  const [emergencyRemaining, setEmergencyRemaining] = useState(0);
  const [showLimitReached, setShowLimitReached] = useState(false);

  const showApp = useCallback(async (app: string) => {
    setBlockedApp(app);
    try {
      const remaining = await api.getEmergencyAccessRemaining(app);
      setEmergencyRemaining(remaining);
    } catch {
      setEmergencyRemaining(0);
    }
    setShowLimitReached(true);
  }, []);

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
        } else {
          setShowLimitReached(false);
          setBlockedApp(null);
        }
      } catch {
        // silent
      }
    };

    // Also listen for immediate event from backend
    const unlisten = listen<{ app: string }>("blocked-app-detected", (event) => {
      if (mounted) {
        showApp(event.payload.app);
      }
    });

    poll();
    const id = setInterval(poll, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
      unlisten.then((fn) => fn());
    };
  }, [showApp]);

  return { blockedApp, emergencyRemaining, showLimitReached, dismiss };
}
