import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNav, useRovingTabIndex, useAnnounce } from "./useKeyboardNav";
import { RefObject } from "react";

// Helper to create mock refs
const createMockRef = (focus = vi.fn()): RefObject<HTMLElement | null> => ({
  current: { focus } as any,
});

describe("useKeyboardNav", () => {
  beforeEach(() => {
    // Clear any existing attributes
    document.body.removeAttribute("data-keyboard-nav");
  });

  afterEach(() => {
    document.body.removeAttribute("data-keyboard-nav");
  });

  it("starts with keyboard navigation disabled", () => {
    const { result } = renderHook(() => useKeyboardNav());
    expect(result.current).toBe(false);
  });

  it("enables keyboard navigation on Tab key", () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    });

    expect(result.current).toBe(true);
    expect(document.body.getAttribute("data-keyboard-nav")).toBe("true");
  });

  it("enables keyboard navigation on arrow keys", () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    });

    expect(result.current).toBe(true);
    expect(document.body.getAttribute("data-keyboard-nav")).toBe("true");
  });

  it("enables keyboard navigation on Enter key", () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(result.current).toBe(true);
    expect(document.body.getAttribute("data-keyboard-nav")).toBe("true");
  });

  it("enables keyboard navigation on Space key", () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    });

    expect(result.current).toBe(true);
    expect(document.body.getAttribute("data-keyboard-nav")).toBe("true");
  });

  it("disables keyboard navigation on mouse down", () => {
    const { result } = renderHook(() => useKeyboardNav());

    // Enable keyboard nav first
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    });
    expect(result.current).toBe(true);

    // Then disable with mouse
    act(() => {
      window.dispatchEvent(new MouseEvent("mousedown"));
    });

    expect(result.current).toBe(false);
    expect(document.body.hasAttribute("data-keyboard-nav")).toBe(false);
  });

  it("ignores other keys", () => {
    const { result } = renderHook(() => useKeyboardNav());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    });

    expect(result.current).toBe(false);
    expect(document.body.hasAttribute("data-keyboard-nav")).toBe(false);
  });

  it("cleans up event listeners on unmount", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useKeyboardNav());

    expect(addEventListenerSpy).toHaveBeenCalledTimes(2); // keydown and mousedown

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});

describe("useRovingTabIndex", () => {
  it("starts with activeIndex 0", () => {
    const items = [createMockRef(), createMockRef(), createMockRef()];
    const { result } = renderHook(() => useRovingTabIndex(items));

    expect(result.current.activeIndex).toBe(0);
  });

  it("returns correct tabIndex for active item", () => {
    const items = [createMockRef(), createMockRef(), createMockRef()];
    const { result } = renderHook(() => useRovingTabIndex(items));

    expect(result.current.getTabIndex(0)).toBe(0);
    expect(result.current.getTabIndex(1)).toBe(-1);
    expect(result.current.getTabIndex(2)).toBe(-1);
  });

  it("moves to next item with ArrowRight in horizontal orientation", () => {
    const focus1 = vi.fn();
    const focus2 = vi.fn();
    const items = [createMockRef(focus1), createMockRef(focus2), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { orientation: "horizontal" })
    );

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowRight", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(result.current.activeIndex).toBe(1);
    expect(focus2).toHaveBeenCalled();
  });

  it("moves to previous item with ArrowLeft in horizontal orientation", () => {
    const focus0 = vi.fn();
    const focus1 = vi.fn();
    const items = [createMockRef(focus0), createMockRef(focus1), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { orientation: "horizontal" })
    );

    // Start at index 1
    act(() => {
      result.current.setActiveIndex(1);
    });

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowLeft", preventDefault: vi.fn() } as any,
        1
      );
    });

    expect(result.current.activeIndex).toBe(0);
    expect(focus0).toHaveBeenCalled();
  });

  it("moves to next item with ArrowDown in vertical orientation", () => {
    const focus1 = vi.fn();
    const items = [createMockRef(), createMockRef(focus1), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { orientation: "vertical" })
    );

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowDown", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(result.current.activeIndex).toBe(1);
    expect(focus1).toHaveBeenCalled();
  });

  it("moves to previous item with ArrowUp in vertical orientation", () => {
    const focus0 = vi.fn();
    const items = [createMockRef(focus0), createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { orientation: "vertical" })
    );

    // Start at index 1
    act(() => {
      result.current.setActiveIndex(1);
    });

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowUp", preventDefault: vi.fn() } as any,
        1
      );
    });

    expect(result.current.activeIndex).toBe(0);
    expect(focus0).toHaveBeenCalled();
  });

  it("wraps to first item when reaching end with wrap=true", () => {
    const focus0 = vi.fn();
    const items = [createMockRef(focus0), createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { wrap: true })
    );

    // Start at last item
    act(() => {
      result.current.setActiveIndex(2);
    });

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowRight", preventDefault: vi.fn() } as any,
        2
      );
    });

    expect(result.current.activeIndex).toBe(0);
    expect(focus0).toHaveBeenCalled();
  });

  it("stops at last item when reaching end with wrap=false", () => {
    const items = [createMockRef(), createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { wrap: false })
    );

    // Start at last item
    act(() => {
      result.current.setActiveIndex(2);
    });

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowRight", preventDefault: vi.fn() } as any,
        2
      );
    });

    expect(result.current.activeIndex).toBe(2);
    // focus should not be called since we don't move
  });

  it("moves to first item with Home key", () => {
    const focus0 = vi.fn();
    const items = [createMockRef(focus0), createMockRef(), createMockRef()];
    const { result } = renderHook(() => useRovingTabIndex(items));

    // Start at middle
    act(() => {
      result.current.setActiveIndex(1);
    });

    act(() => {
      result.current.handleKeyDown(
        { key: "Home", preventDefault: vi.fn() } as any,
        1
      );
    });

    expect(result.current.activeIndex).toBe(0);
    expect(focus0).toHaveBeenCalled();
  });

  it("moves to last item with End key", () => {
    const focus2 = vi.fn();
    const items = [createMockRef(), createMockRef(), createMockRef(focus2)];
    const { result } = renderHook(() => useRovingTabIndex(items));

    act(() => {
      result.current.handleKeyDown(
        { key: "End", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(result.current.activeIndex).toBe(2);
    expect(focus2).toHaveBeenCalled();
  });

  it("calls onSelect when Enter is pressed", () => {
    const onSelect = vi.fn();
    const items = [createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { onSelect })
    );

    act(() => {
      result.current.handleKeyDown(
        { key: "Enter", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("calls onSelect when Space is pressed", () => {
    const onSelect = vi.fn();
    const items = [createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { onSelect })
    );

    act(() => {
      result.current.handleKeyDown(
        { key: " ", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("ignores arrow keys in wrong orientation", () => {
    const items = [createMockRef(), createMockRef()];
    const { result } = renderHook(() =>
      useRovingTabIndex(items, { orientation: "horizontal" })
    );

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowUp", preventDefault: vi.fn() } as any,
        0
      );
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it("prevents default on handled keys", () => {
    const preventDefault = vi.fn();
    const items = [createMockRef()];
    const { result } = renderHook(() => useRovingTabIndex(items));

    act(() => {
      result.current.handleKeyDown(
        { key: "ArrowRight", preventDefault } as any,
        0
      );
    });

    expect(preventDefault).toHaveBeenCalled();
  });
});

describe("useAnnounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("announces message with polite priority by default", () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current("Test message");
    });

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeInTheDocument();
    expect(announcement?.getAttribute("aria-live")).toBe("polite");
    expect(announcement?.textContent).toBe("Test message");
  });

  it("announces message with assertive priority", () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current("Test message", "assertive");
    });

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.getAttribute("aria-live")).toBe("assertive");
  });

  it("adds sr-only class for screen reader only content", () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current("Test message");
    });

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.classList.contains("sr-only")).toBe(true);
  });

  it("removes announcement after timeout", () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current("Test message");
    });

    expect(document.querySelector('[role="status"]')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(document.querySelector('[role="status"]')).not.toBeInTheDocument();
  });

  it("sets aria-atomic to true", () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current("Test message");
    });

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.getAttribute("aria-atomic")).toBe("true");
  });
});