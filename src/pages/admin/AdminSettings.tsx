import { store } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCcw } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();

  const clearResults = () => {
    localStorage.removeItem("target_results");
    toast({ title: "ফলাফল মুছে ফেলা হয়েছে" });
  };

  const resetAll = () => {
    localStorage.removeItem("target_exams");
    localStorage.removeItem("target_notices");
    localStorage.removeItem("target_results");
    toast({ title: "সকল ডেটা রিসেট হয়েছে", description: "পেজ রিফ্রেশ করুন" });
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold mb-5">⚙️ সেটিংস</h1>

      <div className="space-y-4">
        <div className="glass-card-static p-5">
          <h3 className="font-semibold text-sm mb-2">ডেটা ব্যবস্থাপনা</h3>
          <p className="text-xs text-muted-foreground mb-4">সতর্কতা: এই ক্রিয়াগুলো পূর্বাবস্থায় ফেরানো যাবে না।</p>

          <div className="space-y-3">
            <button onClick={clearResults} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors">
              <Trash2 size={16} className="text-warning" />
              ফলাফল ইতিহাস মুছুন
            </button>
            <button onClick={resetAll} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-destructive/30 hover:bg-destructive/10 transition-colors text-destructive">
              <RefreshCcw size={16} />
              সকল ডেটা রিসেট করুন
            </button>
          </div>
        </div>

        <div className="glass-card-static p-5">
          <h3 className="font-semibold text-sm mb-2">সম্পর্কে</h3>
          <p className="text-xs text-muted-foreground">Target 🎯 — শিক্ষামূলক পরীক্ষা অনুশীলন প্ল্যাটফর্ম</p>
          <p className="text-xs text-muted-foreground mt-1">সংস্করণ 2.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
