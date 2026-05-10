import { Exam } from "@/lib/types";
import { Link } from "react-router-dom";
import { Clock, HelpCircle } from "lucide-react";
import { getLabel } from "@/lib/labels";

const difficultyConfig = {
  easy: { labelKey: "diffEasy", fallback: "সহজ", className: "bg-success/15 text-success dark:bg-success/20 dark:text-success" },
  medium: { labelKey: "diffMedium", fallback: "মাঝারি", className: "bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning" },
  hard: { labelKey: "diffHard", fallback: "কঠিন", className: "bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive" },
};

const ExamCard = ({ exam }: { exam: Exam }) => {
  const diff = difficultyConfig[exam.difficulty];

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{exam.subject}</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${diff.className}`}>{getLabel(diff.labelKey, diff.fallback)}</span>
      </div>
      <h3 className="font-semibold text-foreground leading-snug">{exam.title}</h3>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><HelpCircle size={13} /> {exam.questionCount} {getLabel("questions", "প্রশ্ন")}</span>
        <span className="flex items-center gap-1"><Clock size={13} /> {exam.duration} {getLabel("minutes", "মিনিট")}</span>
      </div>
      <Link
        to={`/exams/${exam.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        {getLabel("startExam", "পরীক্ষা শুরু করুন")}
      </Link>
    </div>
  );
};

export default ExamCard;
