import { create } from "zustand";

type FocusState = "idle" | "running" | "paused" | "completed" | "cancelled";

interface FocusTimerState {
  state: FocusState;
  timeLeft: number;
  totalTime: number;
  _intervalId: ReturnType<typeof setInterval> | null;
  setState: (state: FocusState) => void;
  setTimeLeft: (time: number) => void;
  setTotalTime: (time: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const defaultFocusTime = 25 * 60;

function clearTick(get: () => FocusTimerState, set: (partial: Partial<FocusTimerState>) => void) {
  const id = get()._intervalId;
  if (id !== null) clearInterval(id);
  set({ _intervalId: null });
}

function startTick(set: (partial: Partial<FocusTimerState>) => void, get: () => FocusTimerState) {
  clearTick(get, set);
  const id = setInterval(() => {
    const s = get();
    if (s.state !== "running" || s.timeLeft <= 0) return;
    const newTimeLeft = s.timeLeft - 1;
    if (newTimeLeft === 0) {
      clearTick(get, set);
      set({ state: "completed", timeLeft: 0 });
    } else {
      set({ timeLeft: newTimeLeft });
    }
  }, 1000);
  set({ _intervalId: id });
}

export const useFocusTimerStore = create<FocusTimerState>((set, get) => ({
  state: "idle",
  timeLeft: defaultFocusTime,
  totalTime: defaultFocusTime,
  _intervalId: null,

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
    clearTick(get, set);
    set({ state: "paused" });
  },

  resume: () => {
    if (get().state !== "paused") return;
    startTick(set, get);
    set({ state: "running" });
  },

  reset: () => {
    clearTick(get, set);
    set({ state: "idle", timeLeft: defaultFocusTime, totalTime: defaultFocusTime });
  },
}));
