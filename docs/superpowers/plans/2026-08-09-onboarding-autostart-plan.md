# Start at Login Option in Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Start at Login" toggle option on Step 2 (Phase 03 // Ignition) of `OnboardingWizard` so users can easily enable system autostart with clear guidance on why it is required for Zenith.

**Architecture:** Initialize `autostartEnabled` state in `OnboardingWizard` via `api.getAutostartStatus()`, render a brutalist toggle card in Phase 03, and invoke `api.enableAutostart()` or `api.disableAutostart()` in `finish()` before completing onboarding.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Lucide React icons (`Power`), Vitest + React Testing Library.

## Global Constraints

- Brutalist design system (`rounded-none`, `bg-card`, `border border-border`, font families: `font-headline`, `font-mono`, `font-label`, `font-body`).
- No direct Tauri calls in components — use `api` wrappers from `src/services/api.ts`.
- Non-blocking error handling — autostart failures log to `logger.error` and show a toast error without preventing onboarding completion.

---

### Task 1: Add Start at Login UI & Autostart Integration in OnboardingWizard

**Files:**
- Modify: `src/components/OnboardingWizard.tsx`
- Create: `src/components/OnboardingWizard.test.tsx`

**Interfaces:**
- Consumes: `api.getAutostartStatus()`, `api.enableAutostart()`, `api.disableAutostart()` from `@/services/api`.
- Produces: Updated `OnboardingWizard` component with autostart switch and test suite.

- [ ] **Step 1: Write the failing unit tests for OnboardingWizard**

Create `src/components/OnboardingWizard.test.tsx` testing Step 0 navigation, Step 1 goals, Phase 03 autostart card rendering, and autostart toggle behavior on finish.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "./OnboardingWizard";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    initOnboardingGoals: vi.fn().mockResolvedValue(undefined),
    getAutostartStatus: vi.fn().mockResolvedValue({
      enabled: false,
      systemd_installed: true,
      systemd_running: true,
      xdg_installed: true,
    }),
    enableAutostart: vi.fn().mockResolvedValue("Enabled autostart"),
    disableAutostart: vi.fn().mockResolvedValue("Disabled autostart"),
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("OnboardingWizard", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders Step 0 and navigates to Step 1", () => {
    render(<OnboardingWizard onComplete={onComplete} />);
    expect(screen.getByText("ZENITH")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Begin Practice"));
    expect(screen.getByText("Establish Boundaries")).toBeInTheDocument();
  });

  it("renders Start at Login card in Phase 03 and enables autostart on finish", async () => {
    render(<OnboardingWizard onComplete={onComplete} />);
    
    // Step 0 -> Step 1
    fireEvent.click(screen.getByText("Begin Practice"));
    // Step 1 -> Step 2
    fireEvent.click(screen.getByText("Set Intentions"));

    expect(screen.getByText("Start at Login")).toBeInTheDocument();
    expect(screen.getByText("RECOMMENDED")).toBeInTheDocument();

    const enterBtn = screen.getByRole("button", { name: /Enter Sanctuary/i });
    fireEvent.click(enterBtn);

    await waitFor(() => {
      expect(api.initOnboardingGoals).toHaveBeenCalledWith(240, 2);
      expect(api.enableAutostart).toHaveBeenCalled();
      expect(localStorage.getItem("onboarding_completed")).toBe("true");
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("disables autostart when toggle is switched off in Phase 03", async () => {
    render(<OnboardingWizard onComplete={onComplete} />);
    
    fireEvent.click(screen.getByText("Begin Practice"));
    fireEvent.click(screen.getByText("Set Intentions"));

    const toggle = screen.getByRole("button", { name: /toggle start at login/i });
    fireEvent.click(toggle); // Toggle off

    const enterBtn = screen.getByRole("button", { name: /Enter Sanctuary/i });
    fireEvent.click(enterBtn);

    await waitFor(() => {
      expect(api.disableAutostart).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/OnboardingWizard.test.tsx`
Expected: FAIL (Cannot find "Start at Login", "toggle start at login", etc.)

- [ ] **Step 3: Implement Start at Login state & card in OnboardingWizard.tsx**

Update `src/components/OnboardingWizard.tsx`:
1. Import `Power` from `"lucide-react"`.
2. Add state `const [autostartEnabled, setAutostartEnabled] = useState(true);`.
3. Fetch autostart status in `useEffect`:
```tsx
useEffect(() => {
  api.getAutostartStatus()
    .then((status) => {
      if (status && typeof status.enabled === "boolean") {
        setAutostartEnabled(status.enabled);
      }
    })
    .catch((e) => {
      logger.error("Failed to fetch autostart status in onboarding", e);
    });
}, []);
```
4. Update `finish` function:
```tsx
const finish = async () => {
  try {
    setIsSubmitting(true);
    await api.initOnboardingGoals(focus * 60, screen);
    if (autostartEnabled) {
      await api.enableAutostart();
    } else {
      await api.disableAutostart();
    }
  } catch (e) {
    logger.error("Failed during onboarding finish", e);
  } finally {
    localStorage.setItem("onboarding_completed", "true");
    onComplete();
  }
};
```
5. In Step 2 JSX, place the "Start at Login" option card above the 3-metrics grid:
```tsx
<div className="bg-card border border-border p-6 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
  <div className="flex items-start gap-4">
    <div className="p-3 bg-muted border border-border text-foreground">
      <Power className="w-5 h-5" />
    </div>
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-headline text-lg font-medium text-foreground">
          Start at Login
        </span>
        <span className="font-mono text-[0.65rem] px-2 py-0.5 bg-foreground text-background font-bold tracking-widest uppercase">
          RECOMMENDED
        </span>
      </div>
      <p className="font-body text-xs md:text-sm text-muted-foreground leading-relaxed">
        Launch Zenith automatically on boot to ensure continuous telemetry and screen time enforcement.
      </p>
    </div>
  </div>
  <button
    type="button"
    aria-label="toggle start at login"
    aria-pressed={autostartEnabled}
    onClick={() => setAutostartEnabled(!autostartEnabled)}
    className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors border cursor-pointer ${
      autostartEnabled
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-muted text-muted-foreground"
    }`}
  >
    {autostartEnabled ? "ON" : "OFF"}
  </button>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/OnboardingWizard.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite & typecheck**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/OnboardingWizard.tsx src/components/OnboardingWizard.test.tsx
git commit -m "feat: add Start at Login option to onboarding wizard"
```
