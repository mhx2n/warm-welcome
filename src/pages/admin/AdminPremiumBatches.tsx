import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Crown, UserPlus, X } from "lucide-react";

interface PB { id: string; name: string; description: string; }
interface Member { id: string; user_id: string; premium_batch_id: string; }
interface Profile { user_id: string; full_name: string | null; email: string | null; }

const AdminPremiumBatches = () => {
  const { toast } = useToast();
  const [batches, setBatches] = useState<PB[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<PB | null>(null);
  const [addUserId, setAddUserId] = useState("");

  const load = async () => {
    const [b, m, u] = await Promise.all([
      supabase.from("premium_batches").select("*").order("created_at", { ascending: false }),
      supabase.from("premium_batch_members").select("*"),
      supabase.from("profiles").select("user_id,full_name,email").order("created_at", { ascending: false }),
    ]);
    if (b.data) setBatches(b.data as PB[]);
    if (m.data) setMembers(m.data as Member[]);
    if (u.data) setUsers(u.data as Profile[]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("premium_batches").insert({ name: name.trim(), description: desc.trim() });
    if (error) return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    setName(""); setDesc("");
    toast({ title: "প্রিমিয়াম ব্যাচ তৈরি হয়েছে ✅" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("এই প্রিমিয়াম ব্যাচ মুছবেন?")) return;
    await supabase.from("premium_batches").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const addMember = async () => {
    if (!selected || !addUserId) return;
    const { error } = await supabase.from("premium_batch_members").insert({
      premium_batch_id: selected.id, user_id: addUserId,
    });
    if (error) return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    setAddUserId("");
    toast({ title: "ইউজার যোগ হয়েছে ✅" });
    load();
  };

  const removeMember = async (mid: string) => {
    await supabase.from("premium_batch_members").delete().eq("id", mid);
    load();
  };

  const userMap = Object.fromEntries(users.map((u) => [u.user_id, u]));
  const selMembers = selected ? members.filter((m) => m.premium_batch_id === selected.id) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Crown size={22} className="text-warning" /> প্রিমিয়াম ব্যাচ</h1>
        <p className="text-sm text-muted-foreground">নির্দিষ্ট ইউজারদের প্রিমিয়াম ব্যাচে যোগ করুন। শুধু এই ব্যাচের সদস্যরাই restricted exam-এ অংশ নিতে পারবে।</p>
      </div>

      <div className="glass-card-static p-5 space-y-3">
        <h2 className="text-sm font-bold">নতুন প্রিমিয়াম ব্যাচ</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ব্যাচ নাম (যেমন: VIP-2026)" className="w-full glass-strong rounded-lg px-3 py-2 text-sm" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক)" rows={2} className="w-full glass-strong rounded-lg px-3 py-2 text-sm" />
        <button onClick={create} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1"><Plus size={14} /> তৈরি</button>
      </div>

      <div className="glass-card-static p-5">
        <h2 className="text-sm font-bold mb-3">সব প্রিমিয়াম ব্যাচ ({batches.length})</h2>
        {batches.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">কোনো ব্যাচ নেই</p> :
          <div className="grid md:grid-cols-2 gap-2">
            {batches.map((b) => {
              const count = members.filter((m) => m.premium_batch_id === b.id).length;
              return (
                <div key={b.id} className="glass-strong rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-2"><Crown size={12} className="text-warning" /> {b.name}</p>
                    {b.description && <p className="text-xs text-muted-foreground truncate">{b.description}</p>}
                    <p className="text-[11px] text-primary mt-0.5">{count} সদস্য</p>
                  </div>
                  <button onClick={() => setSelected(b)} className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs">ম্যানেজ</button>
                  <button onClick={() => remove(b.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>}
      </div>

      {selected && (
        <div className="glass-card-static p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2"><Crown size={16} className="text-warning" /> {selected.name} — সদস্য</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} /></button>
          </div>

          <div className="flex gap-2">
            <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm">
              <option value="">— ইউজার সিলেক্ট করুন —</option>
              {users.filter((u) => !selMembers.some((m) => m.user_id === u.user_id)).map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
            <button onClick={addMember} disabled={!addUserId} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
              <UserPlus size={14} /> যোগ
            </button>
          </div>

          <div className="space-y-1.5">
            {selMembers.map((m) => {
              const u = userMap[m.user_id];
              return (
                <div key={m.id} className="glass-strong rounded-lg p-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u?.full_name || u?.email || m.user_id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u?.email}</p>
                  </div>
                  <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={12} /></button>
                </div>
              );
            })}
            {selMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">এখনো কোনো সদস্য নেই</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPremiumBatches;