import { useParams, Link, useNavigate } from "react-router-dom";
import { store } from "@/lib/store";
import { Clock, HelpCircle, ArrowLeft } from "lucide-react";

const diffLabel: Record<string, string> = { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" };

const StudentExamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const exam = store.getExams().find((e) => e.id === id);

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">পরীক্ষা পাওয়া যায়নি</p>
        <Link to="/student/exams" className="text-primary text-sm mt-2 inline-block">ফিরে যান</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      <div className="glass-card-static p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">{exam.subject}</span>
          <span className="text-xs font-medium bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning px-3 py-1 rounded-full">{diffLabel[exam.difficulty]}</span>
        </div>

        <h1 className="text-2xl font-bold">{exam.title}</h1>
        {exam.chapter && <p className="text-sm text-muted-foreground">{exam.chapter}</p>}

        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><HelpCircle size={16} /> {exam.questionCount} প্রশ্ন</span>
          <span className="flex items-center gap-1.5"><Clock size={16} /> {exam.duration} মিনিট</span>
        </div>

        <div className="glass-card-static p-4 bg-primary/5 border-primary/20">
          <h3 className="font-semibold text-sm mb-2">📋 নির্দেশাবলী</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>প্রতিটি প্রশ্নের একটি সঠিক উত্তর আছে</li>
            <li>সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে</li>
            <li>আপনি যতবার খুশি অনুশীলন করতে পারবেন</li>
            <li>প্রশ্নের ক্রম এবং অপশন প্রতিবার পরিবর্তিত হবে</li>
          </ul>
        </div>

        <Link
          to={`/student/exams/${exam.id}/attempt`}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          পরীক্ষা শুরু করুন 🚀
        </Link>
      </div>
    </div>
  );
};

export default StudentExamDetails;
