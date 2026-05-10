import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, FileText, Bell, User, BarChart3, Home, Menu, X } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { to: "/student", label: "ড্যাশবোর্ড", icon: Home, end: true },
  { to: "/student/exams", label: "পরীক্ষা", icon: FileText },
  { to: "/student/results", label: "ফলাফল", icon: BarChart3 },
  { to: "/student/notices", label: "নোটিস", icon: Bell },
  { to: "/student/profile", label: "প্রোফাইল", icon: User },
];

const StudentLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/student" className="flex items-center gap-2 font-bold">
              <span className="text-xl">🎯</span>
              <span className="gradient-text text-lg">Target</span>
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">Student</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              হোমপেজ →
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        <aside className="hidden md:flex flex-col w-56 glass-strong border-r border-border/50 p-4 gap-1 fixed top-14 bottom-0 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.to, item.end)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </aside>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <aside className="w-64 h-full glass-strong p-4 pt-20 space-y-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.to, item.end)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
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

export default StudentLayout;
