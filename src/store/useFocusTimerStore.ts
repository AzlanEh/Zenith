import { create } from "zustand";

type FocusState = "idle" | "running" | "paused" | "completed" | "cancelled";

interface FocusTimerState {
  state: FocusState;
  timeLeft: number;
  totalTime: number;
  setState: (state: FocusState) => void;
  setTimeLeft: (time: number) => void;
  setTotalTime: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const defaultFocusTime = 25 * 60;

let intervalId: ReturnType<typeof setInterval> | null = null;

function clearTick() {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;
}

function startTick(set: (partial: Partial<FocusTimerState>) => void, get: () => FocusTimerState) {
  clearTick();
  intervalId = setInterval(() => {
    const s = get();
    if (s.state !== "running" || s.timeLeft <= 0) return;
    const newTimeLeft = s.timeLeft - 1;
    if (newTimeLeft === 0) {
      clearTick();
      set({ state: "completed", timeLeft: 0 });
    } else {
      set({ timeLeft: newTimeLeft });
    }
  }, 1000);
}

export const useFocusTimerStore = create<FocusTimerState>((set, get) => ({
  state: "idle",
  timeLeft: defaultFocusTime,
  totalTime: defaultFocusTime,

  setState: (state) => set({ state }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setTotalTime: (totalTime) => set({ totalTime }),

  start: () => {
    const { state, timeLeft } = get();
    if (state === "running") return;
    startTick(set, get);
    set({ state: "running", totalTime: timeLeft });
  },

  pause: () => {
    clearTick();
    set({ state: "paused" });
  },

  resume: () => {
    if (get().state !== "paused") return;
    startTick(set, get);
    set({ state: "running" });
  },

  reset: () => {
    clearTick();
    set({ state: "idle", timeLeft: defaultFocusTime, totalTime: defaultFocusTime });
  },
}));
