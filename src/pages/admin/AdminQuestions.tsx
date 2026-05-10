import { useState } from "react";
import { useExams } from "@/hooks/useSupabaseData";
import { Search } from "lucide-react";

const AdminQuestions = () => {
  const { data: exams = [], isLoading } = useExams();
  const allQuestions = exams.flatMap((e) => e.questions.map((q) => ({ ...q, examTitle: e.title })));
  const [search, setSearch] = useState("");

  const filtered = search
    ? allQuestions.filter((q) => q.question.toLowerCase().includes(search.toLowerCase()))
    : allQuestions;

  const sections = [...new Set(allQuestions.map((q) => q.section))];

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5">❓ প্রশ্ন ব্যাংক</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input placeholder="প্রশ্ন খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="glass-card-static p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{allQuestions.length}</p>
          <p className="text-xs text-muted-foreground">মোট প্রশ্ন</p>
        </div>
        {sections.slice(0, 3).map((s) => (
          <div key={s} className="glass-card-static p-4 text-center">
            <p className="text-2xl font-bold">{allQuestions.filter((q) => q.section === s).length}</p>
            <p className="text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 50).map((q, i) => (
          <div key={q.id} className="glass-card-static p-3">
            <p className="text-sm font-medium"><span className="text-muted-foreground mr-2">{i + 1}.</span>{q.question}</p>
            <p className="text-xs text-muted-foreground mt-1">✅ {q.answer} • 📁 {q.section} • 📝 {q.examTitle}</p>
          </div>
        ))}
        {filtered.length > 50 && (
          <p className="text-xs text-center text-muted-foreground">...এবং আরও {filtered.length - 50}টি প্রশ্ন</p>
        )}
      </div>
    </div>
  );
};

export default AdminQuestions;
