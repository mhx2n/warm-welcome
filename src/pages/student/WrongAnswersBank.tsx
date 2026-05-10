import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWrongAnswers, deleteWrongAnswersByExam, WrongAnswerEntry } from "@/lib/api";
import { CheckCircle2, XCircle, Trash2, ArrowLeft, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { isAnswerMatch } from "@/lib/answerUtils";
import { QuestionChatModal } from "@/components/QuestionChatModal";
import MathText from "@/components/MathText";

const WrongAnswersBank = () => {
  const [entries, setEntries] = useState<WrongAnswerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatQuestion, setChatQuestion] = useState<WrongAnswerEntry | null>(null);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchWrongAnswers().then(setEntries).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Group by exam → subject
  const grouped = entries.reduce<Record<string, {
    title: string;
    examId: string;
    subjects: Record<string, WrongAnswerEntry[]>;
    total: number;
  }>>((acc, e) => {
    if (!acc[e.examId]) acc[e.examId] = { title: e.examTitle, examId: e.examId, subjects: {}, total: 0 };
    const subj = e.section || "সাধারণ";
    if (!acc[e.examId].subjects[subj]) acc[e.examId].subjects[subj] = [];
    acc[e.examId].subjects[subj].push(e);
    acc[e.examId].total++;
    return acc;
  }, {});

  const handleDeleteExam = async (examId: string) => {
    await deleteWrongAnswersByExam(examId);
    load();
  };

  const toggleExam = (examId: string) => {
    setExpandedExam(prev => prev === examId ? null : examId);
    setExpandedSubject(null);
  };

  const toggleSubject = (key: string) => {
    setExpandedSubject(prev => prev === key ? null : key);
  };

  if (loading) {
    return <div className="pt-24 pb-8 container animate-fade-in text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  // Subject-wise summary across all exams
  const subjectSummary: Record<string, number> = {};
  entries.forEach(e => {
    const s = e.section || "সাধারণ";
    subjectSummary[s] = (subjectSummary[s] || 0) + 1;
  });

  return (
    <div className="pt-24 pb-8 container max-w-3xl mx-auto animate-fade-in px-3 sm:px-4">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">📕 ভুল উত্তর ব্যাংক</h1>
      </div>

      {entries.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-muted-foreground">
          কোনো ভুল উত্তর সংরক্ষিত নেই
          <br />
          <Link to="/exams" className="text-primary text-sm mt-2 inline-block">পরীক্ষা দিন →</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Overall summary */}
          <div className="glass-card-static p-4">
            <p className="text-sm text-muted-foreground mb-3">
              মোট {entries.length}টি ভুল উত্তর • {Object.keys(grouped).length}টি পরীক্ষা থেকে
            </p>
            {Object.keys(subjectSummary).length > 1 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(subjectSummary).map(([subj, count]) => (
                  <span key={subj} className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-full font-medium">
                    {subj}: {count}টি
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Exam groups */}
          {Object.values(grouped).map((group) => {
            const isExamOpen = expandedExam === group.examId;
            const subjectCount = Object.keys(group.subjects).length;

            return (
              <div key={group.examId} className="glass-card-static overflow-hidden">
                {/* Exam header */}
                <button
                  onClick={() => toggleExam(group.examId)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-foreground">{group.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.total}টি ভুল • {subjectCount}টি বিষয়
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteExam(group.examId); }}
                      className="text-xs text-destructive hover:underline flex items-center gap-1 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                    {isExamOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Subject groups inside exam */}
                {isExamOpen && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in">
                    {Object.entries(group.subjects).map(([subject, items]) => {
                      const subjectKey = `${group.examId}-${subject}`;
                      const isSubjOpen = expandedSubject === subjectKey;

                      return (
                        <div key={subjectKey} className="border border-border/50 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleSubject(subjectKey)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                                📘 {subject}
                              </span>
                              <span className="text-xs text-muted-foreground">{items.length}টি ভুল</span>
                            </div>
                            {isSubjOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {isSubjOpen && (
                            <div className="px-3 pb-3 space-y-3 animate-fade-in">
                              {items.map((entry, i) => (
                                <div key={entry.id || i} className="p-4 sm:p-5 border border-border/30 rounded-xl hover:border-primary/30 transition-colors bg-card">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 pr-2">
                                      <p className="text-[15px] sm:text-base font-semibold leading-[1.7]">
                                        <span className="text-muted-foreground mr-2 font-mono">{i + 1}.</span>
                                        <MathText text={entry.questionText} />
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setChatQuestion(entry)}
                                      className="ml-2 p-2.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 group"
                                      title="AI সহায়তা নিন"
                                    >
                                      <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                  </div>
                                  {entry.questionImage && <img src={entry.questionImage} alt="প্রশ্নের ছবি" className="max-w-full max-h-48 rounded-xl border border-border/30 mb-3 object-contain shadow-sm" />}
                                  <div className="space-y-2 mb-3">
                                    {entry.options.map((opt, oi) => {
                                      const isCorrectOpt = isAnswerMatch(opt, entry.correctAnswer);
                                      const isUserOpt = isAnswerMatch(opt, entry.userAnswer);
                                      let cls = "border-border/30";
                                      if (isCorrectOpt) cls = "border-success bg-success/10";
                                      else if (isUserOpt) cls = "border-destructive bg-destructive/10";
                                      return (
                                      <div key={opt} className={`px-3.5 py-3 rounded-lg text-[15px] sm:text-base border ${cls} transition-colors`}>
                                          <div className="flex items-center gap-2.5">
                                            {isCorrectOpt && <CheckCircle2 size={18} className="text-success flex-shrink-0" />}
                                            {isUserOpt && !isCorrectOpt && <XCircle size={18} className="text-destructive flex-shrink-0" />}
                                            <MathText text={opt} className="leading-[1.7]" />
                                          </div>
                                          {entry.optionImages?.[oi] && <img src={entry.optionImages[oi]!} alt="" className="mt-2 max-h-20 rounded-lg border border-border/30 object-contain" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {entry.explanation && (
                                    <div className="text-[15px] sm:text-base bg-muted/50 rounded-lg p-3.5 sm:p-4 border border-border/30">
                                      <div className="flex items-start gap-2.5">
                                        <span className="text-lg">💡</span>
                                        <div>
                                          <strong className="text-foreground">ব্যাখ্যা:</strong>
                                          <p className="mt-1.5 leading-[1.7] text-muted-foreground">
                                            <MathText text={entry.explanation} />
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {chatQuestion && (
        <QuestionChatModal
          isOpen={!!chatQuestion}
          onClose={() => setChatQuestion(null)}
          questionContext={chatQuestion}
        />
      )}
    </div>
  );
};

export default WrongAnswersBank;
