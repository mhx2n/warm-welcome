import { useEffect, useState } from "react";
import { useExams, useSections, useDeleteExam, useUpdateExamField, useUpsertExam } from "@/hooks/useSupabaseData";
import { Exam, Question } from "@/lib/types";
import { Eye, EyeOff, Trash2, FolderOpen, Pencil, Lock, BookOpen, X, Check, Layers, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuestionEditor from "@/components/QuestionEditor";
import ExamPdfExporter from "@/components/ExamPdfExporter";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminExams = () => {
  const { data: exams = [], isLoading } = useExams();
  const { data: sections = [] } = useSections();
  const deleteExamMut = useDeleteExam();
  const updateFieldMut = useUpdateExamField();
  const upsertExam = useUpsertExam();
  const { toast } = useToast();
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingMandatory, setEditingMandatory] = useState<string | null>(null);
  const [editingRanges, setEditingRanges] = useState<string | null>(null);
  const [pdfExam, setPdfExam] = useState<Exam | null>(null);
  const [rangeInputs, setRangeInputs] = useState<Record<string, { from: number; to: number; subject: string }[]>>({});
  const [premiumExam, setPremiumExam] = useState<Exam | null>(null);
  const [premiumBatches, setPremiumBatches] = useState<{ id: string; name: string }[]>([]);
  const [examPremiumMap, setExamPremiumMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      const [{ data: pb }, { data: epb }] = await Promise.all([
        supabase.from("premium_batches").select("id,name").order("name"),
        supabase.from("exam_premium_batches").select("exam_id,premium_batch_id"),
      ]);
      setPremiumBatches((pb || []) as any);
      const m: Record<string, string[]> = {};
      (epb || []).forEach((r: any) => {
        m[r.exam_id] = [...(m[r.exam_id] || []), r.premium_batch_id];
      });
      setExamPremiumMap(m);
    })();
  }, [premiumExam?.id]);

  const togglePremiumBatchOnExam = async (examId: string, batchId: string) => {
    const current = examPremiumMap[examId] || [];
    if (current.includes(batchId)) {
      await supabase.from("exam_premium_batches").delete().eq("exam_id", examId).eq("premium_batch_id", batchId);
      setExamPremiumMap((m) => ({ ...m, [examId]: (m[examId] || []).filter((x) => x !== batchId) }));
    } else {
      await supabase.from("exam_premium_batches").insert({ exam_id: examId, premium_batch_id: batchId });
      setExamPremiumMap((m) => ({ ...m, [examId]: [...(m[examId] || []), batchId] }));
    }
  };

  const sorted = [...exams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const togglePublish = (examId: string, current: boolean) => {
    updateFieldMut.mutate({ id: examId, field: "published", value: !current }, {
      onSuccess: () => toast({ title: current ? "অপ্রকাশিত হয়েছে" : "প্রকাশিত হয়েছে" }),
    });
  };

  const deleteExam = (examId: string) => {
    deleteExamMut.mutate(examId, {
      onSuccess: () => toast({ title: "পরীক্ষা মুছে ফেলা হয়েছে" }),
    });
  };

  const assignSection = (examId: string, sectionId: string) => {
    updateFieldMut.mutate({ id: examId, field: "sectionId", value: sectionId || null }, {
      onSuccess: () => toast({ title: "সেকশন আপডেট হয়েছে" }),
    });
  };

  const getExamSubjects = (exam: Exam) => {
    return [...new Set(exam.questions.map((q) => q.section).filter(Boolean))];
  };

  const toggleMandatorySubject = (exam: Exam, subject: string) => {
    const current = exam.mandatorySubjects || [];
    const updated = current.includes(subject)
      ? current.filter((s) => s !== subject)
      : [...current, subject];
    
    const updatedExam = { ...exam, mandatorySubjects: updated };
    upsertExam.mutate(updatedExam, {
      onSuccess: () => toast({ title: "বাধ্যতামূলক বিষয় আপডেট হয়েছে" }),
    });
  };

  // Initialize range inputs from existing question sections
  const initRangeInputs = (exam: Exam) => {
    const subjects = [...new Set(exam.questions.map((q) => q.section).filter(Boolean))];
    const ranges: { from: number; to: number; subject: string }[] = [];
    
    // Detect existing ranges
    let currentSubject = "";
    let rangeStart = 0;
    exam.questions.forEach((q, i) => {
      if (q.section !== currentSubject) {
        if (currentSubject && i > 0) {
          ranges.push({ from: rangeStart + 1, to: i, subject: currentSubject });
        }
        currentSubject = q.section;
        rangeStart = i;
      }
    });
    if (currentSubject) {
      ranges.push({ from: rangeStart + 1, to: exam.questions.length, subject: currentSubject });
    }
    
    if (ranges.length === 0) {
      ranges.push({ from: 1, to: exam.questions.length, subject: "" });
    }
    
    setRangeInputs((prev) => ({ ...prev, [exam.id]: ranges }));
  };

  const addRange = (examId: string) => {
    setRangeInputs((prev) => ({
      ...prev,
      [examId]: [...(prev[examId] || []), { from: 1, to: 1, subject: "" }],
    }));
  };

  const removeRange = (examId: string, idx: number) => {
    setRangeInputs((prev) => ({
      ...prev,
      [examId]: (prev[examId] || []).filter((_, i) => i !== idx),
    }));
  };

  const updateRange = (examId: string, idx: number, field: string, value: string | number) => {
    setRangeInputs((prev) => ({
      ...prev,
      [examId]: (prev[examId] || []).map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
  };

  const applyRanges = (exam: Exam) => {
    const ranges = rangeInputs[exam.id] || [];
    if (ranges.length === 0) return;

    // Validate ranges
    for (const r of ranges) {
      if (!r.subject.trim()) {
        toast({ title: "ত্রুটি", description: "সব রেঞ্জে বিষয়ের নাম দিন", variant: "destructive" });
        return;
      }
      if (r.from < 1 || r.to > exam.questions.length || r.from > r.to) {
        toast({ title: "ত্রুটি", description: `রেঞ্জ ${r.from}-${r.to} সঠিক নয় (মোট ${exam.questions.length} প্রশ্ন)`, variant: "destructive" });
        return;
      }
    }

    const updatedQuestions = [...exam.questions];
    ranges.forEach((r) => {
      for (let i = r.from - 1; i < r.to && i < updatedQuestions.length; i++) {
        updatedQuestions[i] = { ...updatedQuestions[i], section: r.subject.trim() };
      }
    });

    const updatedExam = { ...exam, questions: updatedQuestions };
    upsertExam.mutate(updatedExam, {
      onSuccess: () => {
        toast({ title: "বিষয় রেঞ্জ আপডেট হয়েছে!" });
        setEditingRanges(null);
      },
    });
  };

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5">📝 পরীক্ষা ব্যবস্থাপনা</h1>

      {sorted.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-muted-foreground">কোনো পরীক্ষা নেই</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((e) => {
            const section = sections.find((s) => s.id === e.sectionId);
            const examSubjects = getExamSubjects(e);
            const hasMultipleSubjects = examSubjects.length > 1;
            const isEditingMandatory = editingMandatory === e.id;

            return (
              <div key={e.id} className="glass-card-static p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {e.subject} • {e.questionCount} প্রশ্ন • {e.createdAt}
                      {section && <span className="text-primary"> • 📂 {section.name}</span>}
                    </p>
                    {hasMultipleSubjects && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {examSubjects.map((s) => (
                          <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full ${
                            (e.mandatorySubjects || []).includes(s) 
                              ? "bg-primary/15 text-primary font-medium" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {(e.mandatorySubjects || []).includes(s) && "🔒 "}{s} ({e.questions.filter((q) => q.section === s).length})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {e.published ? "প্রকাশিত" : "অপ্রকাশিত"}
                  </span>
                  <button onClick={() => {
                    if (editingRanges === e.id) { setEditingRanges(null); } 
                    else { setEditingRanges(e.id); initRangeInputs(e); }
                  }} className="p-2 rounded-lg hover:bg-accent/10 transition-colors" title="বিষয় রেঞ্জ">
                    <Layers size={16} className={editingRanges === e.id ? "text-primary" : "text-muted-foreground"} />
                  </button>
                  {hasMultipleSubjects && (
                    <button onClick={() => setEditingMandatory(isEditingMandatory ? null : e.id)} className="p-2 rounded-lg hover:bg-accent/10 transition-colors" title="বাধ্যতামূলক বিষয়">
                      <Lock size={16} className={isEditingMandatory ? "text-primary" : "text-muted-foreground"} />
                    </button>
                  )}
                  <button onClick={() => setEditingExam(e)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors" title="প্রশ্ন সম্পাদনা">
                    <Pencil size={16} className="text-primary" />
                  </button>
                  <button onClick={() => setPdfExam(e)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors" title="PDF এক্সপোর্ট">
                    <FileDown size={16} className="text-primary" />
                  </button>
                  <button onClick={() => setPremiumExam(premiumExam?.id === e.id ? null : e)} className="p-2 rounded-lg hover:bg-warning/10 transition-colors" title="প্রিমিয়াম ব্যাচ অ্যাক্সেস">
                    <Crown size={16} className={(examPremiumMap[e.id]?.length || 0) > 0 ? "text-warning" : "text-muted-foreground"} />
                  </button>
                  <button onClick={() => togglePublish(e.id, e.published)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    {e.published ? <Eye size={16} className="text-success" /> : <EyeOff size={16} className="text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteExam(e.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>

                {/* Mandatory subject editor */}
                {isEditingMandatory && hasMultipleSubjects && (
                  <div className="mt-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
                    <p className="text-xs font-semibold mb-2">🔒 বাধ্যতামূলক বিষয় নির্বাচন করুন:</p>
                    <div className="flex flex-wrap gap-2">
                      {examSubjects.map((s) => {
                        const isMandatory = (e.mandatorySubjects || []).includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => toggleMandatorySubject(e, s)}
                            className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${
                              isMandatory
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {isMandatory ? <Check size={12} /> : <X size={12} />}
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">বাধ্যতামূলক বিষয়গুলো স্টুডেন্টরা বাদ দিতে পারবে না</p>
                  </div>
                )}

                {/* Subject range editor */}
                {editingRanges === e.id && (
                  <div className="mt-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
                    <p className="text-xs font-semibold mb-2">📐 প্রশ্ন সিরিয়াল অনুযায়ী বিষয় ভাগ করুন (মোট {e.questions.length} প্রশ্ন)</p>
                    <div className="space-y-2">
                      {(rangeInputs[e.id] || []).map((r, ri) => (
                        <div key={ri} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="number" min={1} max={e.questions.length}
                            value={r.from}
                            onChange={(ev) => updateRange(e.id, ri, "from", Number(ev.target.value))}
                            className="w-16 glass-strong rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                            placeholder="থেকে"
                          />
                          <span className="text-xs text-muted-foreground">থেকে</span>
                          <input
                            type="number" min={1} max={e.questions.length}
                            value={r.to}
                            onChange={(ev) => updateRange(e.id, ri, "to", Number(ev.target.value))}
                            className="w-16 glass-strong rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                            placeholder="পর্যন্ত"
                          />
                          <span className="text-xs text-muted-foreground">→</span>
                          <input
                            value={r.subject}
                            onChange={(ev) => updateRange(e.id, ri, "subject", ev.target.value)}
                            className="flex-1 min-w-[100px] glass-strong rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            placeholder="বিষয়ের নাম"
                          />
                          <button onClick={() => removeRange(e.id, ri)} className="p-1 rounded hover:bg-destructive/10">
                            <X size={14} className="text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => addRange(e.id)} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-all">
                        + রেঞ্জ যোগ করুন
                      </button>
                      <button onClick={() => applyRanges(e)} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                        ✓ প্রয়োগ করুন
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      উদাহরণ: ১-৩০ → পদার্থ, ৩১-৬০ → রসায়ন, ৬১-৯০ → জীববিজ্ঞান
                    </p>
                  </div>
                )}

                {sections.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <FolderOpen size={14} className="text-muted-foreground" />
                    <select
                      value={e.sectionId || ""}
                      onChange={(ev) => assignSection(e.id, ev.target.value)}
                      className="text-xs glass-strong rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="">সেকশন নেই</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {premiumExam?.id === e.id && (
                  <div className="mt-3 p-3 bg-warning/5 rounded-xl border border-warning/20">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Crown size={12} className="text-warning" /> প্রিমিয়াম ব্যাচ অ্যাক্সেস</p>
                    <p className="text-[11px] text-muted-foreground mb-2">কোনো ব্যাচ সিলেক্ট না করলে সবাই দেখবে। সিলেক্ট করলে শুধু সেই ব্যাচের সদস্যরাই এই পরীক্ষা দিতে পারবে।</p>
                    {premiumBatches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">আগে "প্রিমিয়াম ব্যাচ" পেজ থেকে ব্যাচ তৈরি করুন।</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {premiumBatches.map((b) => {
                          const on = (examPremiumMap[e.id] || []).includes(b.id);
                          return (
                            <button key={b.id} onClick={() => togglePremiumBatchOnExam(e.id, b.id)}
                              className={`text-xs px-3 py-1 rounded-full transition ${on ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                              {on && <Check size={10} className="inline mr-1" />}{b.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingExam && (
        <QuestionEditor exam={editingExam} onClose={() => setEditingExam(null)} onSaved={() => setEditingExam(null)} />
      )}
      {pdfExam && (
        <ExamPdfExporter exam={pdfExam} open={!!pdfExam} onClose={() => setPdfExam(null)} />
      )}
    </div>
  );
};

export default AdminExams;
