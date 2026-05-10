import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import { getLabel } from "@/lib/labels";
import { useAuth, signOut } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const settings = useSiteSettingsContext();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const links = [
    { to: "/", label: getLabel("navHome") },
    { to: "/exams", label: getLabel("navExams") },
    { to: "/live-exams", label: "লাইভ" },
    { to: "/results", label: getLabel("navResults") },
    { to: "/notices", label: getLabel("navNotices") },
    { to: "/profile", label: getLabel("navProfile") },
    { to: "/about", label: getLabel("navAbout") },
  ];

  const isActive = (path: string) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "লগআউট হয়েছে" });
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";
  const avatarInitial = (displayName[0] || "U").toUpperCase();

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">{settings.brandEmoji}</span>
          <span className="gradient-text">{settings.brandName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={`text-sm font-medium transition-colors ${isActive(l.to) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-border/50">
              <Link to="/profile" className="flex items-center gap-2">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {avatarInitial}
                  </div>
                )}
              </Link>
              <button onClick={handleSignOut} className="p-2 text-muted-foreground hover:text-foreground" title="লগআউট">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="p-2" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden glass-strong border-t border-border/50 px-4 pb-4 animate-fade-in">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={`block py-3 text-sm font-medium border-b border-border/50 ${isActive(l.to) ? "text-primary" : "text-muted-foreground"}`}>
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="pt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate">{displayName}</span>
              <button onClick={handleSignOut} className="text-xs text-primary flex items-center gap-1">
                <LogOut size={14} /> লগআউট
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
