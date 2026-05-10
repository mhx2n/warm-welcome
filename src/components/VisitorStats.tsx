import { useEffect, useState } from "react";
import { Users, Eye, Globe } from "lucide-react";
import { fetchVisitorStats } from "@/lib/api";

interface VisitorData {
  totalVisits: number;
  todayVisits: number;
  activeNow: number;
}

const VisitorStats = () => {
  const [data, setData] = useState<VisitorData>({
    totalVisits: 0,
    todayVisits: 0,
    activeNow: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const stats = await fetchVisitorStats();
      setData(stats);
    } catch (e) {
      console.error("Failed to load visitor stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      icon: Globe,
      label: "মোট ভিজিট",
      value: data.totalVisits.toLocaleString("bn-BD"),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Eye,
      label: "আজকের ভিজিট",
      value: data.todayVisits.toLocaleString("bn-BD"),
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Users,
      label: "এখন অনলাইন",
      value: data.activeNow.toLocaleString("bn-BD"),
      color: "text-warning",
      bgColor: "bg-warning/10",
      pulse: true,
    },
  ];

  return (
    <div className="glass-strong rounded-2xl p-4 backdrop-blur-xl border border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">লাইভ পরিসংখ্যান</span>
        {loading && <span className="text-[10px] text-muted-foreground">(লোড হচ্ছে...)</span>}
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl p-3 ${stat.bgColor} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            {stat.pulse && (
              <div className="absolute top-2 right-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisitorStats;
