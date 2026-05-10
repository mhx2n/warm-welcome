import { useState } from "react";
import { useReminders, useUpsertReminder, useDeleteReminder } from "@/hooks/useSupabaseData";
import { Reminder } from "@/lib/types";
import { Plus, Trash2, Clock, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const colorOptions = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
];

const AdminReminders = () => {
  const { data: reminders = [], isLoading } = useReminders();
  const upsertReminder = useUpsertReminder();
  const deleteReminderMut = useDeleteReminder();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(colorOptions[0]);
  const { toast } = useToast();

  const addReminder = () => {
    if (!title.trim() || !targetDate) return;
    const target = new Date(targetDate);
    if (target.getTime() <= Date.now()) {
      toast({ title: "ভবিষ্যতের তারিখ দিন", variant: "destructive" });
      return;
    }
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      targetDate: target.toISOString(),
      color,
      createdAt: new Date().toISOString(),
    };
    upsertReminder.mutate(reminder, {
      onSuccess: () => {
        setTitle(""); setDescription(""); setTargetDate("");
        toast({ title: "রিমাইন্ডার যোগ করা হয়েছে ✅" });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteReminderMut.mutate(id, {
      onSuccess: () => toast({ title: "রিমাইন্ডার মুছে ফেলা হয়েছে" }),
    });
  };

  const active = reminders.filter((r) => new Date(r.targetDate).getTime() > Date.now());

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-2">⏰ রিমাইন্ডার ব্যবস্থাপনা</h1>
      <p className="text-sm text-muted-foreground mb-6">
        রিমাইন্ডার যোগ করুন — নির্দিষ্ট তারিখ ও সময় সেট করুন। ওয়েবসাইটের নিচে ডান কোণায় কাউন্টডাউন দেখাবে। সময় শেষ হলে অটো মুছে যাবে।
      </p>

      <div className="glass-card-static p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">➕ নতুন রিমাইন্ডার</h2>
        <div className="space-y-3">
          <input type="text" placeholder="শিরোনাম (যেমন: পরীক্ষা শুরু হচ্ছে!)" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="বিবরণ (ঐচ্ছিক)" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">📅 তারিখ ও সময়</label>
              <input type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Palette size={12} /> রঙ বেছে নিন</label>
              <div className="flex gap-2 mt-1">
                {colorOptions.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={addReminder} disabled={!title.trim() || !targetDate || upsertReminder.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
            <Plus size={16} /> যোগ করুন
          </button>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-muted-foreground">কোনো সক্রিয় রিমাইন্ডার নেই</div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">সক্রিয় রিমাইন্ডার ({active.length})</h2>
          {active
            .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
            .map((r) => (
              <div key={r.id} className="glass-card-static p-4 flex items-start gap-3 overflow-hidden">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold">{r.title}</h3>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} />{new Date(r.targetDate).toLocaleString("bn-BD")}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0">
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AdminReminders;
