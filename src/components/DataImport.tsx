import { useState, useRef } from "react";
import type { ExportRecord } from "@/types";

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export function DataImport() {
  const [records, setRecords] = useState<ExportRecord[] | null>(null);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();
      let parsed: ExportRecord[];
      if (ext === "json") {
        parsed = JSON.parse(text);
      } else if (ext === "csv") {
        const lines = text.trim().split("\n");
        if (lines.length < 2) throw new Error("Empty CSV");
        const headers = parseCsvLine(lines[0]);
        const dateIdx = headers.indexOf("Date");
        const appIdx = headers.indexOf("App Name");
        const catIdx = headers.indexOf("Category");
        const durIdx = headers.indexOf("Duration (seconds)");
        const sessIdx = headers.indexOf("Sessions");
        if (dateIdx === -1 || appIdx === -1) throw new Error("Missing required columns");
        parsed = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          return {
            date: cols[dateIdx]?.trim() ?? "",
            app_name: cols[appIdx]?.trim() ?? "",
            category: cols[catIdx]?.trim() ?? "Uncategorized",
            duration_seconds: parseInt(cols[durIdx]?.trim() ?? "0") || 0,
            session_count: parseInt(cols[sessIdx]?.trim() ?? "0") || 0,
          };
        });
      } else {
        throw new Error("Unsupported format. Use .csv or .json");
      }
      setRecords(parsed.filter((r) => r.date && r.app_name));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!records || records.length === 0) return;
    setImporting(true);
    try {
      const count = await api.importUsageData(records);
      toast.success(`Imported ${count} records`);
      setRecords(null);
    } catch {
      toast.error("Import failed");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json"
        onChange={handleFile}
        className="hidden"
      />

      {!records ? (
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Import Data
        </Button>
      ) : (
        <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{records.length} records parsed</span>
          </div>
          {records.length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs space-y-1">
              {records.slice(0, 10).map((r, i) => (
                <div key={i} className="flex gap-2 text-muted-foreground">
                  <span className="font-mono w-24 shrink-0">{r.date}</span>
                  <span className="truncate flex-1">{r.app_name}</span>
                  <span className="font-mono w-16 text-right">{r.duration_seconds}s</span>
                </div>
              ))}
              {records.length > 10 && (
                <p className="text-muted-foreground">...and {records.length - 10} more</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${records.length} records`}
            </Button>
            <Button variant="outline" onClick={() => setRecords(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
