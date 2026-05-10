import { useState, useRef } from "react";
import { useNotices, useUpsertNotice, useDeleteNotice } from "@/hooks/useSupabaseData";
import { Notice } from "@/lib/types";
import { Plus, Trash2, Pin, Bold, Italic, Link, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";

const RichTextToolbar = ({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) => {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-1 p-1.5 border-b border-border flex-wrap">
      <button type="button" onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-muted transition-colors" title="Bold">
        <Bold size={14} />
      </button>
      <button type="button" onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-muted transition-colors" title="Italic">
        <Italic size={14} />
      </button>
      <button type="button" onClick={() => {
        const url = prompt("লিংক URL দিন:");
        if (url) exec("createLink", url);
      }} className="p-1.5 rounded hover:bg-muted transition-colors" title="Link">
        <Link size={14} />
      </button>
      <select
        onChange={(e) => { if (e.target.value) exec("fontSize", e.target.value); e.target.value = ""; }}
        className="text-xs bg-transparent border border-border rounded px-1.5 py-1 focus:outline-none"
        defaultValue=""
      >
        <option value="" disabled>সাইজ</option>
        <option value="1">ছোট</option>
        <option value="3">স্বাভাবিক</option>
        <option value="5">বড়</option>
        <option value="7">অনেক বড়</option>
      </select>
    </div>
  );
};

const AdminNotices = () => {
  const { data: notices = [], isLoading } = useNotices();
  const upsertNotice = useUpsertNotice();
  const deleteNoticeMut = useDeleteNotice();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const contentRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 450, 0.7);
      setImage(compressed);
    } catch {
      toast({ title: "ছবি লোড করতে সমস্যা হয়েছে", variant: "destructive" });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addNotice = () => {
    if (!title) return;
    const content = contentRef.current?.innerHTML || "";
    const n: Notice = {
      id: crypto.randomUUID(),
      title,
      content,
      image,
      pinned: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    upsertNotice.mutate(n, {
      onSuccess: () => {
        setTitle("");
        setImage(undefined);
        if (contentRef.current) contentRef.current.innerHTML = "";
        toast({ title: "নোটিস যুক্ত হয়েছে" });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteNoticeMut.mutate(id, {
      onSuccess: () => toast({ title: "নোটিস মুছে ফেলা হয়েছে" }),
    });
  };

  const togglePin = (notice: Notice) => {
    upsertNotice.mutate({ ...notice, pinned: !notice.pinned });
  };

  if (isLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5">📢 নোটিস ব্যবস্থাপনা</h1>

      <div className="glass-card-static p-5 mb-5">
        <h3 className="font-semibold text-sm mb-3">নতুন নোটিস</h3>
        <input placeholder="শিরোনাম" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        
        <div className="border border-border rounded-xl overflow-hidden mb-3">
          <RichTextToolbar editorRef={contentRef} />
          <div
            ref={contentRef}
            contentEditable
            className="min-h-[80px] px-4 py-2.5 text-sm focus:outline-none bg-transparent"
            data-placeholder="বিবরণ লিখুন (বোল্ড, ইটালিক, লিংক সাপোর্ট)"
            style={{ minHeight: "80px" }}
          />
        </div>

        <div className="mb-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          {image ? (
            <div className="relative inline-block">
              <img src={image} alt="নোটিস ছবি" className="rounded-xl max-h-40 object-cover border border-border" />
              <button onClick={() => setImage(undefined)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <ImagePlus size={16} /> ছবি যুক্ত করুন
              <span className="text-xs opacity-60">(সেরা সাইজ: 800×450px)</span>
            </button>
          )}
        </div>

        <button onClick={addNotice} disabled={upsertNotice.isPending} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
          <Plus size={14} className="inline mr-1" /> যুক্ত করুন
        </button>
      </div>

      <div className="space-y-2">
        {notices.map((n) => (
          <div key={n.id} className="glass-card-static p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {n.pinned && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">📌</span>}
                <h4 className="text-sm font-medium truncate">{n.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground">{n.createdAt}</p>
              {n.image && <img src={n.image} alt="" className="mt-2 rounded-lg max-h-20 object-cover" />}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => togglePin(n)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Pin size={14} className={n.pinned ? "text-primary" : "text-muted-foreground"} />
              </button>
              <button onClick={() => handleDelete(n.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNotices;
