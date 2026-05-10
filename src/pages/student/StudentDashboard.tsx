import { Link } from "react-router-dom";
import { store } from "@/lib/store";
import { BookOpen, Award, Bell, ArrowRight, BarChart3, Clock } from "lucide-react";

const StudentDashboard = () => {
  const exams = store.getExams().filter((e) => e.published);
  const notices = store.getNotices();
  const results = store.getResults();
  const recentResults = results.slice(0, 5);

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="glass-card-static p-6 bg-gradient-to-r from-primary/5 to-accent/20">
        <h1 className="text-xl font-bold mb-1">স্বাগতম! 👋</h1>
        <p className="text-sm text-muted-foreground">আপনার অনুশীলন ড্যাশবোর্ডে। আজকে পরীক্ষা দিয়ে প্রস্তুতি শুরু করুন!</p>
        <Link
          to="/student/exams"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          পরীক্ষা শুরু করুন <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "পরীক্ষা", value: exams.length, color: "text-primary" },
          { icon: BarChart3, label: "অনুশীলন", value: results.length, color: "text-success" },
          { icon: Award, label: "গড় স্কোর", value: `${avgScore}%`, color: "text-warning" },
          { icon: Bell, label: "নোটিস", value: notices.length, color: "text-accent-foreground" },
        ].map((s, i) => (
          <div key={i} className="glass-card-static p-4 text-center">
            <s.icon className={`mx-auto mb-2 ${s.color}`} size={20} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">📊 সাম্প্রতিক ফলাফল</h2>
            <Link to="/student/results" className="text-xs text-primary font-medium flex items-center gap-1">
              সব দেখুন <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentResults.map((r, i) => (
              <div key={i} className="glass-card-static p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.examTitle}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={11} /> {new Date(r.timestamp).toLocaleDateString("bn-BD")}
                  </p>
                </div>
                <span className={`text-sm font-bold ${r.percentage >= 60 ? "text-success" : "text-destructive"}`}>
                  {r.percentage}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Exams */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">⭐ পরীক্ষা সমূহ</h2>
          <Link to="/student/exams" className="text-xs text-primary font-medium flex items-center gap-1">
            সব দেখুন <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exams.slice(0, 4).map((e) => (
            <Link key={e.id} to={`/student/exams/${e.id}`} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{e.subject}</span>
                <span className="text-xs text-muted-foreground ml-auto">{e.questionCount} প্রশ্ন</span>
              </div>
              <h3 className="text-sm font-semibold">{e.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Notices */}
      {notices.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3">📢 সর্বশেষ নোটিস</h2>
          <div className="space-y-2">
            {notices.slice(0, 3).map((n) => (
              <div key={n.id} className="glass-card-static p-3 flex items-center gap-3">
                {n.pinned && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">📌</span>}
                <span className="text-sm flex-1">{n.title}</span>
                <span className="text-xs text-muted-foreground">{n.createdAt}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
