import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useExamById, useAddResult } from "@/hooks/useSupabaseData";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ExamResult, SubjectBreakdown } from "@/lib/types";
import { List, X, Clock, AlertTriangle } from "lucide-react";
import { isAnswerMatch, resolveCorrectOptionText } from "@/lib/answerUtils";
import MathText from "@/components/MathText";
import { supabase } from "@/integrations/supabase/client";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const StudentExamAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: exam, isLoading } = useExamById(id);
  const addResult = useAddResult();

  const selectedSubjects: string[] | undefined = (location.state as any)?.selectedSubjects;

  const originalQuestions = useMemo(() => {
    if (!exam) return [];
    if (selectedSubjects && selectedSubjects.length > 0) {
      return exam.questions.filter((q) => selectedSubjects.includes(q.section));
    }
    return exam.questions;
  }, [exam, selectedSubjects]);

  const questions = useMemo(() => {
    if (!originalQuestions.length) return [];
    const subjects = [...new Set(originalQuestions.map((q) => q.section).filter(Boolean))];
    if (subjects.length <= 1) {
      return shuffle(originalQuestions.map((q) => ({ ...q })));
    }

    const result: typeof originalQuestions = [];
    subjects.forEach((s) => {
      const subjectQs = originalQuestions
        .filter((q) => q.section === s)
        .map((q) => ({ ...q }));
      result.push(...shuffle(subjectQs));
    });

    const noSection = originalQuestions
      .filter((q) => !q.section)
      .map((q) => ({ ...q }));
    if (noSection.length) result.push(...shuffle(noSection));

    return result;
  }, [exam?.id, originalQuestions]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState((exam?.duration || 10) * 60);
  const [showPalette, setShowPalette] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const negativeMarking = exam?.negativeMarking ?? 0.25;

  const currentSubjects = useMemo(() => {
    return [...new Set(questions.map((q) => q.section).filter(Boolean))];
  }, [questions]);

  useEffect(() => {
    if (exam) setTimeLeft(exam.duration * 60);
  }, [exam?.id, exam]);

  const doSubmit = useCallback(async () => {
    if (submitted || !exam) return;
    setSubmitted(true);

    try {
      const currentAnswers = answersRef.current;
      let correct = 0,
        wrong = 0,
        skipped = 0;

      const subjectStats: Record<
        string,
        { total: number; correct: number; wrong: number; skipped: number }
      > = {};

      currentSubjects.forEach((s) => {
        subjectStats[s] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
      });

      questions.forEach((question) => {
        const userAnswer = currentAnswers[question.id];
        const originalQ = originalQuestions.find((oq) => oq.id === question.id);
        if (!originalQ) return;

        const correctOptionText = resolveCorrectOptionText(originalQ);
        const subj = question.section || "অন্যান্য";

        if (!subjectStats[subj]) {
          subjectStats[subj] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
        }

        subjectStats[subj].total++;

        if (!userAnswer) {
          skipped++;
          subjectStats[subj].skipped++;
        } else if (isAnswerMatch(userAnswer, correctOptionText)) {
          correct++;
          subjectStats[subj].correct++;
        } else {
          wrong++;
          subjectStats[subj].wrong++;
        }
      });

      const negativeMarks = wrong * negativeMarking;
      const rawScore = correct - negativeMarks;
      const finalScore = Math.max(0, rawScore);
      const maxScore = questions.length;
      const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

      const subjectBreakdown: SubjectBreakdown[] = Object.entries(subjectStats).map(
        ([subject, stats]) => {
          const subNeg = stats.wrong * negativeMarking;
          const subScore = Math.max(0, stats.correct - subNeg);

          return {
            subject,
            total: stats.total,
            correct: stats.correct,
            wrong: stats.wrong,
            skipped: stats.skipped,
            negativeMarks: subNeg,
            score: subScore,
            maxScore: stats.total,
            percentage: stats.total > 0 ? Math.round((subScore / stats.total) * 100) : 0,
          };
        }
      );

      const result: ExamResult = {
        examId: exam.id,
        examTitle: exam.title,
        totalQuestions: questions.length,
        correct,
        wrong,
        skipped,
        negativeMarks,
        finalScore,
        maxScore,
        percentage,
        answers: currentAnswers,
        timestamp: new Date().toISOString(),
        selectedSubjects: selectedSubjects || currentSubjects,
        subjectBreakdown,
      };

      addResult.mutate(result);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let attemptRow: { id: string } | null = null;

        if (user) {
          const { data, error: attemptError } = await (supabase as any)
            .from("exam_attempts")
            .insert({
              user_id: user.id,
              exam_id: exam.id,
              score: Math.round(finalScore),
              total_questions: questions.length,
              correct_answers: correct,
              wrong_answers: wrong,
            })
            .select("id")
            .single();

          if (attemptError) {
            throw attemptError;
          }

          attemptRow = data;

          if (attemptRow) {
            const answersPayload = questions.map((question) => {
              const originalQ = originalQuestions.find((oq) => oq.id === question.id);
              const correctOptionText = originalQ ? resolveCorrectOptionText(originalQ) : "";
              const userAnswer = currentAnswers[question.id] || "";

              return {
                attempt_id: attemptRow!.id,
                question_id: question.id,
                selected_answer: userAnswer,
                correct_answer: correctOptionText,
                is_correct: !!userAnswer && isAnswerMatch(userAnswer, correctOptionText),
              };
            });

            const { error: answersError } = await (supabase as any)
              .from("exam_answers")
              .insert(answersPayload);

            if (answersError) {
              throw answersError;
            }
          }
        }
      } catch (syncError) {
        console.warn("Optional attempt sync skipped:", syncError);
      }

      navigate("/results", { state: { result, questions, originalQuestions } });
    } catch (error: any) {
      console.error("Exam submit failed:", error);
      alert(error?.message || "Submit failed");
      setSubmitted(false);
    }
  }, [
    submitted,
    exam,
    questions,
    originalQuestions,
    negativeMarking,
    navigate,
    addResult,
    currentSubjects,
    selectedSubjects,
  ]);

  const submittedRef = useRef(false);
  submittedRef.current = submitted;
  const doSubmitRef = useRef(doSubmit);
  doSubmitRef.current = doSubmit;

  useEffect(() => {
    if (submittedRef.current) return;

    const t = setInterval(() => {
      if (submittedRef.current) {
        clearInterval(t);
        return;
      }

      setTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(t);
          setTimeout(() => {
            void doSubmitRef.current();
          }, 0);
          return 0;
        }
        return p - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, []);

  const scrollToQuestion = useCallback((index: number) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setShowPalette(false);
  }, []);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">লোড হচ্ছে...</div>;
  if (!exam) return <div className="text-center py-20 text-muted-foreground">পরীক্ষা পাওয়া যায়নি</div>;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const selectAnswer = (qId: string, opt: string) => {
    if (answers[qId]) return;
    setAnswers((prev) => ({ ...prev, [qId]: opt }));
  };

  const subjectGroupedQuestions =
    currentSubjects.length > 1
      ? currentSubjects.map((s) => ({
          subject: s,
          questions: questions
            .map((q, i) => ({ ...q, globalIndex: i }))
            .filter((q) => q.section === s),
        }))
      : null;

  return (
    <div className="pt-24 pb-24 container max-w-3xl mx-auto animate-fade-in relative">
      {createPortal(
        <div
          style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg font-mono text-sm font-bold transition-all ${
            timeLeft < 60
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : timeLeft < 300
              ? "bg-warning text-warning-foreground"
              : "bg-card border border-border"
          }`}
        >
          <Clock size={16} />
          {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
        </div>,
        document.body
      )}

      <div className="glass-card-static p-4 mb-4">
        <h2 className="font-semibold text-sm truncate">{exam.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          মোট: {questions.length} প্রশ্ন • উত্তর দেওয়া: {answeredCount} • নেগেটিভ মার্ক:{" "}
          {negativeMarking}
          {currentSubjects.length > 1 && ` • ${currentSubjects.length}টি বিষয়`}
        </p>
      </div>

      {currentSubjects.length > 1 ? (
        <div className="space-y-6">
          {currentSubjects.map((subject) => {
            const subjectQs = questions.filter((q) => q.section === subject);

            return (
              <div key={subject}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                    📘 {subject} ({subjectQs.length} প্রশ্ন)
                  </span>
                </div>

                <div className="space-y-4">
                  {subjectQs.map((q) => {
                    const globalIdx = questions.indexOf(q);

                    return (
                      <div
                        key={q.id}
                        ref={(el) => {
                          questionRefs.current[globalIdx] = el;
                        }}
                        className="glass-card-static p-5"
                      >
                        <p className="text-xs text-muted-foreground mb-2">
                          প্রশ্ন {globalIdx + 1} / {questions.length}
                        </p>
                        <h3 className="text-base font-semibold mb-2">
                          <MathText text={q.question} />
                        </h3>

                        {q.questionImage && (
                          <img
                            src={q.questionImage}
                            alt=""
                            className="max-w-full max-h-60 rounded-lg border border-border mb-4 object-contain"
                          />
                        )}

                        <div className="space-y-2.5">
                          {q.options.map((opt, oi) => (
                            <button
                              key={oi}
                              onClick={() => selectAnswer(q.id, opt)}
                              disabled={!!answers[q.id]}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                answers[q.id] === opt
                                  ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30"
                                  : answers[q.id]
                                  ? "border-border opacity-50 cursor-not-allowed"
                                  : "border-border hover:border-primary/30 hover:bg-primary/5"
                              }`}
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs mr-3 flex-shrink-0">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="flex-1">
                                <MathText text={opt} />
                              </span>
                              {q.optionImages?.[oi] && (
                                <img
                                  src={q.optionImages[oi]!}
                                  alt=""
                                  className="mt-2 max-h-24 rounded-lg border border-border object-contain"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[i] = el;
              }}
              className="glass-card-static p-5"
            >
              <p className="text-xs text-muted-foreground mb-2">
                প্রশ্ন {i + 1} / {questions.length}
              </p>
              <h3 className="text-base font-semibold mb-2">
                <MathText text={q.question} />
              </h3>

              {q.questionImage && (
                <img
                  src={q.questionImage}
                  alt=""
                  className="max-w-full max-h-60 rounded-lg border border-border mb-4 object-contain"
                />
              )}

              <div className="space-y-2.5">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => selectAnswer(q.id, opt)}
                    disabled={!!answers[q.id]}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                      answers[q.id] === opt
                        ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30"
                        : answers[q.id]
                        ? "border-border opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs mr-3 flex-shrink-0">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">
                      <MathText text={opt} />
                    </span>
                    {q.optionImages?.[oi] && (
                      <img
                        src={q.optionImages[oi]!}
                        alt=""
                        className="mt-2 max-h-24 rounded-lg border border-border object-contain"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {createPortal(
        <div
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998 }}
          className="bg-card/90 backdrop-blur-2xl border-t border-border p-3"
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 transition-all"
            >
              <List size={16} /> প্রশ্ন তালিকা
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              জমা দিন ✓
            </button>
          </div>
        </div>,
        document.body
      )}

      {showPalette &&
        createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10000 }}
            className="flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            onClick={() => setShowPalette(false)}
          >
            <div
              className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border animate-fade-in max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">📋 প্রশ্ন তালিকা</h3>
                <button
                  onClick={() => setShowPalette(false)}
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X size={18} />
                </button>
              </div>

              {subjectGroupedQuestions ? (
                <div className="space-y-4 mb-4">
                  {subjectGroupedQuestions.map(({ subject, questions: sqs }) => (
                    <div key={subject}>
                      <p className="text-xs font-semibold text-primary mb-2">📘 {subject}</p>
                      <div className="grid grid-cols-5 gap-2">
                        {sqs.map((q) => (
                          <button
                            key={q.globalIndex}
                            onClick={() => scrollToQuestion(q.globalIndex)}
                            className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                              answers[q.id]
                                ? "bg-success/20 text-success border border-success/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {q.globalIndex + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToQuestion(i)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                        answers[q.id]
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-success/20 border border-success/30" />
                  উত্তর দেওয়া
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-muted" />
                  বাকি
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showConfirm &&
        createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10000 }}
            className="flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-warning" />
                <h3 className="font-semibold text-sm">পরীক্ষা জমা দিন</h3>
              </div>

              <div className="space-y-2 mb-5 text-sm">
                <div className="flex justify-between p-2 rounded-lg bg-muted">
                  <span className="text-muted-foreground">মোট প্রশ্ন</span>
                  <span className="font-semibold">{questions.length}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-success/10">
                  <span className="text-success">উত্তর দেওয়া</span>
                  <span className="font-semibold text-success">{answeredCount}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-destructive/10">
                  <span className="text-destructive">বাকি আছে</span>
                  <span className="font-semibold text-destructive">{unansweredCount}</span>
                </div>
                {currentSubjects.length > 1 && (
                  <div className="flex justify-between p-2 rounded-lg bg-accent/10">
                    <span className="text-muted-foreground">বিষয় সংখ্যা</span>
                    <span className="font-semibold">{currentSubjects.length}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-all"
                >
                  ফিরে যান
                </button>
                <button
                  onClick={() => void doSubmit()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  জমা দিন ✓
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default StudentExamAttempt;
