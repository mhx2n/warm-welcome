import type { ReportSettings } from "./types";

export interface ReportThemePreset {
  id: string;
  name: string;
  header: string; // hex
  accent: string; // hex
}

export const reportThemePresets: ReportThemePreset[] = [
  { id: "blue", name: "ক্লাসিক নীল", header: "#2563eb", accent: "#3b82f6" },
  { id: "emerald", name: "এমেরাল্ড সবুজ", header: "#0f766e", accent: "#10b981" },
  { id: "maroon", name: "রয়্যাল মেরুন", header: "#7f1d1d", accent: "#dc2626" },
  { id: "noir-gold", name: "নোয়ার ও গোল্ড", header: "#0f172a", accent: "#c9a84c" },
  { id: "purple", name: "ডিপ পার্পল", header: "#5b21b6", accent: "#8b5cf6" },
];

export const defaultReportSettings: ReportSettings = {
  themeId: "blue",
  footerText: "Target — Smart Exam Platform",
  footerLinks: [],
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function resolveReportTheme(s?: ReportSettings): { header: string; accent: string } {
  const settings = s ?? defaultReportSettings;
  if (settings.themeId === "custom") {
    return {
      header: settings.customHeader || "#2563eb",
      accent: settings.customAccent || "#3b82f6",
    };
  }
  const preset = reportThemePresets.find((p) => p.id === settings.themeId) || reportThemePresets[0];
  return { header: preset.header, accent: preset.accent };
}