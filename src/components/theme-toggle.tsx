import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggleTheme } = useTheme();
  const isDark = resolved === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "relative rounded-xl h-10 w-10 p-0 hover:bg-primary/10 border border-transparent hover:border-primary/15",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Sun
        className={cn(
          "h-5 w-5 transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
        strokeWidth={2.5}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
        strokeWidth={2.5}
      />
    </Button>
  );
}

export function ThemeToggleRow({ onSelect }: { onSelect?: () => void }) {
  const { resolved, toggleTheme } = useTheme();
  const isDark = resolved === "dark";

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
        <span className="text-sm font-semibold">{isDark ? "Dark mode" : "Light mode"}</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={() => {
          toggleTheme();
          onSelect?.();
        }}
        aria-label="Toggle dark mode"
      />
    </div>
  );
}
