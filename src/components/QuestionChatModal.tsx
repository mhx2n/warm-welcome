import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { WrongAnswerEntry } from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuestionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionContext: WrongAnswerEntry;
}

export function QuestionChatModal({ isOpen, onClose, questionContext }: QuestionChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: "assistant",
          content: `🎓 **আসসালামু আলাইকুম!** আমি আপনার **শিক্ষা সহায়ক**।

আমি এই প্রশ্নটি সম্পর্কে আপনাকে সাহায্য করতে এসেছি:

---

**📝 প্রশ্ন:** ${questionContext.questionText}

**✅ সঠিক উত্তর:** ${questionContext.correctAnswer}
**❌ আপনার উত্তর:** ${questionContext.userAnswer}

---

আপনি এই প্রশ্ন সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করতে পারেন। আমি **শুধুমাত্র পড়াশোনার বিষয়ে** সাহায্য করি। 📚

কীভাবে সাহায্য করতে পারি? 🤔`
        }
      ]);
    }
  }, [isOpen, questionContext]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/question-helper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          questionContext: {
            questionText: questionContext.questionText,
            correctAnswer: questionContext.correctAnswer,
            userAnswer: questionContext.userAnswer,
            explanation: questionContext.explanation,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantMessage = "";

      // Add empty assistant message to start streaming
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          } catch {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "দুঃখিত, কিছু ভুল হয়েছে। পরে আবার চেষ্টা করুন।"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
              <Sparkles size={20} className="text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AI শিক্ষা সহায়ক
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                ২৪/৭ পড়াশোনার সাহায্য
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-5 px-3 sm:px-5">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[95%] sm:max-w-[88%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1 ${
                  message.role === "user" 
                    ? "bg-gradient-to-r from-primary to-primary/80" 
                    : "bg-gradient-to-r from-secondary to-secondary/80 border-2 border-primary/20"
                }`}>
                  {message.role === "user" ? (
                    <User size={16} className="text-primary-foreground" />
                  ) : (
                    <Sparkles size={16} className="text-secondary-foreground" />
                  )}
                </div>
                <div className={`rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm border ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
                    : "bg-gradient-to-r from-card to-card/80 border-border/50"
                } backdrop-blur-sm`}>
                  <div className="text-[15px] leading-[1.75] sm:text-base sm:leading-[1.8]">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      className="prose prose-base max-w-none prose-headings:text-inherit prose-headings:font-bold prose-headings:mb-2 prose-p:text-inherit prose-p:mb-2 prose-strong:text-inherit prose-strong:font-bold prose-em:text-inherit prose-code:text-inherit prose-pre:text-inherit prose-blockquote:text-inherit prose-blockquote:border-primary/30 prose-ul:text-inherit prose-ul:my-2 prose-ol:text-inherit prose-ol:my-2 prose-li:text-inherit prose-li:my-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-secondary to-secondary/80 border-2 border-primary/20 shadow-md">
                  <Sparkles size={18} className="text-secondary-foreground" />
                </div>
                <div className="rounded-2xl p-4 bg-gradient-to-r from-card to-card/80 border border-border/50 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">চিন্তা করছি...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-3 pt-4 border-t bg-muted/20 rounded-t-xl px-4 py-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আপনার প্রশ্ন লিখুন... (শুধুমাত্র পড়াশোনার বিষয়ে)"
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1 bg-background border-border focus:border-primary transition-colors"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading} 
            size="sm"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-md"
          >
            <Send size={16} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}