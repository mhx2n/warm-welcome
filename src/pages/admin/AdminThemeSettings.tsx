import { useState, useEffect } from "react";
import { useSiteSettings, useSaveSiteSettings } from "@/hooks/useSupabaseData";
import { SiteSettings, ThemeColors } from "@/lib/types";
import { themePresets, applyThemeColors } from "@/lib/themePresets";
import { reportThemePresets, defaultReportSettings } from "@/lib/reportThemePresets";
import { useToast } from "@/hooks/use-toast";
import { Save, Palette, Check, Sliders, FileText, Plus, Trash2, Link2, Image as ImageIcon, Eye, EyeOff, Trophy } from "lucide-react";
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

  const reportSettings = settings.reportSettings || defaultReportSettings;
  const updateReport = (patch: Partial<typeof reportSettings>) => {
    setSettings((p) => p ? { ...p, reportSettings: { ...reportSettings, ...patch } } : p);
  };
  const updateFooterLink = (idx: number, field: "label" | "url", value: string) => {
    const links = [...reportSettings.footerLinks];
    links[idx] = { ...links[idx], [field]: value };
    updateReport({ footerLinks: links });
  };
  const addFooterLink = () => updateReport({ footerLinks: [...reportSettings.footerLinks, { label: "", url: "" }] });
  const removeFooterLink = (idx: number) => updateReport({ footerLinks: reportSettings.footerLinks.filter((_, i) => i !== idx) });
  const podium = reportSettings.podiumColors || { gold: "#eab308", silver: "#94a3b8", bronze: "#ca8a04" };
  const updatePodium = (key: "gold" | "silver" | "bronze", value: string) =>
    updateReport({ podiumColors: { ...podium, [key]: value } });

  const onLogoUpload = (file: File | null) => {
    if (!file) return;
    if (file.size > 600 * 1024) {
      toast({ title: "ছবি বড় (সর্বোচ্চ 600KB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateReport({ liveExamLogo: reader.result as string });
    reader.readAsDataURL(file);
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

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold flex items-center gap-2"><FileText size={16} className="text-primary" /> PDF রিপোর্ট থিম ও ফুটার</h2>
        <p className="text-xs text-muted-foreground">লাইভ পরীক্ষার লিডারবোর্ড PDF এ এই থিম ও ফুটার ব্যবহৃত হবে।</p>

        <div>
          <label className="text-xs font-semibold mb-2 block">প্রিসেট থিম</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {reportThemePresets.map((p) => {
              const active = reportSettings.themeId === p.id;
              return (
                <button key={p.id} onClick={() => updateReport({ themeId: p.id })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${active ? "border-primary scale-[1.02]" : "border-border hover:border-primary/40"}`}>
                  <div className="flex gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-md border" style={{ backgroundColor: p.header }} />
                    <div className="w-5 h-5 rounded-md border" style={{ backgroundColor: p.accent }} />
                  </div>
                  <p className="text-xs font-semibold">{p.name}</p>
                </button>
              );
            })}
            <button onClick={() => updateReport({ themeId: "custom" })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${reportSettings.themeId === "custom" ? "border-primary scale-[1.02]" : "border-border hover:border-primary/40"}`}>
              <div className="flex gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-md border" style={{ backgroundColor: reportSettings.customHeader || "#888" }} />
                <div className="w-5 h-5 rounded-md border" style={{ backgroundColor: reportSettings.customAccent || "#888" }} />
              </div>
              <p className="text-xs font-semibold">কাস্টম</p>
            </button>
          </div>
        </div>

        {reportSettings.themeId === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">হেডার কালার</label>
              <div className="flex items-center gap-2">
                <input type="color" value={reportSettings.customHeader || "#2563eb"}
                  onChange={(e) => updateReport({ customHeader: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-[11px] text-muted-foreground font-mono">{reportSettings.customHeader || "#2563eb"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">অ্যাকসেন্ট কালার</label>
              <div className="flex items-center gap-2">
                <input type="color" value={reportSettings.customAccent || "#3b82f6"}
                  onChange={(e) => updateReport({ customAccent: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-[11px] text-muted-foreground font-mono">{reportSettings.customAccent || "#3b82f6"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1 pt-2 border-t border-border">
          <label className="text-xs font-semibold">ফুটার টেক্সট</label>
          <input value={reportSettings.footerText} onChange={(e) => updateReport({ footerText: e.target.value })}
            placeholder="Target — Smart Exam Platform"
            className="w-full glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold flex items-center gap-1.5"><Link2 size={12} /> ফুটার লিংক ({reportSettings.footerLinks.length})</label>
            <button onClick={addFooterLink} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary inline-flex items-center gap-1">
              <Plus size={12} /> যোগ করুন
            </button>
          </div>
          {reportSettings.footerLinks.map((lnk, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={lnk.label} onChange={(e) => updateFooterLink(i, "label", e.target.value)}
                placeholder="Website / Facebook / Telegram"
                className="flex-1 glass-strong rounded-lg px-3 py-2 text-xs" />
              <input value={lnk.url} onChange={(e) => updateFooterLink(i, "url", e.target.value)}
                placeholder="https://..."
                className="flex-[1.5] glass-strong rounded-lg px-3 py-2 text-xs" />
              <button onClick={() => removeFooterLink(i)} className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {reportSettings.footerLinks.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">এখনও কোনো লিংক যোগ করা হয়নি।</p>
          )}
        </div>
      </div>

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold flex items-center gap-2"><Trophy size={16} className="text-warning" /> লিডারবোর্ড ও লাইভ পরীক্ষা</h2>

        <div>
          <label className="text-xs font-semibold mb-2 block">পডিয়াম কালার (১ম / ২য় / ৩য়)</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: "gold" as const, label: "১ম স্থান" },
              { key: "silver" as const, label: "২য় স্থান" },
              { key: "bronze" as const, label: "৩য় স্থান" },
            ]).map((m) => (
              <div key={m.key} className="space-y-1">
                <label className="text-[11px] font-medium">{m.label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={podium[m.key]} onChange={(e) => updatePodium(m.key, e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <span className="text-[10px] text-muted-foreground font-mono">{podium[m.key]}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Live preview */}
          <div className="mt-3 flex items-end justify-center gap-2 p-3 rounded-xl bg-muted/30">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">২য়</p>
              <div className="h-12 rounded-t-lg" style={{ background: `linear-gradient(to bottom, ${podium.silver}cc, ${podium.silver})` }} />
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">১ম</p>
              <div className="h-16 rounded-t-lg" style={{ background: `linear-gradient(to bottom, ${podium.gold}cc, ${podium.gold})` }} />
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">৩য়</p>
              <div className="h-10 rounded-t-lg" style={{ background: `linear-gradient(to bottom, ${podium.bronze}cc, ${podium.bronze})` }} />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <label className="text-xs font-semibold flex items-center gap-1.5"><ImageIcon size={12} /> লাইভ পরীক্ষার কাস্টম লোগো</label>
          <p className="text-[11px] text-muted-foreground">স্টুডেন্ট পোর্টালে লাইভ পরীক্ষার কার্ডে ডিফল্ট আইকনের জায়গায় এই লোগো দেখাবে।</p>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
              {reportSettings.liveExamLogo
                ? <img src={reportSettings.liveExamLogo} alt="logo" className="w-full h-full object-cover" />
                : <ImageIcon size={20} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              <label className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold cursor-pointer">
                আপলোড
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => onLogoUpload(e.target.files?.[0] || null)} />
              </label>
              {reportSettings.liveExamLogo && (
                <button onClick={() => updateReport({ liveExamLogo: undefined })}
                  className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold inline-flex items-center gap-1">
                  <Trash2 size={12} /> সরান
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <button onClick={() => updateReport({ showFullLeaderboardToStudents: !reportSettings.showFullLeaderboardToStudents })}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl glass-strong">
            <div className="text-left">
              <p className="text-xs font-bold flex items-center gap-1.5">
                {reportSettings.showFullLeaderboardToStudents ? <Eye size={12} /> : <EyeOff size={12} />}
                স্টুডেন্টদের পূর্ণ লিডারবোর্ড দেখান
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                বন্ধ থাকলে শুধু টপ ৩ পডিয়াম দেখাবে — চালু করলে সবার র‍্যাঙ্কিং স্ক্রল করে দেখা যাবে
              </p>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${reportSettings.showFullLeaderboardToStudents ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${reportSettings.showFullLeaderboardToStudents ? "left-[22px]" : "left-0.5"}`} />
            </div>
          </button>
        </div>
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
