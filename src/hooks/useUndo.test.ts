import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndo } from "./useUndo";
import { toast } from "sonner";

// Mock toast
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockToast = vi.mocked(toast);

describe("useUndo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("executes action immediately", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
      });
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
  });

  it("shows toast with undo option", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
      });
    });

    expect(toast).toHaveBeenCalledWith("Test action", expect.objectContaining({
      duration: 5000,
      action: expect.objectContaining({
        label: "Undo",
        onClick: expect.any(Function),
      }),
    }));
  });

  it("executes undo when undo button is clicked", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
      });
    });

    expect(mockToast).toHaveBeenCalledWith("Test action", expect.objectContaining({
      duration: 5000,
      action: expect.objectContaining({
        label: "Undo",
        onClick: expect.any(Function),
      }),
    }));

    // Get the undo function from the toast call
    const call = mockToast.mock.calls[0];
    const options = call[1] as any;
    const undoAction = options.action.onClick;

    await act(async () => {
      await undoAction();
    });

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("handles undo failure gracefully", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockRejectedValue(new Error("Undo failed"));

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
      });
    });

    const call = mockToast.mock.calls[0];
    const options = call[1] as any;
    const undoAction = options.action.onClick;

    await act(async () => {
      await undoAction();
    });

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete after timeout", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
        onComplete,
      });
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancels pending action when same id is used", async () => {
    const execute1 = vi.fn().mockResolvedValue(undefined);
    const execute2 = vi.fn().mockResolvedValue(undefined);
    const undo1 = vi.fn().mockResolvedValue(undefined);
    const undo2 = vi.fn().mockResolvedValue(undefined);
    const onComplete1 = vi.fn();
    const onComplete2 = vi.fn();

    const { result } = renderHook(() => useUndo());

    // Execute first action
    await act(async () => {
      await result.current.executeWithUndo({
        id: "same-id",
        execute: execute1,
        undo: undo1,
        description: "First action",
        onComplete: onComplete1,
      });
    });

    // Execute second action with same id
    await act(async () => {
      await result.current.executeWithUndo({
        id: "same-id",
        execute: execute2,
        undo: undo2,
        description: "Second action",
        onComplete: onComplete2,
      });
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // First onComplete should not be called (cancelled)
    expect(onComplete1).not.toHaveBeenCalled();
    // Second onComplete should be called
    expect(onComplete2).toHaveBeenCalledTimes(1);
  });

  it("cancels pending action when cancelPending is called", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
        onComplete,
      });
    });

    act(() => {
      result.current.cancelPending("test-action");
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("handles execute failure gracefully", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("Execute failed"));
    const undo = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo({
        id: "test-action",
        execute,
        undo,
        description: "Test action",
      });
    });

    // Should show error toast instead of throwing
    expect(toast.error).toHaveBeenCalledWith("Action failed", {
      description: "Error: Execute failed",
    });
    // Undo toast should NOT be shown since execute failed
    expect(toast).not.toHaveBeenCalled();
  });
});