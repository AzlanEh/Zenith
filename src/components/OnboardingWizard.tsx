import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CircleDot,
  Clock,
  Crosshair,
  Heart,
  Hourglass,
  Minus,
  Plus,
} from "lucide-react";
import { api } from "@/services/api";
import { logger } from "@/utils/logger";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState(4);
  const [screen, setScreen] = useState(2);
  const [mind, setMind] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const updateFocus = (change: number) =>
    setFocus((prev) => Math.max(0, Math.min(12, prev + change)));
  const updateScreen = (change: number) =>
    setScreen((prev) => Math.max(0, Math.min(24, prev + change)));
  const updateMind = (change: number) =>
    setMind((prev) => Math.max(0, Math.min(10, prev + change)));

  const finish = async () => {
    try {
      setIsSubmitting(true);
      await api.initOnboardingGoals(focus * 60, screen);
    } catch (e) {
      logger.error("Failed to initialize onboarding goals", e);
    } finally {
      localStorage.setItem("onboarding_completed", "true");
      onComplete();
    }
  };

  if (step === 0) {
    return (
      <div className="bg-background text-foreground min-h-screen flex flex-col relative w-full">
        <div className="grain-overlay" />
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-card/20 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
        </div>
        <main className="flex-1 flex flex-col justify-center items-center px-8 z-10 relative">
          <div className="max-w-4xl w-full text-center flex flex-col items-center">
            <div className="overflow-hidden mb-6 w-full flex justify-center">
              <h1 className="font-headline text-[clamp(4rem,10vw,10rem)] leading-none font-light tracking-tight text-foreground reveal-text">
                ZENITH
              </h1>
            </div>
            <div className="overflow-hidden mb-8 max-w-2xl">
              <p className="font-headline text-2xl md:text-3xl italic text-muted-foreground reveal-text delay-1">
                A Digital Sanctuary for Modern Minds.
              </p>
            </div>
            <div className="overflow-hidden mb-16 max-w-md">
              <p className="font-body text-sm md:text-base text-muted-foreground leading-relaxed reveal-text delay-2">
                Regain your cognitive sovereignty. Step away from the noise and
                enter a space designed entirely for profound focus and deep
                clarity.
              </p>
            </div>
            <div className="overflow-hidden">
              <button
                onClick={() => setStep(1)}
                className="reveal-text delay-3 group relative flex items-center justify-center bg-foreground text-background px-10 py-5 font-label text-xs uppercase tracking-[0.2em] hover:bg-muted hover:text-foreground transition-all duration-500 ease-out focus:outline-none focus:ring-1 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
              >
                <span className="relative z-10">Begin Practice</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </button>
            </div>
            <div className="mt-24 flex gap-3 reveal-text delay-3 opacity-50">
              <div className="w-12 h-[1px] bg-foreground" />
              <div className="w-2 h-[1px] bg-border" />
              <div className="w-2 h-[1px] bg-border" />
              <div className="w-2 h-[1px] bg-border" />
            </div>
          </div>
        </main>
        <footer className="fixed bottom-0 left-0 w-full px-12 py-6 flex justify-between items-end bg-transparent z-20 pointer-events-none">
          <div className="font-body text-[0.75rem] text-muted-foreground pointer-events-auto">
            &copy; 2024 Zenith. Designed for focus.
          </div>
          <div className="flex gap-6 pointer-events-auto">
            <a
              className="font-body text-[0.75rem] text-muted-foreground hover:text-foreground transition-colors"
              href="#"
            >
              Privacy
            </a>
            <a
              className="font-body text-[0.75rem] text-muted-foreground hover:text-foreground transition-colors"
              href="#"
            >
              Terms
            </a>
          </div>
        </footer>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="bg-background text-foreground min-h-screen flex flex-col font-body w-full relative">
        <header className="w-full flex justify-between items-center px-8 md:px-16 py-8">
          <div className="font-headline text-2xl font-light tracking-tighter text-foreground">
            ZENITH
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-widest text-muted-foreground">
              02
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm tracking-widest text-muted-foreground">
              03
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-12 w-full max-w-4xl mx-auto py-12 md:py-24">
          <div className="w-full text-center mb-20 md:mb-32 relative">
            <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10 w-full h-full" />
            <h1 className="font-headline text-5xl md:text-[5rem] tracking-tight font-light mb-6">
              Establish Boundaries
            </h1>
            <p className="font-body text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Define the parameters of your digital sanctuary. Precision yields
              sovereignty.
            </p>
          </div>
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
            <div className="bg-card p-8 flex flex-col justify-between min-h-[300px] border border-transparent hover:border-border/30 transition-colors duration-500">
              <div className="mb-12">
                <div className="flex justify-between items-start mb-4">
                  <Crosshair className="text-muted-foreground" />
                </div>
                <h2 className="font-label text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Daily Focus Goal
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  Continuous deep work
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="font-mono text-6xl font-light tabular-nums tracking-tighter mb-6 transition-transform">
                  {focus}
                  <span className="text-2xl text-muted-foreground ml-1 tracking-normal">
                    h
                  </span>
                </div>
                <div className="flex items-center gap-6 w-full justify-between px-4">
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateFocus(-1)}
                  >
                    <Minus />
                  </button>
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateFocus(1)}
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 flex flex-col justify-between min-h-[300px] border border-transparent hover:border-border/30 transition-colors duration-500 relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="mb-12 relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <Hourglass className="text-muted-foreground" />
                </div>
                <h2 className="font-label text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Screen Time Limit
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  Maximum permitted usage
                </p>
              </div>
              <div className="flex flex-col items-center relative z-10">
                <div className="font-mono text-6xl font-light tabular-nums tracking-tighter mb-6">
                  {screen}
                  <span className="text-2xl text-muted-foreground ml-1 tracking-normal">
                    h
                  </span>
                </div>
                <div className="flex items-center gap-6 w-full justify-between px-4">
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateScreen(-1)}
                  >
                    <Minus />
                  </button>
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateScreen(1)}
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 flex flex-col justify-between min-h-[300px] border border-transparent hover:border-border/30 transition-colors duration-500">
              <div className="mb-12">
                <div className="flex justify-between items-start mb-4">
                  <Heart className="text-muted-foreground" />
                </div>
                <h2 className="font-label text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Mindfulness Sessions
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  Required disengagements
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="font-mono text-6xl font-light tabular-nums tracking-tighter mb-6">
                  {mind}
                  <span className="text-2xl text-muted-foreground ml-1 tracking-normal">
                    x
                  </span>
                </div>
                <div className="flex items-center gap-6 w-full justify-between px-4">
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateMind(-1)}
                  >
                    <Minus />
                  </button>
                  <button
                    className="w-12 h-12 bg-muted hover:bg-accent flex items-center justify-center text-foreground transition-colors focus:outline-none"
                    onClick={() => updateMind(1)}
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-24 md:mt-32 w-full flex justify-center">
            <button
              onClick={() => setStep(2)}
              className="bg-foreground text-background font-label text-sm uppercase tracking-[0.2em] py-6 px-16 hover:bg-accent hover:text-foreground transition-all duration-300 focus:outline-none border border-transparent hover:border-foreground flex items-center gap-4 group"
            >
              Set Intentions
              <ArrowRight className="transform group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-card text-foreground min-h-screen flex flex-col font-body antialiased overflow-hidden relative w-full">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pulse-aura" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-muted/20 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 w-full max-w-7xl mx-auto h-screen">
        <div className="absolute top-12 w-full max-w-md flex justify-center space-x-4 px-8 z-20">
          <div className="h-[2px] flex-1 bg-muted relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-foreground w-full transition-all duration-1000 ease-out" />
          </div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground absolute -bottom-6 left-1/2 -translate-x-1/2">
            Phase 03 // Ignition
          </span>
        </div>

        <div className="w-full max-w-2xl text-center space-y-16 animate-fade-in-up">
          <div className="space-y-6">
            <h1 className="font-display text-5xl md:text-7xl lg:text-[6rem] font-light tracking-tight text-foreground leading-none opacity-90 transition-opacity duration-1000 hover:opacity-100">
              The Sanctuary is Ready
            </h1>
            <p className="font-body text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed font-light">
              Your parameters are set. The environment has been calibrated to
              your precise specifications for deep focus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-muted border border-border p-1">
            <div className="bg-card p-8 flex flex-col items-center justify-center space-y-4 hover:bg-muted transition-colors duration-500 group">
              <Clock className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-center">
                <div className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-1">
                  Duration
                </div>
                <div className="font-headline text-2xl text-foreground">
                  {focus * 60}{" "}
                  <span className="text-sm font-body text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 flex flex-col items-center justify-center space-y-4 hover:bg-muted transition-colors duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-card/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <CircleDot className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors relative z-10" />
              <div className="text-center relative z-10">
                <div className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-1">
                  Mode
                </div>
                <div className="font-headline text-2xl text-foreground">
                  Deep Work
                </div>
              </div>
            </div>

            <div className="bg-card p-8 flex flex-col items-center justify-center space-y-4 hover:bg-muted transition-colors duration-500 group">
              <BarChart3 className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-center">
                <div className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-1">
                  Acoustics
                </div>
                <div className="font-headline text-2xl text-foreground">
                  Brown Noise
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={finish}
              disabled={isSubmitting}
              className="group relative inline-flex items-center justify-center px-12 py-5 bg-foreground text-background font-label text-sm uppercase tracking-[0.2em] font-medium overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <div className="absolute inset-0 bg-background w-0 group-hover:w-full transition-all duration-500 ease-out z-0" />
              <span className="relative z-10 group-hover:text-foreground transition-colors duration-500 flex items-center space-x-3">
                <span>{isSubmitting ? "Entering..." : "Enter Sanctuary"}</span>
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
