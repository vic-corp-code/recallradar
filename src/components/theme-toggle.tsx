"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      aria-label="Theme"
      className={cn(
        "grid grid-cols-3 rounded-lg border border-border bg-muted p-1",
        className,
      )}
      role="group"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;

        return (
          <Button
            aria-pressed={isActive}
            className={cn(
              "h-9 rounded-md px-2 text-muted-foreground shadow-none",
              isActive && "bg-background text-foreground shadow-sm",
            )}
            key={value}
            onClick={() => setTheme(value)}
            size="sm"
            title={label}
            type="button"
            variant="ghost"
          >
            <Icon aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
