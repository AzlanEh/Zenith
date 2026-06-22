import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { AlertTriangle, Clock, X } from "lucide-react";
import { toast } from "sonner";

interface LimitReachedProps {
  appName: string;
  emergencyRemaining: number;
  onDismiss: () => void;
}

export function LimitReached({ appName, emergencyRemaining, onDismiss }: LimitReachedProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuitApp = async () => {
    setIsLoading(true);
    try {
      await api.quitBlockedApp(appName);
      onDismiss();
      toast.success(`${appName} closed`);
    } catch {
      toast.error("Failed to quit app. Try closing it manually.");
    }
    setIsLoading(false);
  };

  const handleEmergencyUse = async () => {
    setIsLoading(true);
    try {
      await api.grantEmergencyAccess(appName);
      onDismiss();
      toast.success(`Emergency access granted (${emergencyRemaining} min remaining today)`);
    } catch {
      toast.error("Failed to grant emergency access.");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-foreground mb-2">App Limit Reached</h1>
        <p className="text-muted-foreground mb-2">You've reached your daily limit for</p>
        <p className="text-lg font-medium text-foreground mb-6">{appName}</p>

        <div className="space-y-3">
          <Button variant="destructive" size="lg" className="w-full" onClick={handleQuitApp} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Quit App
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={handleEmergencyUse} disabled={isLoading}>
            <Clock className="w-4 h-4 mr-2" />
            {emergencyRemaining > 0 ? `Use for 10 min (${emergencyRemaining} left today)` : "Use for 10 min (Emergency)"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Emergency use grants temporary access. The limit will be enforced again after 10 minutes.
        </p>
      </div>
    </div>
  );
}
