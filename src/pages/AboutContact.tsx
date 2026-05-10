import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import DOMPurify from "dompurify";

const AboutContact = () => {
  const settings = useSiteSettingsContext();

  const sanitize = (html: string) => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'strong', 'i', 'em', 'a', 'ul', 'ol', 'li', 'br', 'font', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'size', 'style'],
  });

  return (
    <div className="pt-24 pb-8 container max-w-2xl min-h-screen">
      <h1 className="text-2xl font-bold mb-6">📖 আমাদের সম্পর্কে</h1>
      <div className="glass-card-static p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">{settings.aboutTitle}</h2>
        <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(settings.aboutContent) }} />
      </div>
      <div className="glass-card-static p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">{settings.featuresTitle}</h2>
        <div className="text-sm text-muted-foreground space-y-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(settings.featuresContent) }} />
      </div>
      <div className="glass-card-static p-6">
        <h2 className="text-lg font-semibold mb-3">{settings.contactTitle}</h2>
        <div className="text-sm text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(settings.contactContent) }} />
      </div>
    </div>
  );
};

export default AboutContact;
