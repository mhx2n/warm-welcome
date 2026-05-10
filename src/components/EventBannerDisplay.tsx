import { useState, useEffect } from "react";
import { useEventBanners } from "@/hooks/useSupabaseData";
import { X } from "lucide-react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "সময় শেষ!";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}দিন`);
  parts.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
  return parts.join(" ");
}

const EventBannerDisplay = () => {
  const { data: allBanners } = useEventBanners();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const banners = (allBanners || []).filter((b) => b.active && new Date(b.targetDate).getTime() > Date.now());
  const visible = banners.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <>
      <div style={{ height: `${visible.length * 40}px` }} />
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10 border-b border-border/50 backdrop-blur-md">
        {visible.map((banner) => {
          const remaining = new Date(banner.targetDate).getTime() - Date.now();
          return (
            <div key={banner.id} className="container py-1.5 flex items-center gap-3 justify-center relative">
              {banner.image && (
                <img src={banner.image} alt={banner.caption} className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-3 text-center min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">{banner.caption}</span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">{formatCountdown(remaining)}</span>
              </div>
              <button onClick={() => setDismissed((p) => new Set(p).add(banner.id))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default EventBannerDisplay;
