import { useExams, useSections } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import ExamCard from "@/components/ExamCard";

const StudentExams = () => {
  const { data: allExamsRaw = [] } = useExams();
  const { data: sections = [] } = useSections();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const allExams = allExamsRaw.filter((e) => e.published);
  const subjects = ["all", ...new Set(allExams.map((e) => e.subject))];
  const diffLabels: Record<string, string> = { all: "সকল", easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };

  const filtered = allExams
    .filter((e) => {
      if (subject !== "all" && e.subject !== subject) return false;
      if (difficulty !== "all" && e.difficulty !== difficulty) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const toggleSection = (id: string) => setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const sectionedExams = sections
    .map((s) => ({ section: s, exams: filtered.filter((e) => e.sectionId === s.id) }))
    .filter((g) => g.exams.length > 0);

  const unsectionedExams = filtered.filter((e) => !e.sectionId || !sections.find((s) => s.id === e.sectionId));

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold">📝 পরীক্ষা সমূহ</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder="খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          {subjects.map((s) => <option key={s} value={s}>{s === "all" ? "সকল বিষয়" : s}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          {["all", "easy", "medium", "hard"].map((d) => <option key={d} value={d}>{diffLabels[d]}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-muted-foreground">কোনো পরীক্ষা পাওয়া যায়নি</div>
      ) : (
        <div className="space-y-6">
          {sectionedExams.map(({ section, exams }) => (
            <div key={section.id}>
              <button onClick={() => toggleSection(section.id)} className="w-full flex items-center gap-2 glass-card-static p-4 mb-3 text-left hover:bg-muted/50 transition-colors">
                {collapsedSections[section.id] ? <ChevronRight size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
                <div className="flex-1">
                  <h2 className="text-base font-bold text-primary">📂 {section.name}</h2>
                  {section.description && <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{exams.length} পরীক্ষা</span>
              </button>
              {!collapsedSections[section.id] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                  {exams.map((e) => <ExamCard key={e.id} exam={e} />)}
                </div>
              )}
            </div>
          ))}
          {unsectionedExams.length > 0 && (
            <div>
              {sectionedExams.length > 0 && <h2 className="text-base font-bold mb-3">📝 অন্যান্য পরীক্ষা</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unsectionedExams.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentExams;
