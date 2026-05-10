import { Link } from "react-router-dom";
import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import { getLabel } from "@/lib/labels";

const Footer = () => {
  const settings = useSiteSettingsContext();

  return (
    <footer className="glass-nav mt-16 py-10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold mb-3">
              <span className="text-2xl">{settings.brandEmoji || "🎯"}</span>
              <span className="gradient-text">{settings.brandName || "Target"}</span>
            </div>
            <p className="text-sm text-muted-foreground">{settings.footerDescription}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">{getLabel("quickLinks")}</h4>
            <div className="flex flex-col gap-2">
              {settings.footerLinks.map((link, i) => (
                <Link key={i} to={link.url} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">{getLabel("contact")}</h4>
            <div className="flex gap-3">
              {settings.socialLinks.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.brandName || "Target"} {settings.brandEmoji || "🎯"} — {getLabel("allRightsReserved")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
