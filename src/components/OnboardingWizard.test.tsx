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
