import { useState } from "react";
import { useExams, useSubjects, useCategories, useSetSubjects, useSetCategories } from "@/hooks/useSupabaseData";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSubjects = () => {
  const { data: exams = [] } = useExams();
  const { data: subjects = [], isLoading: subLoading } = useSubjects();
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const setSubjectsMut = useSetSubjects();
  const setCategoriesMut = useSetCategories();
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingSubject, setEditingSubject] = useState<{ index: number; value: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ index: number; value: string } | null>(null);
  const { toast } = useToast();

  const addSubject = () => {
    if (!newSubject.trim() || subjects.includes(newSubject.trim())) return;
    setSubjectsMut.mutate([...subjects, newSubject.trim()], {
      onSuccess: () => { setNewSubject(""); toast({ title: "বিষয় যোগ হয়েছে" }); },
    });
  };

  const deleteSubject = (index: number) => {
    setSubjectsMut.mutate(subjects.filter((_, i) => i !== index), {
      onSuccess: () => toast({ title: "বিষয় মুছে ফেলা হয়েছে" }),
    });
  };

  const saveSubjectEdit = () => {
    if (!editingSubject || !editingSubject.value.trim()) return;
    const updated = subjects.map((s, i) => i === editingSubject.index ? editingSubject.value.trim() : s);
    setSubjectsMut.mutate(updated, {
      onSuccess: () => { setEditingSubject(null); toast({ title: "বিষয় আপডেট হয়েছে" }); },
    });
  };

  const addCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    setCategoriesMut.mutate([...categories, newCategory.trim()], {
      onSuccess: () => { setNewCategory(""); toast({ title: "ক্যাটেগরি যোগ হয়েছে" }); },
    });
  };

  const deleteCategory = (index: number) => {
    setCategoriesMut.mutate(categories.filter((_, i) => i !== index), {
      onSuccess: () => toast({ title: "ক্যাটেগরি মুছে ফেলা হয়েছে" }),
    });
  };

  const saveCategoryEdit = () => {
    if (!editingCategory || !editingCategory.value.trim()) return;
    const updated = categories.map((c, i) => i === editingCategory.index ? editingCategory.value.trim() : c);
    setCategoriesMut.mutate(updated, {
      onSuccess: () => { setEditingCategory(null); toast({ title: "ক্যাটেগরি আপডেট হয়েছে" }); },
    });
  };

  if (subLoading || catLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5">📚 বিষয় ও ক্যাটেগরি</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Subjects */}
        <div className="glass-card-static p-5">
          <h2 className="font-semibold text-sm mb-3">বিষয়সমূহ</h2>
          <div className="flex gap-2 mb-3">
            <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} placeholder="নতুন বিষয়"
              className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addSubject} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {subjects.map((s, i) => {
              const count = exams.filter((e) => e.subject === s).length;
              const isEditing = editingSubject?.index === i;
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  {isEditing ? (
                    <input value={editingSubject.value} onChange={(e) => setEditingSubject({ index: i, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveSubjectEdit()}
                      className="flex-1 bg-background rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 mr-2" autoFocus />
                  ) : (
                    <span className="text-sm flex-1">{s}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">{count} পরীক্ষা</span>
                    {isEditing ? (
                      <>
                        <button onClick={saveSubjectEdit} className="p-1 rounded hover:bg-background transition-colors"><Check size={14} className="text-primary" /></button>
                        <button onClick={() => setEditingSubject(null)} className="p-1 rounded hover:bg-background transition-colors"><X size={14} className="text-muted-foreground" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingSubject({ index: i, value: s })} className="p-1 rounded hover:bg-background transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => deleteSubject(i)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="glass-card-static p-5">
          <h2 className="font-semibold text-sm mb-3">ক্যাটেগরি</h2>
          <div className="flex gap-2 mb-3">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="নতুন ক্যাটেগরি"
              className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addCategory} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {categories.map((c, i) => {
              const count = exams.filter((e) => e.category === c).length;
              const isEditing = editingCategory?.index === i;
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  {isEditing ? (
                    <input value={editingCategory.value} onChange={(e) => setEditingCategory({ index: i, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveCategoryEdit()}
                      className="flex-1 bg-background rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 mr-2" autoFocus />
                  ) : (
                    <span className="text-sm flex-1">{c}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">{count} পরীক্ষা</span>
                    {isEditing ? (
                      <>
                        <button onClick={saveCategoryEdit} className="p-1 rounded hover:bg-background transition-colors"><Check size={14} className="text-primary" /></button>
                        <button onClick={() => setEditingCategory(null)} className="p-1 rounded hover:bg-background transition-colors"><X size={14} className="text-muted-foreground" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingCategory({ index: i, value: c })} className="p-1 rounded hover:bg-background transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => deleteCategory(i)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubjects;
