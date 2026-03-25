import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";
import { useAppStore } from "../store/useAppStore";

vi.mock("../store/useAppStore", () => ({
  useAppStore: vi.fn(),
}));

const mockUseAppStore = vi.mocked(useAppStore);

function setupMock(theme: any, loadTheme: any) {
  mockUseAppStore.mockImplementation((selector: any) => {
    const state = { theme, loadTheme };
    return selector ? selector(state) : state;
  });
}

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads theme on mount", () => {
    const mockLoadTheme = vi.fn();
    const mockTheme = {
      colors: {
        primary: "red",
        secondary: "blue",
        background: "white",
        surface: "gray",
        text: "black",
        textSecondary: "gray",
        accent: "purple",
        warning: "yellow",
        danger: "red",
      },
      fonts: {
        family: "Arial",
      },
    };

    setupMock(mockTheme, mockLoadTheme);
    renderHook(() => useTheme());

    expect(mockLoadTheme).toHaveBeenCalledTimes(1);
  });

  it("returns the theme from store", () => {
    const mockTheme = {
      colors: {
        primary: "red",
        secondary: "blue",
        background: "white",
        surface: "gray",
        text: "black",
        textSecondary: "gray",
        accent: "purple",
        warning: "yellow",
        danger: "red",
      },
      fonts: {
        family: "Arial",
      },
    };

    setupMock(mockTheme, vi.fn());
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe(mockTheme);
  });

  it("applies CSS custom properties when theme changes", () => {
    const mockTheme = {
      colors: {
        primary: "red",
        secondary: "blue",
        background: "white",
        surface: "gray",
        text: "black",
        textSecondary: "gray",
        accent: "purple",
        warning: "yellow",
        danger: "red",
      },
      fonts: {
        family: "Arial",
      },
    };

    let currentTheme: any = null;
    const mockLoadTheme = vi.fn();

    mockUseAppStore.mockImplementation((selector: any) => {
      const state = { theme: currentTheme, loadTheme: mockLoadTheme };
      return selector ? selector(state) : state;
    });

    const { rerender } = renderHook(() => useTheme());

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("");

    currentTheme = mockTheme;
    rerender();

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("red");
    expect(document.documentElement.style.getPropertyValue("--color-secondary")).toBe("blue");
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("white");
    expect(document.documentElement.style.getPropertyValue("--color-surface")).toBe("gray");
    expect(document.documentElement.style.getPropertyValue("--color-text")).toBe("black");
    expect(document.documentElement.style.getPropertyValue("--color-text-secondary")).toBe("gray");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("purple");
    expect(document.documentElement.style.getPropertyValue("--color-warning")).toBe("yellow");
    expect(document.documentElement.style.getPropertyValue("--color-danger")).toBe("red");
    expect(document.documentElement.style.getPropertyValue("--font-family")).toBe("Arial");
  });

  it("handles null theme gracefully", () => {
    setupMock(null, vi.fn());
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBeNull();
  });

  it("clears CSS properties when theme becomes null", () => {
    const mockTheme = {
      colors: {
        primary: "red",
        secondary: "blue",
        background: "white",
        surface: "gray",
        text: "black",
        textSecondary: "gray",
        accent: "purple",
        warning: "yellow",
        danger: "red",
      },
      fonts: {
        family: "Arial",
      },
    };

    let currentTheme: any = mockTheme;
    const mockLoadTheme = vi.fn();

    mockUseAppStore.mockImplementation((selector: any) => {
      const state = { theme: currentTheme, loadTheme: mockLoadTheme };
      return selector ? selector(state) : state;
    });

    const { rerender } = renderHook(() => useTheme());

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("red");

    currentTheme = null;
    rerender();

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("");
  });
});
