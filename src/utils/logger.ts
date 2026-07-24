const DEV = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => { console.error("[ERROR]", ...args); },
  warn: (...args: unknown[]) => { if (DEV) console.warn("[WARN]", ...args); },
  info: (...args: unknown[]) => { if (DEV) console.info("[INFO]", ...args); },
};
