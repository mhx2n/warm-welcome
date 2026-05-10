import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { GeneralAIChatModal } from "./GeneralAIChatModal";

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // পরীক্ষা চলাকালে AI বাটন লুকিয়ে রাখো (চিটিং প্রতিরোধের জন্য)
  const isExamPage = location.pathname.includes('/exam-attempt') || 
                     location.pathname.includes('/student/exam-attempt');

  if (isExamPage) {
    return null; // পরীক্ষার সময় দেখাবে না
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        title="AI শিক্ষা সহায়ক"
      >
        <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full animate-pulse border border-background" />
      </button>

      <GeneralAIChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
