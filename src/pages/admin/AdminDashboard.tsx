import { useExams, useNotices } from "@/hooks/useSupabaseData";
import { BookOpen, HelpCircle, Bell, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import VisitorStats from "@/components/VisitorStats";

const AdminDashboard = () => {
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: notices = [], isLoading: noticesLoading } = useNotices();
  const totalQuestions = exams.reduce((a, e) => a + e.questionCount, 0);
  const publishedExams = exams.filter((e) => e.published).length;

  if (examsLoading || noticesLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold">🔧 অ্যাডমিন ড্যাশবোর্ড</h1>

      <VisitorStats />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "মোট পরীক্ষা", value: exams.length, color: "text-primary" },
          { icon: HelpCircle, label: "মোট প্রশ্ন", value: totalQuestions, color: "text-success" },
          { icon: Bell, label: "নোটিস", value: notices.length, color: "text-warning" },
          { icon: Upload, label: "প্রকাশিত", value: publishedExams, color: "text-accent-foreground" },
        ].map((s, i) => (
          <div key={i} className="glass-card-static p-5 text-center">
            <s.icon className={`mx-auto mb-2 ${s.color}`} size={22} />
            <p className="text-3xl font-bold gradient-text">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/admin/upload-csv" className="glass-card p-5 text-center">
          <Upload className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">CSV আপলোড</p>
          <p className="text-xs text-muted-foreground">প্রশ্ন আমদানি করুন</p>
        </Link>
        <Link to="/admin/exams" className="glass-card p-5 text-center">
          <BookOpen className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">পরীক্ষা ব্যবস্থাপনা</p>
          <p className="text-xs text-muted-foreground">{exams.length}টি পরীক্ষা</p>
        </Link>
        <Link to="/admin/notices" className="glass-card p-5 text-center">
          <Bell className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">নোটিস</p>
          <p className="text-xs text-muted-foreground">{notices.length}টি নোটিস</p>
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-bold mb-3">📝 সাম্প্রতিক পরীক্ষা</h2>
        <div className="space-y-2">
          {exams.slice(0, 5).map((e) => (
            <div key={e.id} className="glass-card-static p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.subject} • {e.questionCount} প্রশ্ন</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${e.published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {e.published ? "প্রকাশিত" : "অপ্রকাশিত"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
