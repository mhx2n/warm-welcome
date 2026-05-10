import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users as UsersIcon, Search, UserCog, Trash2 } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  next_number: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  batch_id: string | null;
  batch_name: string | null;
  unique_code: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBatchName, setNewBatchName] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [b, u] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (b.data) setBatches(b.data as Batch[]);
    if (u.data) setUsers(u.data as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBatch = async () => {
    const name = newBatchName.trim();
    if (!name) return;
    const { error } = await supabase.from("batches").insert({ name });
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      return;
    }
    setNewBatchName("");
    toast({ title: "ব্যাচ যোগ হয়েছে ✅" });
    load();
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("ব্যাচ মুছতে চান?")) return;
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    toast({ title: "মুছে ফেলা হয়েছে" });
    load();
  };

  const assignBatch = async (userId: string, batchId: string) => {
    const { error } = await supabase.rpc("assign_batch_to_profile", {
      _user_id: userId,
      _batch_id: batchId,
    });
    if (error) return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    toast({ title: "ব্যাচ অ্যাসাইন হয়েছে ✅" });
    load();
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.batch_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">ইউজার ও ব্যাচ ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">ব্যাচ যোগ করুন এবং ইউজারদের ব্যাচে অ্যাসাইন করুন</p>
      </div>

      {/* Batches */}
      <div className="glass-card-static p-5">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><UserCog size={16} /> ব্যাচসমূহ</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            placeholder="নতুন ব্যাচ নাম (যেমন: 26অদম্য)"
            className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={addBatch} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 hover:bg-primary/90">
            <Plus size={14} /> যোগ
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {batches.map((b) => (
            <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
              <span className="font-semibold">{b.name}</span>
              <span className="text-muted-foreground">(পরবর্তী: {b.next_number})</span>
              <button onClick={() => deleteBatch(b.id)} className="hover:text-destructive">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="glass-card-static p-5">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><UsersIcon size={16} /> ইউজার ({users.length})</h2>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নাম/ইমেইল/ব্যাচ সার্চ..."
              className="w-full glass-strong rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">লোড হচ্ছে...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">কোনো ইউজার পাওয়া যায়নি</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div key={u.id} className="glass-strong rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                      {(u.full_name || u.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.batch_name && <p className="text-[11px] text-primary mt-0.5">ব্যাচ: {u.batch_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.batch_id || ""}
                    onChange={(e) => e.target.value && assignBatch(u.user_id, e.target.value)}
                    className="glass-strong rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="">{u.batch_name ? `ব্যাচ পরিবর্তন` : "ব্যাচ অ্যাসাইন"}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
