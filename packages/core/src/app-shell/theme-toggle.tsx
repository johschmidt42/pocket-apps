import { Button } from "@pocket-apps/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { applyTheme, currentTheme, saveTheme } from "./theme.ts";

/** Switches between light and dark mode. */
export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={next === "dark" ? "Dunkles Design" : "Helles Design"}
      onClick={() => {
        applyTheme(next);
        saveTheme(next);
        setTheme(next);
      }}
    >
      {next === "dark" ? <Moon /> : <Sun />}
    </Button>
  );
}
