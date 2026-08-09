import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { AlertTriangle, Clock, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDarkMode } from "@/hooks/useDarkMode";

export function LimitPopupPage() {
  useDarkMode();

  const appName = new URLSearchParams(window.location.search).get("app") ?? "Unknown";
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyRemaining, setEmergencyRemaining] = useState(0);
  const [configuredDuration, setConfiguredDuration] = useState(10);

  useEffect(() => {
    api.getEmergencyAccessRemaining(appName)
      .then(setEmergencyRemaining)
      .catch(() => setEmergencyRemaining(0));

    api.getFocusSettings()
      .then((s) => setConfiguredDuration(s.emergency_access_minutes ?? 10))
      .catch(() => setConfiguredDuration(10));
  }, [appName]);

  const handleQuitApp = async () => {
    setIsLoading(true);
    try {
      await api.quitBlockedApp(appName);
    } catch {
      // Best effort
    }
    try {
      await getCurrentWindow().close();
    } catch {
      // noop
    }
  };

  const handleEmergencyUse = async () => {
    setIsLoading(true);
    try {
      await api.grantEmergencyAccess(appName);
    } catch {
      // Best effort
    }
    try {
      await getCurrentWindow().close();
    } catch {
      // noop
    }
  };

  return (
    <div
      className="h-screen w-screen flex flex-col justify-between bg-background text-foreground p-6 select-none border border-border"
      data-tauri-drag-region
    >
      {/* Top Header / Status */}
      <div className="flex items-center justify-between border-b border-border pb-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-destructive animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Limit Enforcement
          </span>
        </div>
        <AlertTriangle className="w-4 h-4 text-destructive" />
      </div>

      {/* Main Content */}
      <div className="my-auto py-2 pointer-events-none">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Daily Allowance Exceeded
        </p>
        <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground mb-2">
          {appName}
        </h1>
        <p className="font-sans text-xs text-muted-foreground leading-relaxed">
          Access to this application is currently restricted in accordance with your daily digital wellbeing target.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          variant="destructive"
          size="lg"
          className="w-full rounded-none font-sans font-medium text-destructive-foreground tracking-wide text-xs uppercase cursor-pointer"
          onClick={handleQuitApp}
          disabled={isLoading}
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Quit Application
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-none font-sans font-medium border-border hover:bg-secondary text-foreground tracking-wide text-xs uppercase cursor-pointer"
          onClick={handleEmergencyUse}
          disabled={isLoading}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          {emergencyRemaining > 0 ? (
            <span>
              Emergency Access (<span className="font-mono">{Math.ceil(emergencyRemaining / 60)}m</span> left today)
            </span>
          ) : (
            <span>Emergency Access ({configuredDuration} Min)</span>
          )}
        </Button>
      </div>

      {/* Footer Info */}
      <p className="font-mono text-[10px] text-muted-foreground text-center pt-2 border-t border-border/60 pointer-events-none">
        Emergency access grants a single {configuredDuration}-minute pass per session.
      </p>
    </div>
  );
}


