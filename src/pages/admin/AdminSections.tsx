import { useState } from "react";
import { useSections, useExams, useUpsertSection, useDeleteSection } from "@/hooks/useSupabaseData";
import { Section } from "@/lib/types";
import { Plus, Trash2, GripVertical, Pencil, X, Check, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";

const AdminSections = () => {
  const { data: sections = [], isLoading } = useSections();
  const { data: exams = [] } = useExams();
  const upsertSection = useUpsertSection();
  const deleteSectionMut = useDeleteSection();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newImage, setNewImage] = useState<string | undefined>();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editImage, setEditImage] = useState<string | undefined>();
  const { toast } = useToast();

  const handleImageUpload = async (file: File, setter: (v: string | undefined) => void) => {
    try {
      const compressed = await compressImage(file, 800, 400, 0.7);
      setter(compressed);
    } catch {
      toast({ title: "ছবি আপলোড ব্যর্থ", variant: "destructive" });
    }
  };

  const addSection = () => {
    if (!newName.trim()) return;
    const section: Section = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim(),
      caption: newCaption.trim() || undefined,
      image: newImage,
      order: sections.length,
      createdAt: new Date().toISOString().split("T")[0],
    };
    upsertSection.mutate(section, {
      onSuccess: () => {
        setNewName(""); setNewDesc(""); setNewCaption(""); setNewImage(undefined);
        toast({ title: "সেকশন যোগ করা হয়েছে" });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteSectionMut.mutate(id, {
      onSuccess: () => toast({ title: "সেকশন মুছে ফেলা হয়েছে" }),
    });
  };

  const startEdit = (s: Section) => {
    setEditId(s.id); setEditName(s.name); setEditDesc(s.description);
    setEditCaption(s.caption || ""); setEditImage(s.image);
  };

  const saveEdit = () => {
    if (!editId || !editName.trim()) return;
    const existing = sections.find((s) => s.id === editId);
    if (!existing) return;
    upsertSection.mutate({
      ...existing, name: editName.trim(), description: editDesc.trim(),
      caption: editCaption.trim() || undefined, image: editImage,
    }, {
      onSuccess: () => { setEditId(null); toast({ title: "সেকশন আপডেট হয়েছে" }); },
    });
  };

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5">📂 সেকশন ব্যবস্থাপনা</h1>
      <p className="text-sm text-muted-foreground mb-6">
        সেকশন তৈরি করুন, ছবি ও ক্যাপশন যোগ করুন। স্টুডেন্টরা সেকশনে ক্লিক করলে পরীক্ষাগুলো পপাপে দেখবে।
      </p>

      <div className="glass-card-static p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">➕ নতুন সেকশন যোগ করুন</h2>
        <div className="space-y-3">
          <input type="text" placeholder="সেকশনের নাম (যেমন: ঢাকা বিশ্ববিদ্যালয়)" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="বর্ণনা" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="✨ স্টাইলিশ ক্যাপশন (ঐচ্ছিক)" value={newCaption} onChange={(e) => setNewCaption(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted cursor-pointer transition-colors">
              <ImagePlus size={16} className="text-primary" /> ছবি যোগ করুন
              <span className="text-[10px] text-muted-foreground opacity-70">(সেরা সাইজ: 800×400px)</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, setNewImage); }} />
            </label>
            {newImage && (
              <div className="relative">
                <img src={newImage} alt="preview" className="h-16 w-24 object-cover rounded-lg" />
                <button onClick={() => setNewImage(undefined)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X size={12} /></button>
              </div>
            )}
          </div>
          <button onClick={addSection} disabled={!newName.trim() || upsertSection.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
            <Plus size={16} /> যোগ করুন
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-muted-foreground">কোনো সেকশন নেই। উপরে নতুন সেকশন তৈরি করুন।</div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => {
            const sectionExams = exams.filter((e) => e.sectionId === s.id);
            const isEditing = editId === s.id;
            return (
              <div key={s.id} className="glass-card-static p-4">
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full glass-strong rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="সেকশনের নাম" />
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full glass-strong rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="বর্ণনা" />
                        <input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} className="w-full glass-strong rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="✨ স্টাইলিশ ক্যাপশন" />
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                            <ImagePlus size={14} /> ছবি পরিবর্তন
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, setEditImage); }} />
                          </label>
                          {editImage && (
                            <div className="relative">
                              <img src={editImage} alt="preview" className="h-12 w-20 object-cover rounded-lg" />
                              <button onClick={() => setEditImage(undefined)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"><X size={10} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {s.image && <img src={s.image} alt={s.name} className="h-14 w-20 object-cover rounded-lg flex-shrink-0" />}
                        <div>
                          <h3 className="font-semibold text-sm">{s.name}</h3>
                          {s.caption && <p className="text-xs text-primary/70 italic mt-0.5">{s.caption}</p>}
                          {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{sectionExams.length} পরীক্ষা • তৈরি: {s.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="p-2 rounded-lg hover:bg-success/10 transition-colors"><Check size={16} className="text-success" /></button>
                        <button onClick={() => setEditId(null)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X size={16} className="text-muted-foreground" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Pencil size={16} className="text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={16} className="text-destructive" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSections;
