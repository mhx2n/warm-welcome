import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp, signInWithGoogle } from "@/hooks/useAuth";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password);

        if (!result?.session) {
          toast({
            title: "ভেরিফিকেশন ইমেইল পাঠানো হয়েছে ✅",
            description: "ইমেইল verify করে পরে লগইন করুন।",
          });
          setIsSignUp(false);
          return;
        }

        toast({ title: "অ্যাকাউন্ট তৈরি হয়েছে ✅" });
      } else {
        await signIn(email, password);
      }
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "লগইন ব্যর্থ হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/20">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold mb-4">
            <span>🎯</span>
            <span className="gradient-text">Target</span>
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="text-primary" size={24} />
          </div>
          <h1 className="text-xl font-bold">{isSignUp ? "অ্যাডমিন রেজিস্ট্রেশন" : "অ্যাডমিন লগইন"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isSignUp ? "নতুন অ্যাডমিন অ্যাকাউন্ট তৈরি করুন" : "ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন"}
          </p>
        </div>
        <button
          onClick={async () => {
            try { await signInWithGoogle(); } catch (e: any) {
              toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
            }
          }}
          className="w-full py-3 rounded-xl text-sm font-semibold glass-strong hover:bg-accent/30 transition-all flex items-center justify-center gap-2 mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google দিয়ে লগইন
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="email"
              placeholder="ইমেইল"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-strong rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="password"
              placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full glass-strong rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? "অপেক্ষা করুন..." : isSignUp ? (
              <><UserPlus size={16} /> রেজিস্ট্রেশন</>
            ) : (
              "লগইন"
            )}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="block w-full text-center text-xs text-primary mt-4 hover:underline"
        >
          {isSignUp ? "ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground mt-3 hover:text-foreground">← ফিরে যান</Link>
      </div>
    </div>
  );
};

export default AdminLoginPage;
