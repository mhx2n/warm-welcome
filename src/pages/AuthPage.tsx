import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp, useAuth } from "@/hooks/useAuth";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    // Restrict to real Gmail addresses only (no aliases / fake providers)
    const normalized = email.trim().toLowerCase();
    const gmailRegex = /^[a-z0-9](\.?[a-z0-9_-]){4,}@gmail\.com$/;
    if (!gmailRegex.test(normalized)) {
      toast({
        title: "শুধু Gmail অনুমোদিত",
        description: "অনুগ্রহ করে একটি বৈধ @gmail.com ঠিকানা ব্যবহার করুন।",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp(normalized, password, fullName);
        if (!result?.session) {
          toast({
            title: "ভেরিফিকেশন ইমেইল পাঠানো হয়েছে 📧",
            description: "আপনার Gmail-এ গিয়ে ভেরিফাই লিংকে ক্লিক করুন, তারপর লগইন করুন।",
          });
          setIsSignUp(false);
          return;
        }
        toast({ title: "স্বাগতম! ✅" });
      } else {
        await signIn(normalized, password);
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "ব্যর্থ হয়েছে", variant: "destructive" });
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
          <h1 className="text-xl font-bold">{isSignUp ? "অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isSignUp ? "নতুন অ্যাকাউন্ট খুলুন" : "আপনার অ্যাকাউন্টে প্রবেশ করুন"}
          </p>
        </div>

        
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="পূর্ণ নাম"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-strong rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="email"
              placeholder="আপনার Gmail (যেমন: name@gmail.com)"
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
            className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {loading ? "অপেক্ষা করুন..." : isSignUp ? "রেজিস্ট্রেশন" : "লগইন"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="block w-full text-center text-xs text-primary mt-4 hover:underline"
        >
          {isSignUp ? "ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
