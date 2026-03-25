import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useUpdater } from "./useUpdater";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

describe("useUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useUpdater());
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("sets state to available when update exists", async () => {
    const info = {
      version: "0.1.6",
      body: "Bug fixes",
      date: "2026-03-25",
    };
    mockInvoke.mockResolvedValueOnce(info);

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      const returned = await result.current.checkForUpdate(false);
      expect(returned).toEqual(info);
    });

    expect(result.current.state).toEqual({ status: "available", info });
    expect(mockInvoke).toHaveBeenCalledWith("check_for_update");
  });

  it("sets state to up-to-date when no update exists", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      const returned = await result.current.checkForUpdate(false);
      expect(returned).toBeNull();
    });

    expect(result.current.state).toEqual({ status: "up-to-date" });
  });

  it("maps package-manager install permission error to structured updater error", async () => {
    mockInvoke.mockRejectedValueOnce(
      new Error(
        'Permission denied (os error 13) at path "/usr/bin/tauri_current_app7Kl7YO"',
      ),
    );

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      const returned = await result.current.checkForUpdate(false);
      expect(returned).toBeNull();
    });

    expect(result.current.state).toEqual({
      status: "error",
      code: "system-managed-install",
      message:
        "This installation is managed by your system package manager and cannot self-update. Please update Wellbeing using your distro's package manager, or install the AppImage build for in-app updates.",
    });
  });

  it("uses unknown code for generic updater failures", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("network timeout"));

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.checkForUpdate(false);
    });

    expect(result.current.state).toEqual({
      status: "error",
      code: "unknown",
      message: "network timeout",
    });
  });

  it("keeps state idle for silent check errors", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("server unavailable"));

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.checkForUpdate(true);
    });

    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("maps install_update permission failure to structured updater error", async () => {
    const progressUnlisten = vi.fn();
    const installUnlisten = vi.fn();

    mockListen.mockResolvedValueOnce(progressUnlisten).mockResolvedValueOnce(installUnlisten);
    mockInvoke.mockRejectedValueOnce(
      new Error(
        'Permission denied (os error 13) at path "/usr/bin/tauri_current_app7Kl7YO"',
      ),
    );

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.installUpdate();
    });

    expect(result.current.state).toEqual({
      status: "error",
      code: "system-managed-install",
      message:
        "This installation is managed by your system package manager and cannot self-update. Please update Wellbeing using your distro's package manager, or install the AppImage build for in-app updates.",
    });
    expect(progressUnlisten).toHaveBeenCalledTimes(1);
    expect(installUnlisten).toHaveBeenCalledTimes(1);
  });
});
