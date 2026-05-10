import { useState } from "react";
import { createPortal } from "react-dom";
import { Question, Exam } from "@/lib/types";
import { useUpsertExam } from "@/hooks/useSupabaseData";
import { compressImage } from "@/lib/imageUtils";
import { X, ImagePlus, Save, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  exam: Exam;
  onClose: () => void;
  onSaved: (exam: Exam) => void;
}

const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

const QuestionEditor = ({ exam, onClose, onSaved }: Props) => {
  const [questions, setQuestions] = useState<Question[]>(JSON.parse(JSON.stringify(exam.questions)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const upsertExam = useUpsertExam();
  const { toast } = useToast();

  const updateQ = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const addNewQuestion = () => {
    const newQ: Question = {
      id: generateId(),
      question: "",
      options: ["", "", "", ""],
      answer: "",
      explanation: "",
      type: "mcq",
      section: "",
    };
    setQuestions((prev) => [...prev, newQ]);
    setExpandedId(newQ.id);
    toast({ title: "✅ নতুন প্রশ্ন যোগ হয়েছে" });
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ title: "🗑️ প্রশ্ন মুছে ফেলা হয়েছে" });
  };

  const handleQuestionImage = async (qId: string, file: File) => {
    try {
      const compressed = await compressImage(file);
      updateQ(qId, { questionImage: compressed });
    } catch {
      toast({ title: "ছবি লোড করতে সমস্যা", variant: "destructive" });
    }
  };

  const handleOptionImage = async (qId: string, optIndex: number, file: File) => {
    try {
      const compressed = await compressImage(file, 400, 300, 0.5);
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== qId) return q;
          const imgs = [...(q.optionImages || q.options.map(() => null))];
          imgs[optIndex] = compressed;
          return { ...q, optionImages: imgs };
        })
      );
    } catch {
      toast({ title: "ছবি লোড করতে সমস্যা", variant: "destructive" });
    }
  };

  const removeQuestionImage = (qId: string) => updateQ(qId, { questionImage: undefined });

  const removeOptionImage = (qId: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const imgs = [...(q.optionImages || q.options.map(() => null))];
        imgs[optIndex] = null;
        return { ...q, optionImages: imgs };
      })
    );
  };

  const saveAll = () => {
    const updatedExam = { ...exam, questions, questionCount: questions.length };
    upsertExam.mutate(updatedExam, {
      onSuccess: () => {
        onSaved(updatedExam);
        toast({ title: "✅ প্রশ্ন সংরক্ষিত হয়েছে" });
      },
      onError: () => toast({ title: "সংরক্ষণে সমস্যা হয়েছে", variant: "destructive" }),
    });
  };

  const content = (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex flex-col">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg">✏️ প্রশ্ন সম্পাদনা</h2>
            <p className="text-sm text-muted-foreground">
              {exam.title} • {questions.length} প্রশ্ন
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addNewQuestion}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/80 transition-all"
            >
              <Plus size={16} /> প্রশ্ন যোগ
            </button>
            <button
              onClick={saveAll}
              disabled={upsertExam.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Save size={16} /> {upsertExam.isPending ? "সেভ হচ্ছে..." : "সংরক্ষণ"}
            </button>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-muted transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-5 space-y-4 max-w-4xl mx-auto w-full">
          {questions.map((q, qi) => {
            const isOpen = expandedId === q.id;
            return (
              <div key={q.id} className="border border-border rounded-2xl overflow-hidden bg-card">
                <button
                  onClick={() => setExpandedId(isOpen ? null : q.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/50 transition-colors"
                >
                  <span
                    className="text-sm sm:text-base font-medium flex-1"
                    style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    <span className="text-muted-foreground mr-2 font-bold">{qi + 1}.</span>
                    {q.question || <span className="text-muted-foreground italic">নতুন প্রশ্ন...</span>}
                  </span>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {q.answer && <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">✓</span>}
                    {q.questionImage && <span className="text-sm">🖼️</span>}
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 space-y-5 animate-fade-in">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">📝 প্রশ্ন</label>
                      <textarea
                        value={q.question}
                        onChange={(e) => updateQ(q.id, { question: e.target.value })}
                        placeholder="এখানে প্রশ্ন লিখুন... (LaTeX সাপোর্ট: $x^2$, \(x^2\))"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">📂 বিষয়/সেকশন</label>
                      <input
                        value={q.section}
                        onChange={(e) => updateQ(q.id, { section: e.target.value })}
                        placeholder="যেমন: পদার্থবিজ্ঞান, রসায়ন..."
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">🖼️ প্রশ্নের ছবি</label>
                      {q.questionImage ? (
                        <div className="relative inline-block">
                          <img src={q.questionImage} alt="" className="max-w-full max-h-56 rounded-xl border border-border" />
                          <button
                            onClick={() => removeQuestionImage(q.id)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground shadow-lg"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                          <div className="flex items-center gap-3">
                            <ImagePlus size={24} />
                            <span>ছবি যোগ করতে ট্যাপ করুন</span>
                          </div>
                          <span className="text-[10px] opacity-60">(সেরা সাইজ: 600×400px)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleQuestionImage(q.id, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-foreground block">📋 অপশনসমূহ (সঠিক উত্তর সিলেক্ট করুন)</label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`p-4 rounded-xl border-2 transition-all ${opt === q.answer && opt !== "" ? "border-success/60 bg-success/5 ring-1 ring-success/20" : "border-border"}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`w-9 h-9 rounded-full text-sm flex items-center justify-center font-bold flex-shrink-0 ${opt === q.answer && opt !== "" ? "bg-success/20 text-success" : "bg-muted"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <input
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...q.options];
                                const wasAnswer = q.answer === opt;
                                newOpts[oi] = e.target.value;
                                updateQ(q.id, { options: newOpts, ...(wasAnswer ? { answer: e.target.value } : {}) });
                              }}
                              placeholder={`অপশন ${String.fromCharCode(65 + oi)} লিখুন...`}
                              className="flex-1 bg-transparent text-base font-medium focus:outline-none border-b border-transparent focus:border-primary/30 pb-1"
                            />
                          </div>
                          <div className="flex items-center gap-3 ml-12">
                            <button
                              onClick={() => updateQ(q.id, { answer: opt })}
                              className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all ${
                                opt === q.answer && opt !== "" ? "bg-success/20 text-success ring-1 ring-success/30" : "bg-muted text-muted-foreground hover:bg-success/10 hover:text-success"
                              }`}
                            >
                              {opt === q.answer && opt !== "" ? "✅ সঠিক উত্তর" : "সঠিক করুন"}
                            </button>
                            {q.optionImages?.[oi] ? (
                              <div className="relative inline-block">
                                <img src={q.optionImages[oi]!} alt="" className="max-h-32 rounded-lg border border-border" />
                                <button
                                  onClick={() => removeOptionImage(q.id, oi)}
                                  className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-primary transition-all">
                                <ImagePlus size={16} />
                                <span>ছবি যোগ</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => e.target.files?.[0] && handleOptionImage(q.id, oi, e.target.files[0])}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">💡 ব্যাখ্যা</label>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => updateQ(q.id, { explanation: e.target.value })}
                        placeholder="উত্তরের ব্যাখ্যা লিখুন..."
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base min-h-[70px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="pt-2 border-t border-border">
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 size={16} /> এই প্রশ্ন মুছুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add question button at bottom */}
          <button
            onClick={addNewQuestion}
            className="w-full flex items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus size={20} />
            <span className="font-semibold">নতুন প্রশ্ন যোগ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
};

export default QuestionEditor;
