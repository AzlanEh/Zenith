import { memo } from "react";
import { cn } from "@/lib/utils";

export type Page = "dashboard" | "focus" | "goals" | "analytics" | "limits" | "settings";

interface SidebarProps {
  isOpen: boolean;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NAV_ITEMS: { icon: string; label: string; page: Page }[] = [
  { icon: "dashboard", label: "Dashboard", page: "dashboard" },
  { icon: "center_focus_strong", label: "Focus Mode", page: "focus" },
  { icon: "analytics", label: "Analytics", page: "analytics" },
  { icon: "timer_off", label: "Limits", page: "limits" },
  { icon: "outlined_flag", label: "Goals", page: "goals" },
  { icon: "settings", label: "Settings", page: "settings" },
];

export const Sidebar = memo(function Sidebar({ isOpen, currentPage, setCurrentPage }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-screen z-50 transition-transform duration-300",
        "fixed inset-y-0 left-0 lg:sticky lg:inset-y-auto",
        "w-full sm:w-56 lg:w-60 xl:w-64",
        "bg-[#1b1b1b] border-r border-[#474747]",
        !isOpen ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
      )}
    >
      <div className="p-4 sm:p-5 lg:p-6 xl:p-8 mb-4">
        <span
          className="block font-serif italic text-[#e2e2e2]"
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
          }}
        >
          Zenith
        </span>
        <span className="hidden sm:block font-sans uppercase tracking-[0.1em] text-xs text-[#c6c6c6]">
          Digital Sanctuary
        </span>
      </div>

      <nav className="px-2 sm:px-3 lg:px-4 xl:px-6 flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => setCurrentPage(item.page)}
            className={cn(
              "flex items-center w-full text-left gap-3 px-3 py-2 no-underline",
              "font-mono uppercase tracking-[0.1em] transition-all duration-200",
              "border-t-0 border-r-0 border-b-0",
              currentPage === item.page
                ? "font-bold bg-white text-[#1c1b1b] border-l-4 border-[#1c1b1b]"
                : "font-normal bg-transparent text-[#c6c6c6] border-l-4 border-transparent hover:bg-[#2a2a2a] hover:text-[#e2e2e2]",
            )}
            style={{
              fontSize: "clamp(0.65rem, 1.5vw, 0.75rem)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24",
                fontSize: "clamp(1.125rem, 2vw, 1.5rem)",
              }}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 sm:p-5 lg:p-6 xl:p-8 mt-auto">
        <button
          onClick={() => setCurrentPage("focus")}
          className="w-full bg-[#131313] text-white border border-[#474747] p-3 font-mono uppercase tracking-[0.2em] font-bold cursor-pointer transition-all duration-200 hover:bg-white hover:text-[#1c1b1b]"
          style={{
            fontSize: "clamp(0.6rem, 1.5vw, 0.7rem)",
          }}
        >
          Start Focus
        </button>
      </div>
    </aside>
  );
});
