import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, signOut } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard, FileText, Bell, Upload, BookOpen, Settings, LogOut, Menu, X, HelpCircle, FolderOpen, Globe, Palette, Clock, PartyPopper, Users, Radio, Crown,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { to: "/admin/users", label: "ইউজার ও ব্যাচ", icon: Users },
  { to: "/admin/live-exams", label: "লাইভ পরীক্ষা", icon: Radio },
  { to: "/admin/premium-batches", label: "প্রিমিয়াম ব্যাচ", icon: Crown },
  { to: "/admin/exams", label: "পরীক্ষা", icon: FileText },
  { to: "/admin/sections", label: "সেকশন", icon: FolderOpen },
  { to: "/admin/questions", label: "প্রশ্ন ব্যাংক", icon: HelpCircle },
  { to: "/admin/upload-csv", label: "CSV আপলোড", icon: Upload },
  { to: "/admin/notices", label: "নোটিস", icon: Bell },
  { to: "/admin/subjects", label: "বিষয়সমূহ", icon: BookOpen },
  { to: "/admin/theme", label: "থিম কাস্টমাইজ", icon: Palette },
  { to: "/admin/reminders", label: "রিমাইন্ডার", icon: Clock },
  { to: "/admin/event-banners", label: "ইভেন্ট ব্যানার", icon: PartyPopper },
  { to: "/admin/site-settings", label: "সাইট কাস্টমাইজ", icon: Globe },
  { to: "/admin/settings", label: "সেটিংস", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/secure-admin-login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card-static p-8 text-center max-w-sm">
          <p className="text-4xl mb-4">🚫</p>
          <h1 className="text-xl font-bold mb-2">অ্যাক্সেস নেই</h1>
          <p className="text-sm text-muted-foreground mb-4">আপনার অ্যাডমিন অনুমতি নেই। প্রথম রেজিস্ট্রেশনকারী স্বয়ংক্রিয়ভাবে অ্যাডমিন হন।</p>
          <button onClick={() => { signOut(); navigate("/secure-admin-login"); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            লগআউট
          </button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  const logout = async () => {
    await signOut();
    navigate("/secure-admin-login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2 font-bold">
              <span className="text-xl">🎯</span>
              <span className="gradient-text text-lg">Target</span>
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            <ThemeToggle />
            <button onClick={logout} className="flex items-center gap-1.5 text-xs text-destructive hover:underline font-medium">
              <LogOut size={14} /> লগআউট
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        <aside className="hidden md:flex flex-col w-56 glass-strong border-r border-border/50 p-4 gap-1 fixed top-14 bottom-0 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <item.icon size={16} />{item.label}
            </Link>
          ))}
        </aside>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <aside className="w-64 h-full glass-strong p-4 pt-20 space-y-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  <item.icon size={16} />{item.label}
                </Link>
              ))}
            </aside>
          </div>
        )}

        <main className="flex-1 md:ml-56 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
