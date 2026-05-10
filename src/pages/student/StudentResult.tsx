import { useLocation, Link } from "react-router-dom";
import { ExamResult, Question, SubjectBreakdown } from "@/lib/types";
import { CheckCircle2, XCircle, MinusCircle, RotateCcw, AlertTriangle, BookOpen } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { useResults } from "@/hooks/useSupabaseData";
import { isAnswerMatch, resolveCorrectOptionText } from "@/lib/answerUtils";
import MathText from "@/components/MathText";
import { saveWrongAnswers, WrongAnswerEntry } from "@/lib/api";

const StudentResult = () => {
  const location = useLocation();
  const { result, questions, originalQuestions } = (location.state || {}) as {
    result?: ExamResult;
    questions?: Question[];
    originalQuestions?: Question[];
  };
  const [activeTab, setActiveTab] = useState<"wrong" | "correct" | "skipped">("wrong");

  const originalQuestionMap = useMemo(
    () => new Map((originalQuestions ?? []).map((q) => [q.id, q])),
    [originalQuestions]
  );

  const { data: allResults = [] } = useResults();

  // Categorize questions
  const { wrongQs, correctQs, skippedQs } = useMemo(() => {
    if (!questions || !result) return { wrongQs: [] as Question[], correctQs: [] as Question[], skippedQs: [] as Question[] };
    const wrong: Question[] = [];
    const correct: Question[] = [];
    const skipped: Question[] = [];
    questions.forEach((q) => {
      const userAns = result.answers[q.id] || "";
      const sourceQ = originalQuestionMap.get(q.id) ?? q;
      const correctAnswer = resolveCorrectOptionText(sourceQ);
      if (!userAns) skipped.push(q);
      else if (isAnswerMatch(userAns, correctAnswer)) correct.push(q);
      else wrong.push(q);
    });
    return { wrongQs: wrong, correctQs: correct, skippedQs: skipped };
  }, [questions, result, originalQuestionMap]);

  // Save wrong answers to bank
  useEffect(() => {
    if (!result || !questions || wrongQs.length === 0) return;
    const entries: WrongAnswerEntry[] = wrongQs.map((q) => {
      const sourceQ = originalQuestionMap.get(q.id) ?? q;
      return {
        sessionId: "",
        examId: result.examId,
        examTitle: result.examTitle,
        questionId: q.id,
        questionText: q.question,
        questionImage: q.questionImage,
        options: q.options,
        optionImages: q.optionImages,
        correctAnswer: resolveCorrectOptionText(sourceQ),
        userAnswer: result.answers[q.id] || "",
        explanation: q.explanation,
        section: q.section || "",
      };
    });
    saveWrongAnswers(entries).catch(console.error);
  }, [result, questions, wrongQs, originalQuestionMap]);

  if (!result) {
    return (
      <div className="pt-24 pb-8 container animate-fade-in">
        <h1 className="text-xl font-bold mb-5">📊 ফলাফল ইতিহাস</h1>
        {allResults.length === 0 ? (
          <div className="glass-card-static p-12 text-center text-muted-foreground">
            এখনও কোনো পরীক্ষা দেওয়া হয়নি
            <br />
            <Link to="/exams" className="text-primary text-sm mt-2 inline-block">পরীক্ষা দিন →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {allResults.map((r, i) => (
              <div key={i} className="glass-card-static p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{r.examTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    সঠিক: {r.correct} | ভুল: {r.wrong} | বাদ: {r.skipped}
                    {r.negativeMarks > 0 && ` | নেগেটিভ: -${r.negativeMarks.toFixed(2)}`}
                    {" • "}{new Date(r.timestamp).toLocaleDateString("bn-BD")}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${r.percentage >= 60 ? "text-success" : "text-destructive"}`}>{r.percentage}%</span>
                  <Link to={`/exams/${r.examId}`} className="block text-xs text-primary mt-1">আবার দিন →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const getMessage = () => {
    if (result.percentage >= 80) return { text: "অসাধারণ! 🏆", color: "text-success" };
    if (result.percentage >= 60) return { text: "ভালো করেছেন! 👏", color: "text-primary" };
    if (result.percentage >= 40) return { text: "আরও চেষ্টা করুন 💪", color: "text-warning" };
    return { text: "আবার চেষ্টা করুন 📚", color: "text-destructive" };
  };
  const msg = getMessage();

  const subjectBreakdown = result.subjectBreakdown || [];
  const hasSubjectBreakdown = subjectBreakdown.length > 1;

  const tabData = activeTab === "wrong" ? wrongQs : activeTab === "correct" ? correctQs : skippedQs;

  const renderQuestion = (q: Question, i: number) => {
    const userAns = result.answers[q.id] || "";
    const sourceQuestion = originalQuestionMap.get(q.id) ?? q;
    const correctAnswer = resolveCorrectOptionText(sourceQuestion);
    const isSkipped = !userAns;
    const isCorrect = Boolean(userAns) && isAnswerMatch(userAns, correctAnswer);

    return (
      <div key={q.id} className="glass-card-static p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-base font-semibold flex-1">
            <span className="text-muted-foreground mr-2">{i + 1}.</span><MathText text={q.question} />
          </p>
          {q.section && hasSubjectBreakdown && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0">{q.section}</span>
          )}
        </div>
        {q.questionImage && <img src={q.questionImage} alt="" className="max-w-full max-h-48 rounded-lg border border-border mb-3 object-contain" />}
        <div className="space-y-2 mb-3">
          {q.options.map((opt, oi) => {
            const isAnswer = isAnswerMatch(opt, correctAnswer);
            const isUser = Boolean(userAns) && isAnswerMatch(opt, userAns);
            let cls = "border-border";
            if (isAnswer) cls = "border-success bg-success/10";
            else if (isUser && !isCorrect) cls = "border-destructive bg-destructive/10";
            return (
              <div key={opt} className={`px-4 py-3 rounded-lg text-sm border ${cls}`}>
                <div className="flex items-center gap-2">
                  {isAnswer && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
                  {isUser && !isCorrect && <XCircle size={16} className="text-destructive flex-shrink-0" />}
                  <MathText text={opt} className="text-sm" />
                </div>
                {q.optionImages?.[oi] && <img src={q.optionImages[oi]!} alt="" className="mt-2 max-h-24 rounded border border-border object-contain" />}
              </div>
            );
          })}
        </div>
        {q.explanation && <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">💡 <strong>ব্যাখ্যা:</strong> <MathText text={q.explanation} /></div>}
      </div>
    );
  };

  return (
    <div className="pt-24 pb-8 container max-w-2xl mx-auto animate-fade-in">
      {/* Score header */}
      <div className="glass-card-static p-8 text-center mb-6">
        <div className="text-5xl font-extrabold gradient-text mb-2">{result.percentage}%</div>
        <p className={`text-lg font-bold ${msg.color} mb-1`}>{msg.text}</p>
        <p className="text-sm text-muted-foreground">{result.examTitle}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card-static p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1 text-success" size={22} />
          <p className="text-xl font-bold">{result.correct}</p>
          <p className="text-xs text-muted-foreground">সঠিক</p>
        </div>
        <div className="glass-card-static p-4 text-center">
          <XCircle className="mx-auto mb-1 text-destructive" size={22} />
          <p className="text-xl font-bold">{result.wrong}</p>
          <p className="text-xs text-muted-foreground">ভুল</p>
        </div>
        <div className="glass-card-static p-4 text-center">
          <MinusCircle className="mx-auto mb-1 text-muted-foreground" size={22} />
          <p className="text-xl font-bold">{result.skipped}</p>
          <p className="text-xs text-muted-foreground">বাদ</p>
        </div>
        <div className="glass-card-static p-4 text-center">
          <AlertTriangle className="mx-auto mb-1 text-warning" size={22} />
          <p className="text-xl font-bold text-destructive">-{result.negativeMarks.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">নেগেটিভ</p>
        </div>
      </div>

      {/* Subject-wise breakdown */}
      {hasSubjectBreakdown && (
        <div className="glass-card-static p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-primary" /> বিষয়ভিত্তিক ফলাফল
          </h3>
          <div className="space-y-3">
            {subjectBreakdown.map((sb) => (
              <div key={sb.subject} className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{sb.subject}</span>
                  <span className={`text-sm font-bold ${sb.percentage >= 60 ? "text-success" : sb.percentage >= 40 ? "text-warning" : "text-destructive"}`}>
                    {sb.percentage}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${sb.percentage >= 60 ? "bg-success" : sb.percentage >= 40 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${sb.percentage}%` }}
                  />
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>মোট: {sb.total}</span>
                  <span className="text-success">সঠিক: {sb.correct}</span>
                  <span className="text-destructive">ভুল: {sb.wrong}</span>
                  <span>বাদ: {sb.skipped}</span>
                  <span className="text-primary font-medium">স্কোর: {sb.score.toFixed(1)}/{sb.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score analysis */}
      <div className="glass-card-static p-5 mb-6">
        <h3 className="text-sm font-semibold mb-3">📊 স্কোর বিশ্লেষণ</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">সঠিক উত্তর</span><span className="font-medium">+{result.correct}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">নেগেটিভ মার্ক</span><span className="font-medium text-destructive">-{result.negativeMarks.toFixed(2)}</span></div>
          <div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold">চূড়ান্ত স্কোর</span><span className="font-bold text-primary">{result.finalScore.toFixed(2)} / {result.maxScore}</span></div>
        </div>
      </div>

      {/* Review section with tabs */}
      {questions && (
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3">📖 উত্তর পর্যালোচনা</h3>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setActiveTab("wrong")}
              className={`p-3 rounded-xl text-center text-sm font-semibold transition-all ${
                activeTab === "wrong"
                  ? "bg-destructive/15 text-destructive border-2 border-destructive/40"
                  : "glass-card-static hover:bg-muted/60"
              }`}
            >
              <XCircle size={18} className="mx-auto mb-1" />
              ভুল ({wrongQs.length})
            </button>
            <button
              onClick={() => setActiveTab("correct")}
              className={`p-3 rounded-xl text-center text-sm font-semibold transition-all ${
                activeTab === "correct"
                  ? "bg-success/15 text-success border-2 border-success/40"
                  : "glass-card-static hover:bg-muted/60"
              }`}
            >
              <CheckCircle2 size={18} className="mx-auto mb-1" />
              সঠিক ({correctQs.length})
            </button>
            <button
              onClick={() => setActiveTab("skipped")}
              className={`p-3 rounded-xl text-center text-sm font-semibold transition-all ${
                activeTab === "skipped"
                  ? "bg-muted text-muted-foreground border-2 border-border"
                  : "glass-card-static hover:bg-muted/60"
              }`}
            >
              <MinusCircle size={18} className="mx-auto mb-1" />
              স্কিপ ({skippedQs.length})
            </button>
          </div>

          <div className="space-y-3 animate-fade-in">
            {tabData.length === 0 ? (
              <div className="glass-card-static p-8 text-center text-muted-foreground text-sm">
                {activeTab === "wrong" && "কোনো ভুল উত্তর নেই! 🎉"}
                {activeTab === "correct" && "কোনো সঠিক উত্তর নেই"}
                {activeTab === "skipped" && "কোনো স্কিপ করা প্রশ্ন নেই"}
              </div>
            ) : (
              tabData.map((q, i) => renderQuestion(q, i))
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <Link to={`/exams/${result.examId}`} className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
          <RotateCcw size={16} /> আবার চেষ্টা করুন
        </Link>
        <Link to="/exams" className="flex-1 inline-flex items-center justify-center text-sm text-center font-semibold rounded-xl px-4 py-3 glass hover:bg-muted/80 transition-all">অন্য পরীক্ষা</Link>
      </div>
    </div>
  );
};

export default StudentResult;
