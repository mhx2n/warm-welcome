import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import telegramLogo from "@/assets/telegram-logo.jpg";

const TelegramFloatingButton = () => {
  const settings = useSiteSettingsContext();
  
  // Find Telegram link from socialLinks
  const telegramLink = settings.socialLinks?.find(
    (link) => link.label?.toLowerCase().includes("telegram") || link.url?.toLowerCase().includes("t.me")
  );

  if (!telegramLink?.url) return null;

  return (
    <a
      href={telegramLink.url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 group"
      title="Join Telegram Channel"
    >
      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/30 hover:ring-primary/60 hover:scale-110 transition-all duration-300 animate-fade-in">
        <img
          src={telegramLogo}
          alt="Telegram"
          className="w-full h-full object-cover"
        />
      </div>
      <span className="absolute left-16 bottom-1/2 translate-y-1/2 bg-card text-card-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border">
        জয়েন করুন 🚀
      </span>
    </a>
  );
};

export default TelegramFloatingButton;
