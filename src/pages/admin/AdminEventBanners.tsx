import { useState } from "react";
import { useEventBanners, useUpsertEventBanner, useDeleteEventBanner } from "@/hooks/useSupabaseData";
import { EventBanner } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Image } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

const AdminEventBanners = () => {
  const { data: banners = [], isLoading } = useEventBanners();
  const upsertBanner = useUpsertEventBanner();
  const deleteBannerMut = useDeleteEventBanner();
  const [caption, setCaption] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [image, setImage] = useState("");
  const { toast } = useToast();

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 200, 200, 0.7);
    setImage(compressed);
  };

  const add = () => {
    if (!caption.trim() || !targetDate) {
      toast({ title: "ক্যাপশন ও তারিখ দিন", variant: "destructive" });
      return;
    }
    const banner: EventBanner = {
      id: crypto.randomUUID(),
      image,
      caption: caption.trim(),
      targetDate: new Date(targetDate).toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    upsertBanner.mutate(banner, {
      onSuccess: () => {
        setCaption(""); setTargetDate(""); setImage("");
        toast({ title: "ব্যানার যোগ হয়েছে ✅" });
      },
    });
  };

  const remove = (id: string) => {
    deleteBannerMut.mutate(id, {
      onSuccess: () => toast({ title: "ব্যানার মুছে ফেলা হয়েছে" }),
    });
  };

  const toggleActive = (banner: EventBanner) => {
    upsertBanner.mutate({ ...banner, active: !banner.active });
  };

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">🎉 ইভেন্ট ব্যানার</h1>

      <div className="glass-card-static p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold">নতুন ব্যানার যোগ করুন</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ক্যাপশন *</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="যেমন: ঈদুল ফিতর মোবারক!"
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">তারিখ ও সময় *</label>
            <input type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ছবি (ঐচ্ছিক)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm glass-strong hover:bg-muted/50 transition-colors">
                <Image size={16} /> ছবি আপলোড
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
              <span className="text-[10px] text-muted-foreground">(সেরা সাইজ: 200×200px)</span>
              {image && <img src={image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
            </div>
          </div>
          <button onClick={add} disabled={upsertBanner.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
            <Plus size={16} /> যোগ করুন
          </button>
        </div>
      </div>

      {banners.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">কোনো ইভেন্ট ব্যানার নেই</p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => {
            const isExpired = new Date(b.targetDate).getTime() <= Date.now();
            return (
              <div key={b.id} className={`glass-card-static p-4 flex items-center gap-3 ${!b.active || isExpired ? "opacity-50" : ""}`}>
                {b.image && <img src={b.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{b.caption}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.targetDate).toLocaleString("bn-BD")}
                    {isExpired && " • মেয়াদোত্তীর্ণ"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(b)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={b.active ? "নিষ্ক্রিয়" : "সক্রিয়"}>
                    {b.active ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-muted-foreground" />}
                  </button>
                  <button onClick={() => remove(b.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminEventBanners;
