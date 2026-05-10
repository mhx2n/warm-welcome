import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { themePresets, applyThemeColors } from "@/lib/themePresets";
import { getCachedSettings } from "@/contexts/SiteSettingsContext";

const ThemeToggle = () => {
  const [theme, setLocal] = useState<Theme>(getTheme());

  useEffect(() => {
    setTheme(theme);
    // Re-apply active theme from cached settings for new mode
    const settings = getCachedSettings();
    const themeId = settings.activeThemeId || "ocean-blue";
    if (themeId === "custom" && settings.customTheme) {
      applyThemeColors(settings.customTheme[theme], theme);
    } else {
      const preset = themePresets.find((t) => t.id === themeId);
      if (preset) {
        applyThemeColors(theme === "dark" ? preset.dark : preset.light, theme);
      }
    }
  }, [theme]);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setLocal(next);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} className="text-muted-foreground" /> : <Sun size={18} className="text-warning" />}
    </button>
  );
};

export default ThemeToggle;
