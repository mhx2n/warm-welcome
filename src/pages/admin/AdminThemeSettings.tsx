import { useState, useEffect } from "react";
import { useSiteSettings, useSaveSiteSettings } from "@/hooks/useSupabaseData";
import { SiteSettings, ThemeColors } from "@/lib/types";
import { themePresets, applyThemeColors } from "@/lib/themePresets";
import { useToast } from "@/hooks/use-toast";
import { Save, Palette, Check, Sliders } from "lucide-react";
import { getTheme } from "@/lib/theme";

const colorFields: { key: keyof ThemeColors; label: string }[] = [
  { key: "primary", label: "প্রাইমারি" },
  { key: "background", label: "ব্যাকগ্রাউন্ড" },
  { key: "foreground", label: "টেক্সট" },
  { key: "card", label: "কার্ড" },
  { key: "muted", label: "মিউটেড" },
  { key: "accent", label: "অ্যাকসেন্ট" },
  { key: "border", label: "বর্ডার" },
  { key: "success", label: "সাকসেস" },
  { key: "warning", label: "ওয়ার্নিং" },
];

const hslToHex = (hsl: string): string => {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#3b82f6";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const AdminThemeSettings = () => {
  const { data: loadedSettings, isLoading } = useSiteSettings();
  const saveMut = useSaveSiteSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (loadedSettings && !settings) setSettings(loadedSettings);
  }, [loadedSettings]);

  if (isLoading || !settings) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  const currentMode = getTheme();
  const activePreset = themePresets.find((t) => t.id === settings.activeThemeId);

  const selectPreset = (id: string) => {
    const preset = themePresets.find((t) => t.id === id);
    if (!preset) return;
    setSettings((prev) => prev ? { ...prev, activeThemeId: id } : prev);
    applyThemeColors(currentMode === "dark" ? preset.dark : preset.light, currentMode);
  };

  const updateCustomColor = (mode: "light" | "dark", key: keyof ThemeColors, hex: string) => {
    const hsl = hexToHsl(hex);
    setSettings((prev) => {
      if (!prev) return prev;
      const base = prev.customTheme || (activePreset ? { light: { ...activePreset.light }, dark: { ...activePreset.dark } } : { light: { ...themePresets[0].light }, dark: { ...themePresets[0].dark } });
      const updated = {
        ...prev,
        activeThemeId: "custom",
        customTheme: { ...base, [mode]: { ...base[mode], [key]: hsl } },
      };
      const colors = updated.customTheme![currentMode];
      applyThemeColors(colors, currentMode);
      return updated;
    });
  };

  const save = () => {
    saveMut.mutate(settings, {
      onSuccess: () => toast({ title: "থিম সেভ হয়েছে ✅" }),
    });
  };

  const getEditableColors = (): ThemeColors => {
    if (settings.activeThemeId === "custom" && settings.customTheme) return settings.customTheme[currentMode];
    return activePreset ? activePreset[currentMode] : themePresets[0][currentMode];
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2"><Palette size={22} className="text-primary" /> থিম কাস্টমাইজার</h1>
        <button onClick={save} disabled={saveMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
          <Save size={16} /> সেভ করুন
        </button>
      </div>

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold">🏷️ ব্র্যান্ড সেটিংস</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">ব্র্যান্ড নাম</label>
            <input value={settings.brandName} onChange={(e) => setSettings((p) => p ? { ...p, brandName: e.target.value } : p)}
              className="w-full glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">ব্র্যান্ড ইমোজি</label>
            <input value={settings.brandEmoji} onChange={(e) => setSettings((p) => p ? { ...p, brandEmoji: e.target.value } : p)}
              className="w-full glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">হিরো ট্যাগলাইন</label>
          <input value={settings.heroTagline} onChange={(e) => setSettings((p) => p ? { ...p, heroTagline: e.target.value } : p)}
            className="w-full glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">হিরো সাবটাইটেল</label>
          <input value={settings.heroSubtitle} onChange={(e) => setSettings((p) => p ? { ...p, heroSubtitle: e.target.value } : p)}
            className="w-full glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="ঐচ্ছিক" />
        </div>
      </div>

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold">🎨 প্রিসেট থিম</h2>
        <p className="text-xs text-muted-foreground">একটি থিম নির্বাচন করুন — লাইভ প্রিভিউ দেখুন</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themePresets.map((preset) => {
            const isActive = settings.activeThemeId === preset.id;
            const colors = currentMode === "dark" ? preset.dark : preset.light;
            return (
              <button key={preset.id} onClick={() => selectPreset(preset.id)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${isActive ? "border-primary shadow-lg scale-[1.02]" : "border-border hover:border-primary/40"}`}>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: `hsl(${colors.primary})` }} />
                  <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: `hsl(${colors.accent})` }} />
                  <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: `hsl(${colors.background})` }} />
                </div>
                <p className="text-xs font-semibold">{preset.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <button onClick={() => setShowCustom(!showCustom)} className="flex items-center gap-2 text-sm font-bold w-full">
          <Sliders size={16} className="text-primary" /> কাস্টম কালার এডিটর
          <span className="text-xs text-muted-foreground ml-auto">{showCustom ? "বন্ধ করুন" : "খুলুন"}</span>
        </button>
        {showCustom && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              বর্তমান মোড: <span className="font-semibold">{currentMode === "dark" ? "ডার্ক" : "লাইট"}</span> — পরিবর্তন করলে কাস্টম থিম সক্রিয় হবে
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colorFields.map((field) => {
                const colors = getEditableColors();
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-medium">{field.label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={hslToHex(colors[field.key])} onChange={(e) => updateCustomColor(currentMode, field.key, e.target.value)}
                        className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                      <span className="text-[10px] text-muted-foreground font-mono">{colors[field.key]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <button onClick={save} disabled={saveMut.isPending} className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
          <Save size={16} /> সব সেভ করুন
        </button>
      </div>
    </div>
  );
};

export default AdminThemeSettings;
