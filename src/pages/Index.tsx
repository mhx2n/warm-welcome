import { Link } from "react-router-dom";
import { Search, ArrowRight, BookOpen, FolderOpen, Bell, BarChart3, Clock, X as XIcon, BookX, Radio } from "lucide-react";
import { useExams, useNotices, useResults, useSections } from "@/hooks/useSupabaseData";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import ExamCard from "@/components/ExamCard";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLabel } from "@/lib/labels";

const Index = () => {
  const settings = useSiteSettingsContext();
  const { data: allExams = [] } = useExams();
  const { data: notices = [] } = useNotices();
  const { data: results = [] } = useResults();
  const { data: sections = [] } = useSections();
  const { canAccess } = usePremiumAccess();
  const exams = allExams.filter((e) => e.published && canAccess(e.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const featured = exams.filter((e) => e.featured);
  const [search, setSearch] = useState("");
  const recentResults = results.slice(0, 3);
  const [liveBanner, setLiveBanner] = useState<{ id: string; title: string; status: string }[]>([]);

  useEffect(() => {
    supabase.from("live_exams").select("id,title,status").in("status", ["live", "scheduled"])
      .order("start_time", { ascending: true }).limit(3)
      .then(({ data }) => setLiveBanner((data || []) as any));
  }, []);

  const filtered = search
    ? exams.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background dark:from-background/70 dark:via-background/90 dark:to-background" />
        <div className="container relative z-10 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-fade-in">
            <span className="gradient-text">{settings.brandName}</span> {settings.brandEmoji}
          </h1>
          <p className="text-lg text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {settings.heroTagline}
          </p>
          {settings.heroSubtitle && (
            <p className="text-sm text-muted-foreground/80 mb-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              {settings.heroSubtitle}
            </p>
          )}

          <div className="relative max-w-md mx-auto mb-8 animate-fade-in z-30" style={{ animationDelay: "0.2s" }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10" size={18} />
            <input type="text" placeholder={getLabel("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-border/60 bg-background/90 backdrop-blur-md pl-11 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm" />
            {search && search.length > 0 && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10">
                <XIcon size={16} />
              </button>
            )}
            {search && (
              <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl border border-border/60 bg-background shadow-2xl max-h-72 overflow-y-auto z-[100]" style={{ backdropFilter: 'blur(20px)' }}>
                {filtered.length > 0 ? (
                  <div className="p-2 space-y-0.5">
                    {filtered.map((e) => (
                      <Link key={e.id} to={`/exams/${e.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
                        <BookOpen size={15} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.subject} • {e.questionCount} {getLabel("questions", "প্রশ্ন")}</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    কোনো পরীক্ষা পাওয়া যায়নি
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to="/exams" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]">
              <BookOpen size={18} /> {getLabel("ctaExams")}
            </Link>
            <Link to="/results" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold glass hover:bg-muted/80 transition-all">
              <BarChart3 size={18} /> {getLabel("ctaResults")}
            </Link>
            <Link to="/wrong-answers" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-[0.98]">
              <BookX size={18} /> ভুল উত্তর ব্যাংক
            </Link>
          </div>
        </div>
      </section>

      <div className="container space-y-12 pb-8">
        {liveBanner.length > 0 && (
          <section className="-mt-6">
            <Link to="/live-exams" className="block group">
              <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 transition-all">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Radio size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {liveBanner.some((b) => b.status === "live") && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                        </span>
                      )}
                      <p className="font-bold text-sm">
                        {liveBanner.some((b) => b.status === "live") ? "লাইভ পরীক্ষা চলছে!" : "নতুন লাইভ পরীক্ষা নির্ধারিত"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{liveBanner.map((b) => b.title).join(" • ")}</p>
                  </div>
                  <ArrowRight size={18} className="text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-8 relative z-10">
          {[
            { icon: BookOpen, label: getLabel("statTotalExams"), val: exams.length, link: "/exams" },
            { icon: FolderOpen, label: "প্রশ্ন ব্যাংক", val: sections.length, link: "/exams?tab=sections" },
            { icon: BarChart3, label: getLabel("statPractice"), val: results.length, link: "/results" },
            { icon: Bell, label: getLabel("statNotices"), val: notices.length, link: "/notices" },
          ].map((s, i) => (
            <Link key={i} to={s.link} className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
              <s.icon className="mx-auto mb-2 text-primary" size={22} />
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Link>
          ))}
        </div>

        {recentResults.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">{getLabel("recentResults")}</h2>
              <Link to="/results" className="text-xs text-primary font-medium flex items-center gap-1">{getLabel("viewAll")} <ArrowRight size={14} /></Link>
            </div>
            <div className="space-y-2">
              {recentResults.map((r, i) => (
                <div key={i} className="glass-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.examTitle}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} /> {new Date(r.timestamp).toLocaleDateString("bn-BD")}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${r.percentage >= 60 ? "text-success" : "text-destructive"}`}>
                    {r.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {notices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Bell size={18} className="text-primary" /> {getLabel("noticeBoard")}</h2>
              <Link to="/notices" className="text-xs text-primary font-medium flex items-center gap-1">{getLabel("viewAll")} <ArrowRight size={14} /></Link>
            </div>
            <div className="space-y-2">
              {notices.slice(0, 3).map((n) => (
                <Link key={n.id} to={`/notices/${n.id}`} className="glass-card p-4 flex items-center gap-3 group">
                  {n.pinned && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{getLabel("pinned")}</span>}
                  <span className="text-sm font-medium group-hover:text-primary transition-colors flex-1">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.createdAt}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{getLabel("featuredExams")}</h2>
              <Link to="/exams" className="text-xs text-primary font-medium flex items-center gap-1">{getLabel("viewAll")} <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.slice(0, 3).map((e) => <ExamCard key={e.id} exam={e} />)}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{getLabel("allExams")}</h2>
            <Link to="/exams" className="text-xs text-primary font-medium flex items-center gap-1">{getLabel("viewMore")} <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.slice(0, 3).map((e) => <ExamCard key={e.id} exam={e} />)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
