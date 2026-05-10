import { themePresets, applyThemeColors } from "./themePresets";

const THEME_KEY = "target_theme";
const SITE_SETTINGS_KEY = "target_site_settings";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return "light";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  // Apply active theme colors
  applyActiveTheme(theme);
}

export function applyActiveTheme(mode: Theme) {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_KEY);
    if (!raw) return;
    const settings = JSON.parse(raw);
    const themeId = settings.activeThemeId || "ocean-blue";
    
    if (themeId === "custom" && settings.customTheme) {
      applyThemeColors(settings.customTheme[mode], mode);
    } else {
      const preset = themePresets.find((t) => t.id === themeId);
      if (preset) {
        applyThemeColors(mode === "dark" ? preset.dark : preset.light, mode);
      }
    }
  } catch {}
}

export function initTheme() {
  const theme = getTheme();
  document.documentElement.classList.toggle("dark", theme === "dark");
  applyActiveTheme(theme);
}
