import { useState, useEffect } from "react";
import { useSiteSettings, useSaveSiteSettings } from "@/hooks/useSupabaseData";
import { SiteSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Bold, Italic, Link as LinkIcon, List, ChevronDown, ChevronRight } from "lucide-react";
import { defaultLabels } from "@/lib/labels";

const RichEditor = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const execCmd = (cmd: string, val?: string) => document.execCommand(cmd, false, val);
  const insertLink = () => { const url = prompt("লিঙ্ক URL দিন:"); if (url) execCmd("createLink", url); };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">{label}</label>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
          <button type="button" onClick={() => execCmd("bold")} className="p-1.5 rounded hover:bg-muted transition-colors"><Bold size={14} /></button>
          <button type="button" onClick={() => execCmd("italic")} className="p-1.5 rounded hover:bg-muted transition-colors"><Italic size={14} /></button>
          <button type="button" onClick={insertLink} className="p-1.5 rounded hover:bg-muted transition-colors"><LinkIcon size={14} /></button>
          <button type="button" onClick={() => execCmd("insertUnorderedList")} className="p-1.5 rounded hover:bg-muted transition-colors"><List size={14} /></button>
          <select onChange={(e) => { if (e.target.value) execCmd("fontSize", e.target.value); }} className="text-xs bg-transparent border border-border rounded px-1 py-1" defaultValue="">
            <option value="" disabled>সাইজ</option>
            <option value="1">ছোট</option>
            <option value="3">স্বাভাবিক</option>
            <option value="5">বড়</option>
            <option value="7">অনেক বড়</option>
          </select>
        </div>
        <div contentEditable className="p-3 min-h-[100px] text-sm focus:outline-none prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value }} onBlur={(e) => onChange(e.currentTarget.innerHTML)} />
      </div>
    </div>
  );
};

const labelGroups: { title: string; keys: string[] }[] = [
  { title: "🧭 নেভিগেশন", keys: ["navHome", "navExams", "navResults", "navNotices", "navProfile", "navAbout"] },
  { title: "🏠 হোমপেজ", keys: ["searchPlaceholder", "ctaExams", "ctaResults", "statTotalExams", "statSubjects", "statPractice", "statNotices", "recentResults", "viewAll", "noticeBoard", "featuredExams", "allExams", "viewMore", "pinned"] },
  { title: "📝 পরীক্ষা", keys: ["examsPageTitle", "tabSections", "tabSubjects", "searchHint", "allSubjects", "diffAll", "diffEasy", "diffMedium", "diffHard", "noSections", "noExams", "examCount", "viewSection", "startExam", "questions", "minutes"] },
  { title: "📋 ফুটার", keys: ["quickLinks", "contact", "allRightsReserved"] },
  { title: "📊 অন্যান্য", keys: ["resultsTitle", "noticesTitle"] },
  { title: "🔴 লাইভ এক্সাম পেজ", keys: ["liveExamBadge", "liveExamHeroTitle", "liveExamHeroSubtitle", "liveExamStatNow", "liveExamStatUpcoming", "liveExamSectionLive", "liveExamSectionUpcoming", "liveExamEmptyTitle", "liveExamEmptySubtitle", "liveExamJoinNow", "liveExamWait", "liveExamJoining"] },
];

const AdminSiteSettings = () => {
  const { data: loadedSettings, isLoading } = useSiteSettings();
  const saveMut = useSaveSiteSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (loadedSettings && !settings) setSettings(loadedSettings);
  }, [loadedSettings]);

  if (isLoading || !settings) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  const update = (key: keyof SiteSettings, value: any) => setSettings((prev) => prev ? { ...prev, [key]: value } : prev);

  const uiLabels = settings.uiLabels || {};
  const updateLabel = (key: string, val: string) => {
    const updated = { ...uiLabels, [key]: val };
    if (val === defaultLabels[key] || val === "") delete updated[key];
    update("uiLabels", updated);
  };

  const save = () => {
    saveMut.mutate(settings, {
      onSuccess: () => toast({ title: "সেটিংস সেভ হয়েছে ✅" }),
    });
  };

  const addFooterLink = () => update("footerLinks", [...settings.footerLinks, { label: "", url: "" }]);
  const removeFooterLink = (i: number) => update("footerLinks", settings.footerLinks.filter((_, idx) => idx !== i));
  const updateFooterLink = (i: number, key: "label" | "url", val: string) => {
    const updated = [...settings.footerLinks]; updated[i] = { ...updated[i], [key]: val }; update("footerLinks", updated);
  };
  const addSocialLink = () => update("socialLinks", [...settings.socialLinks, { label: "", url: "" }]);
  const removeSocialLink = (i: number) => update("socialLinks", settings.socialLinks.filter((_, idx) => idx !== i));
  const updateSocialLink = (i: number, key: "label" | "url", val: string) => {
    const updated = [...settings.socialLinks]; updated[i] = { ...updated[i], [key]: val }; update("socialLinks", updated);
  };

  const toggleGroup = (title: string) => setOpenGroups((p) => ({ ...p, [title]: !p[title] }));

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🌐 সাইট কাস্টমাইজ</h1>
        <button onClick={save} disabled={saveMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
          <Save size={16} /> সেভ করুন
        </button>
      </div>

      <div className="space-y-6">
        <div className="glass-card-static p-5 space-y-4">
          <h2 className="text-sm font-bold">📖 আমাদের সম্পর্কে পেজ</h2>
          <div className="space-y-2">
            <label className="text-sm font-semibold">শিরোনাম</label>
            <input value={settings.aboutTitle} onChange={(e) => update("aboutTitle", e.target.value)}
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <RichEditor label="বিবরণ" value={settings.aboutContent} onChange={(v) => update("aboutContent", v)} />
          <div className="space-y-2">
            <label className="text-sm font-semibold">বৈশিষ্ট্য শিরোনাম</label>
            <input value={settings.featuresTitle} onChange={(e) => update("featuresTitle", e.target.value)}
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <RichEditor label="বৈশিষ্ট্য তালিকা" value={settings.featuresContent} onChange={(v) => update("featuresContent", v)} />
          <div className="space-y-2">
            <label className="text-sm font-semibold">যোগাযোগ শিরোনাম</label>
            <input value={settings.contactTitle} onChange={(e) => update("contactTitle", e.target.value)}
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <RichEditor label="যোগাযোগ তথ্য" value={settings.contactContent} onChange={(v) => update("contactContent", v)} />
        </div>

        <div className="glass-card-static p-5 space-y-4">
          <h2 className="text-sm font-bold">📋 ফুটার সেটিংস</h2>
          <div className="space-y-2">
            <label className="text-sm font-semibold">ফুটার বিবরণ</label>
            <input value={settings.footerDescription} onChange={(e) => update("footerDescription", e.target.value)}
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">দ্রুত লিঙ্কসমূহ</label>
            {settings.footerLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input placeholder="লেবেল" value={link.label} onChange={(e) => updateFooterLink(i, "label", e.target.value)} className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <input placeholder="URL (/exams)" value={link.url} onChange={(e) => updateFooterLink(i, "url", e.target.value)} className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <button onClick={() => removeFooterLink(i)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 size={14} className="text-destructive" /></button>
              </div>
            ))}
            <button onClick={addFooterLink} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={14} /> লিঙ্ক যোগ করুন</button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">সোশ্যাল লিঙ্কসমূহ</label>
            {settings.socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input placeholder="লেবেল (Telegram)" value={link.label} onChange={(e) => updateSocialLink(i, "label", e.target.value)} className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <input placeholder="URL" value={link.url} onChange={(e) => updateSocialLink(i, "url", e.target.value)} className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <button onClick={() => removeSocialLink(i)} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 size={14} className="text-destructive" /></button>
              </div>
            ))}
            <button onClick={addSocialLink} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={14} /> সোশ্যাল লিঙ্ক যোগ করুন</button>
          </div>
        </div>

        <div className="glass-card-static p-5 space-y-4">
          <button onClick={() => setLabelsOpen(!labelsOpen)} className="w-full flex items-center justify-between">
            <h2 className="text-sm font-bold">🏷️ সকল টেক্সট/লেবেল কাস্টমাইজ</h2>
            {labelsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {labelsOpen && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">ওয়েবসাইটের সকল টেক্সট এখান থেকে পরিবর্তন করুন। খালি রাখলে ডিফল্ট ব্যবহার হবে।</p>
              {labelGroups.map((group) => (
                <div key={group.title} className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => toggleGroup(group.title)} className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-semibold">{group.title}</span>
                    {openGroups[group.title] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {openGroups[group.title] && (
                    <div className="p-3 space-y-2">
                      {group.keys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-32 shrink-0 truncate" title={key}>{key}</span>
                          <input value={uiLabels[key] || ""} placeholder={defaultLabels[key] || key} onChange={(e) => updateLabel(key, e.target.value)}
                            className="flex-1 glass-strong rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <button onClick={save} disabled={saveMut.isPending} className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
          <Save size={16} /> সব সেভ করুন
        </button>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
