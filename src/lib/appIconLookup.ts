import type { InstalledApp } from "../types";

type Resolver = (appName: string) => string | undefined;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.desktop$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(input: string): string {
  return normalize(input).replace(/\s+/g, "");
}

function basename(pathLike: string): string {
  const cleaned = pathLike.trim().replace(/^"|"$/g, "");
  const noArgs = cleaned.split(/\s+/)[0] ?? "";
  const parts = noArgs.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

function extractExecBinary(exec: string | null): string {
  if (!exec) return "";
  const tokens = exec.match(/(?:[^"]\S*|".+?")+/g) ?? [];
  const candidate =
    tokens.find((t) => !t.includes("=") && !["env", "flatpak", "snap", "sh", "bash"].includes(t)) ??
    tokens.find((t) => !t.includes("=")) ??
    exec;
  return basename(candidate);
}

export function createAppIconResolver(installedApps: InstalledApp[]): Resolver {
  const keyToIcon = new Map<string, string>();
  const compactEntries: Array<{ key: string; icon: string }> = [];

  for (const app of installedApps) {
    if (!app.icon) continue;

    const keys = new Set<string>();
    const name = normalize(app.name);
    const nameCompact = compact(app.name);
    const firstWord = name.split(" ")[0] ?? "";
    const desktopBase = normalize(basename(app.desktop_file));
    const execBase = normalize(extractExecBinary(app.exec));

    if (name) keys.add(name);
    if (nameCompact) keys.add(nameCompact);
    if (firstWord) keys.add(firstWord);
    if (desktopBase) keys.add(desktopBase);
    if (desktopBase) keys.add(compact(desktopBase));
    if (execBase) keys.add(execBase);
    if (execBase) keys.add(compact(execBase));

    for (const key of keys) {
      if (!keyToIcon.has(key)) keyToIcon.set(key, app.icon);
    }

    if (nameCompact) compactEntries.push({ key: nameCompact, icon: app.icon });
    const desktopCompact = compact(desktopBase);
    if (desktopCompact) compactEntries.push({ key: desktopCompact, icon: app.icon });
    const execCompact = compact(execBase);
    if (execCompact) compactEntries.push({ key: execCompact, icon: app.icon });
  }

  return (appName: string) => {
    const normalized = normalize(appName);
    const compactName = compact(appName);
    const firstWord = normalized.split(" ")[0] ?? "";

    const direct =
      keyToIcon.get(appName.toLowerCase()) ??
      keyToIcon.get(normalized) ??
      keyToIcon.get(compactName) ??
      keyToIcon.get(firstWord);

    if (direct) return direct;

    for (const entry of compactEntries) {
      if (!entry.key) continue;
      if (compactName === entry.key || compactName.includes(entry.key) || entry.key.includes(compactName)) {
        return entry.icon;
      }
    }

    return undefined;
  };
}
