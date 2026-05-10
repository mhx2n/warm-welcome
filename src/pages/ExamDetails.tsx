import { useParams, Link, useNavigate } from "react-router-dom";
import { useExamById } from "@/hooks/useSupabaseData";
import { Clock, HelpCircle, ArrowLeft, CheckSquare, Square, Lock } from "lucide-react";
import { useState, useMemo } from "react";

import { getLabel } from "@/lib/labels";

const diffLabel: Record<string, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };

const ExamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exam, isLoading } = useExamById(id);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Get unique subjects from questions' section field
  const examSubjects = useMemo(() => {
    if (!exam) return [];
    return [...new Set(exam.questions.map((q) => q.section).filter(Boolean))];
  }, [exam]);

  const mandatorySubjects = useMemo(() => exam?.mandatorySubjects || [], [exam]);
  const hasMultipleSubjects = examSubjects.length > 1;

  // Initialize selected subjects when exam loads
  if (exam && !initialized && examSubjects.length > 0) {
    setSelectedSubjects(examSubjects); // select all by default
    setInitialized(true);
  }

  const toggleSubject = (subject: string) => {
    if (mandatorySubjects.includes(subject)) return; // can't deselect mandatory
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const selectedQuestionCount = useMemo(() => {
    if (!exam) return 0;
    if (!hasMultipleSubjects) return exam.questions.length;
    return exam.questions.filter((q) => selectedSubjects.includes(q.section)).length;
  }, [exam, selectedSubjects, hasMultipleSubjects]);

  const subjectQuestionCounts = useMemo(() => {
    if (!exam) return {};
    const counts: Record<string, number> = {};
    exam.questions.forEach((q) => {
      counts[q.section] = (counts[q.section] || 0) + 1;
    });
    return counts;
  }, [exam]);

  if (isLoading) {
    return <div className="pt-24 container text-center min-h-screen"><p className="text-muted-foreground">লোড হচ্ছে...</p></div>;
  }

  if (!exam) {
    return (
      <div className="pt-24 container text-center min-h-screen">
        <p className="text-muted-foreground">পরীক্ষা পাওয়া যায়নি</p>
        <Link to="/exams" className="text-primary text-sm mt-2 inline-block">ফিরে যান</Link>
      </div>
    );
  }

  const startExam = () => {
    const subjects = hasMultipleSubjects ? selectedSubjects : examSubjects;
    navigate(`/exams/${exam.id}/attempt`, { state: { selectedSubjects: subjects } });
  };

  return (
    <div className="pt-24 pb-8 container max-w-2xl min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> ফিরে যান
      </button>
      <div className="glass-card-static p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">{exam.subject}</span>
          <span className="text-xs font-medium bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning px-3 py-1 rounded-full">{getLabel(`diff${exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}`, diffLabel[exam.difficulty])}</span>
        </div>
        <h1 className="text-2xl font-bold">{exam.title}</h1>
        {exam.chapter && (
          <p className="text-sm text-muted-foreground">{exam.chapter}</p>
        )}
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><HelpCircle size={16} /> {exam.questionCount} প্রশ্ন</span>
          <span className="flex items-center gap-1.5"><Clock size={16} /> {exam.duration} মিনিট</span>
        </div>

        {/* Subject Selection for multi-subject exams */}
        {hasMultipleSubjects && (
          <div className="glass-card-static p-3 bg-accent/5 border-accent/20">
            <h3 className="font-semibold text-xs mb-2">📚 {getLabel("subjectSelection", "বিষয় নির্বাচন করুন")}</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              {mandatorySubjects.length > 0
                ? `🔒 ${mandatorySubjects.join(", ")} ${getLabel("mandatory", "বাধ্যতামূলক")}।`
                : getLabel("subjectSelectionHint", "আপনি যে বিষয়গুলোতে পরীক্ষা দিতে চান সেগুলো নির্বাচন করুন।")
              }
            </p>
            <div className="grid grid-cols-2 gap-2">
              {examSubjects.map((subject) => {
                const isMandatory = mandatorySubjects.includes(subject);
                const isSelected = selectedSubjects.includes(subject);
                const count = subjectQuestionCounts[subject] || 0;
                return (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    disabled={isMandatory}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground"
                    } ${isMandatory ? "opacity-90 cursor-not-allowed" : ""}`}
                  >
                    {isMandatory ? (
                      <Lock size={13} className="text-primary flex-shrink-0" />
                    ) : isSelected ? (
                      <CheckSquare size={13} className="text-primary flex-shrink-0" />
                    ) : (
                      <Square size={13} className="text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="flex-1 text-left truncate">{subject}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{getLabel("selectedQuestions", "নির্বাচিত প্রশ্ন")}:</span>
              <span className="font-bold text-primary">{selectedQuestionCount}টি</span>
            </div>
          </div>
        )}

        <div className="glass-card-static p-4 bg-primary/5 border-primary/20">
          <h3 className="font-semibold text-sm mb-2">📋 {getLabel("instructionsTitle", "নির্দেশাবলী")}</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>{getLabel("inst1", "প্রতিটি প্রশ্নের একটি সঠিক উত্তর আছে")}</li>
            <li>{getLabel("inst2", "সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে")}</li>
            <li>{getLabel("inst3", "আপনি যতবার খুশি অনুশীলন করতে পারবেন")}</li>
            {exam.negativeMarking > 0 && <li>{getLabel("instNegative", "প্রতিটি ভুল উত্তরে")} {exam.negativeMarking} {getLabel("instNegativeSuffix", "নম্বর কাটা যাবে")}</li>}
          </ul>
        </div>
        <button
          onClick={startExam}
          disabled={hasMultipleSubjects && selectedSubjects.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          পরীক্ষা শুরু করুন 🚀 {hasMultipleSubjects && `(${selectedQuestionCount} প্রশ্ন)`}
        </button>
      </div>
    </div>
  );
};

export default ExamDetails;
