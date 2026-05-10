import { useExams, useSections } from "@/hooks/useSupabaseData";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import ExamCard from "@/components/ExamCard";
import { useState } from "react";
import { Search, X, FolderOpen, BookOpen } from "lucide-react";
import { getLabel } from "@/lib/labels";
import { useSearchParams } from "react-router-dom";

const ExamsPage = () => {
  const { data: allExamsRaw = [] } = useExams();
  const { data: sections = [] } = useSections();
  const { canAccess } = usePremiumAccess();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"sections" | "subjects">((searchParams.get("tab") as "sections" | "subjects") || "sections");

  const allExams = allExamsRaw.filter((e) => e.published && canAccess(e.id));

  const diffLabels: Record<string, string> = { all: getLabel("diffAll"), easy: getLabel("diffEasy"), medium: getLabel("diffMedium"), hard: getLabel("diffHard") };

  const sectionedExamIds = new Set(
    allExams.filter((e) => e.sectionId && sections.some((s) => s.id === e.sectionId)).map((e) => e.id)
  );

  const unsectionedExams = allExams.filter((e) => !sectionedExamIds.has(e.id));
  const subjects = ["all", ...new Set(unsectionedExams.map((e) => e.subject))];

  const filteredUnsectioned = unsectionedExams
    .filter((e) => {
      if (subject !== "all" && e.subject !== subject) return false;
      if (difficulty !== "all" && e.difficulty !== difficulty) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const sectionGroups = sections
    .map((s) => ({
      section: s,
      exams: allExams
        .filter((e) => e.sectionId === s.id)
        .filter((e) => {
          if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
          if (difficulty !== "all" && e.difficulty !== difficulty) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
    .filter((g) => g.exams.length > 0);

  const openSection = sectionGroups.find((g) => g.section.id === openSectionId);

  const subjectGroups = subjects
    .filter((s) => s !== "all")
    .map((s) => ({
      subject: s,
      exams: filteredUnsectioned.filter((e) => e.subject === s),
    }))
    .filter((g) => g.exams.length > 0);

  return (
    <div className="pt-24 pb-8 container min-h-screen">
      <h1 className="text-2xl font-bold mb-6">{getLabel("examsPageTitle")}</h1>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("sections")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === "sections" ? "bg-primary text-primary-foreground shadow-md" : "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderOpen size={16} /> প্রশ্ন ব্যাংক
        </button>
        <button
          onClick={() => setTab("subjects")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === "subjects" ? "bg-primary text-primary-foreground shadow-md" : "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={16} /> {getLabel("tabSubjects")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder={getLabel("searchHint")} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
        </div>
        {tab === "subjects" && (
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground bg-card">
            {subjects.map((s) => <option key={s} value={s} className="bg-card text-foreground">{s === "all" ? getLabel("allSubjects") : s}</option>)}
          </select>
        )}
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground bg-card">
          {["all", "easy", "medium", "hard"].map((d) => <option key={d} value={d} className="bg-card text-foreground">{diffLabels[d]}</option>)}
        </select>
      </div>

      {tab === "sections" && (
        <>
          {sectionGroups.length === 0 ? (
            <div className="glass-card-static p-12 text-center text-muted-foreground">{getLabel("noSections")}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionGroups.map(({ section, exams }) => (
                <button key={section.id} onClick={() => setOpenSectionId(section.id)}
                  className="glass-card p-0 overflow-hidden text-left group transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {section.image && (
                    <div className="w-full h-36 overflow-hidden">
                      <img src={section.image} alt={section.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="text-base font-bold text-primary">📂 {section.name}</h2>
                    {section.caption && <p className="text-xs text-primary/70 italic mt-1 font-medium">{section.caption}</p>}
                    {section.description && !section.caption && <p className="text-xs text-muted-foreground mt-1">{section.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{exams.length} {getLabel("examCount")}</span>
                      <span className="text-xs text-primary font-medium group-hover:underline">{getLabel("viewSection")}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "subjects" && (
        <>
          {filteredUnsectioned.length === 0 ? (
            <div className="glass-card-static p-12 text-center text-muted-foreground">{getLabel("noExams")}</div>
          ) : subject === "all" ? (
            <div className="space-y-6">
              {subjectGroups.map(({ subject: subj, exams }) => (
                <div key={subj}>
                  <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" /> {subj}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exams.map((e) => <ExamCard key={e.id} exam={e} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnsectioned.map((e) => <ExamCard key={e.id} exam={e} />)}
            </div>
          )}
        </>
      )}

      {openSection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpenSectionId(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-primary">📂 {openSection.section.name}</h2>
                {openSection.section.caption && <p className="text-xs text-primary/70 italic mt-0.5">{openSection.section.caption}</p>}
                {openSection.section.description && <p className="text-xs text-muted-foreground mt-0.5">{openSection.section.description}</p>}
              </div>
              <button onClick={() => setOpenSectionId(null)} className="p-2 rounded-xl hover:bg-muted transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {openSection.exams.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsPage;
